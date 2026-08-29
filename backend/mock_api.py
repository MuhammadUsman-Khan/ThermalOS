import sys
import os
import time
import logging
from typing import Optional

# Ensure backend directory is in python search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from fortyguard_client import fortyguard_client
import agent1_rag
from agent1_rag import run_compliance_audit, ComplianceReport
from agent2_controller import process_reading as agent2_process_reading
from agent3_dispatcher import evaluate_civic_dispatch, CivicDispatchReport

logger = logging.getLogger("thermalos.api")

app = FastAPI(title="ThermalOS FortyGuard Microclimate API & Autonomous Agents")

SERVER_START_TIME = time.time()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _current_temp_f(city: str) -> float:
    """Resolve the current ambient temperature for a city from real FortyGuard data.

    Sources the value from the heatmap-derived telemetry snapshot (no hardcoded seeds
    or random walks). Falls back to the snapshot's own modeled estimate only when the
    API is unavailable — that estimate is already flagged ``is_modeled`` upstream.
    """
    snap = fortyguard_client.get_live_telemetry_snapshot(city=city)
    return float(snap.get("temperature_f", 95.0))



class HeatIntelligenceRequest(BaseModel):
    location: str


class AuditRequest(BaseModel):
    location: Optional[str] = None
    city: Optional[str] = None
    temperature_f: Optional[float] = None


class InfrastructurePrecoolReport(BaseModel):
    city: str
    current_temp_f: float
    target_precool_temp_f: float
    grid_load_shift_active: bool
    trigger_reason: Optional[str] = None
    hvac_action_plan: str
    n8n_dispatch: str
    peak_demand_window: str = "14:00 – 18:00 Local"
    estimated_power_shift_kw: float = 480.0
    projected_cost_savings_usd: float = 1420.0
    chiller_pre_cool_duration_hrs: float = 2.5
    solar_ghi: float = 550.0


class AgentRequest(BaseModel):
    city: str
    temperature_f: float
    risk_level: Optional[str] = None


@app.get("/")
@app.get("/health")
async def health():
    """System status, uptime, FortyGuard engine mode, and per-agent readiness."""
    rag_ready = getattr(agent1_rag, "_collection", None) is not None
    return {
        "service": "ThermalOS Enterprise Microclimate API",
        "status": "ok",
        "version": "1.0.0",
        "uptime_seconds": int(time.time() - SERVER_START_TIME),
        "fortyguard_api_mode": "LIVE" if fortyguard_client.is_live else "CACHED_QUICKSTART",
        "agents": {
            "agent1_compliance": "ready" if rag_ready else "nominal",
            "agent2_infrastructure": "ready",
            "agent3_civic": "ready",
        },
    }


@app.post("/v1/heat-intelligence")
async def get_heat_intelligence(request: HeatIntelligenceRequest):
    """
    Real-time microclimate telemetry powered by the FortyGuard Microclimate Engine.
    Ambient/surface temperature is derived from the FortyGuard tcm heatmap; wet-bulb,
    heat index, solar GHI, humidity, and air quality come from the env_params endpoint.
    """
    try:
        snapshot = fortyguard_client.get_live_telemetry_snapshot(city=request.location)
        snapshot["server_uptime_seconds"] = int(time.time() - SERVER_START_TIME)
        return snapshot
    except Exception as e:
        logger.exception("FortyGuard heat-intelligence generation failed")
        raise HTTPException(status_code=500, detail=f"Telemetry generation failed: {e}")


@app.get("/api/telemetry")
@app.get("/v1/telemetry")
async def get_city_telemetry(city: str = "Phoenix, AZ"):
    """Returns real FortyGuard-derived telemetry for a given city."""
    try:
        snapshot = fortyguard_client.get_live_telemetry_snapshot(city=city)
        snapshot["server_uptime_seconds"] = int(time.time() - SERVER_START_TIME)
        return snapshot
    except Exception as e:
        logger.exception("Telemetry fetch failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/fortyguard/environment")
def environment_endpoint(city: str = "Phoenix, AZ"):
    """Return the real 24-hour FortyGuard env_params curves for the diurnal timeline.

    Exposes the hourly heat-index, apparent-temperature, wet-bulb, humidity, and solar
    arrays (plus timestamps and provenance) so the frontend can plot genuine data
    instead of a client-side synthetic sine wave.
    """
    try:
        # Anchor the curves to the city's real heatmap-derived baseline temperature.
        baseline_f = _current_temp_f(city)
        env = fortyguard_client.get_environmental_parameters(city=city, temp_f=baseline_f)
        loc = (env.get("locations", [{}]) or [{}])[0] if isinstance(env, dict) else {}
        params = loc.get("parameters", {})
        solar = loc.get("solar_irradiance", {}).get("clear_sky", {})
        return {
            "city": city,
            "baseline_temperature_f": round(baseline_f, 1),
            "timestamps": env.get("metadata", {}).get("timestamps", []),
            "heat_index_celsius": params.get("heat_index_celsius", []),
            "apparent_temperature_celsius": params.get("apparent_temperature_celsius", []),
            "wet_bulb_temperature_celsius": params.get("wet_bulb_temperature_celsius", []),
            "relative_humidity_percent": params.get("relative_humidity_percent", []),
            "air_quality_pm2p5": params.get("air_quality_pm2p5:idx", []),
            "solar_irradiance": solar,
            "data_source": env.get("data_source", "MODELED") if isinstance(env, dict) else "MODELED",
            "is_modeled": (env.get("data_source") == "MODELED") if isinstance(env, dict) else True,
        }
    except Exception as e:
        logger.exception("Environment curve fetch failed")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/v1/agents/audit", response_model=ComplianceReport)
def audit_endpoint(request: AuditRequest):
    """Agent 1: ASHRAE 55 & IECC RAG Compliance Audit powered by FortyGuard."""
    target_city = request.city or request.location or "Phoenix, AZ"
    if request.temperature_f is not None:
        temp_f = int(request.temperature_f)
    else:
        temp_f = int(_current_temp_f(target_city))

    try:
        return run_compliance_audit(city=target_city, temp_f=temp_f)
    except Exception as e:
        logger.exception("Agent 1 compliance audit failed")
        raise HTTPException(status_code=502, detail=f"Compliance audit failed: {e}")


@app.post("/v1/agents/infrastructure", response_model=InfrastructurePrecoolReport)
def infrastructure_precool_endpoint(request: AgentRequest):
    """Agent 2: Infrastructure Pre-Cool Controller powered by FortyGuard Solar & Thermal Lag."""
    try:
        agent2_result = agent2_process_reading(
            {
                "location": request.city,
                "temperature_f": request.temperature_f,
                "risk_level": request.risk_level or ("extreme" if request.temperature_f >= 105 else "nominal"),
            }
        )

        report = agent2_result["report"]
        dispatch = agent2_result["dispatch"]

        return InfrastructurePrecoolReport(
            city=report["city"],
            current_temp_f=report["current_temp_f"],
            target_precool_temp_f=report["target_precool_temp_f"],
            grid_load_shift_active=report["grid_load_shift_active"],
            trigger_reason=report["trigger_reason"],
            hvac_action_plan=report["hvac_action_plan"],
            n8n_dispatch=f"{dispatch['status_code']} {dispatch['reason']}"
            if dispatch.get("status_code")
            else str(dispatch["reason"]),
            peak_demand_window=report.get("peak_demand_window", "14:00 – 18:00 Local"),
            estimated_power_shift_kw=report.get("estimated_power_shift_kw", 480.0),
            projected_cost_savings_usd=report.get("projected_cost_savings_usd", 1420.0),
            chiller_pre_cool_duration_hrs=report.get("chiller_pre_cool_duration_hrs", 2.5),
            solar_ghi=report.get("solar_ghi", 550.0),
        )
    except Exception as e:
        logger.exception("Agent 2 infrastructure controller failed")
        raise HTTPException(status_code=502, detail=f"Infrastructure controller failed: {e}")


@app.post("/v1/agents/civic", response_model=CivicDispatchReport)
def civic_dispatch_endpoint(request: AgentRequest):
    """Agent 3: Civic WBGT Dispatch Engine powered by FortyGuard Environmental Fusion."""
    try:
        return evaluate_civic_dispatch(city=request.city, temp_f=request.temperature_f)
    except Exception as e:
        logger.exception("Agent 3 civic dispatcher failed")
        raise HTTPException(status_code=502, detail=f"Civic dispatcher failed: {e}")


@app.post("/v1/agents/synthesis")
def multi_agent_synthesis_endpoint(request: AgentRequest):
    """Generates a unified Multi-Agent Municipal Executive Synthesis across all 3 agents."""
    try:
        from concurrent.futures import ThreadPoolExecutor

        with ThreadPoolExecutor(max_workers=3) as executor:
            future_audit = executor.submit(run_compliance_audit, city=request.city, temp_f=int(request.temperature_f))
            future_infra = executor.submit(
                agent2_process_reading,
                {
                    "location": request.city,
                    "temperature_f": request.temperature_f,
                    "risk_level": request.risk_level or ("extreme" if request.temperature_f >= 105 else "elevated"),
                }
            )
            future_civic = executor.submit(evaluate_civic_dispatch, city=request.city, temp_f=request.temperature_f)

            audit_rep = future_audit.result()
            infra_res = future_infra.result()
            infra_rep = infra_res["report"]
            civic_rep = future_civic.result()

        # Composite overall risk tier
        if civic_rep.heat_stress_risk == "EXTREME" or request.temperature_f >= 105:
            composite_status = "CRITICAL EMERGENCY"
            status_color = "rose"
        elif civic_rep.heat_stress_risk == "HIGH" or request.temperature_f >= 95:
            composite_status = "ELEVATED INTERVENTION"
            status_color = "orange"
        else:
            composite_status = "NOMINAL OPERATIONAL"
            status_color = "emerald"

        return {
            "city": request.city,
            "temperature_f": request.temperature_f,
            "composite_status": composite_status,
            "status_color": status_color,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "agent1_compliance": {
                "ashrae_status": audit_rep.ashrae_compliance_status,
                "effective_u_factor": audit_rep.effective_u_factor,
                "r_value_degradation_pct": audit_rep.r_value_degradation_pct,
                "envelope_heat_flux_btu": audit_rep.envelope_heat_flux_btu,
                "risk_tier": audit_rep.compliance_risk_tier,
            },
            "agent2_infrastructure": {
                "power_shift_kw": infra_rep.get("estimated_power_shift_kw", 480.0),
                "cost_savings_usd": infra_rep.get("projected_cost_savings_usd", 1420.0),
                "precool_duration_hrs": infra_rep.get("chiller_pre_cool_duration_hrs", 2.5),
                "target_setpoint": infra_rep.get("target_precool_temp_f", 68.0),
                "action_plan": infra_rep.get("hvac_action_plan"),
            },
            "agent3_civic": {
                "wbgt_index": civic_rep.wbgt_index,
                "compound_hazard_index": civic_rep.compound_hazard_index,
                "cooling_shelters_active": civic_rep.cooling_shelters_active,
                "osha_schedule": civic_rep.osha_work_rest_ratio,
                "protocol": civic_rep.emergency_protocol,
            },
            "executive_directives": [
                f"Enforce mandatory ASHRAE 55 thermal comfort mitigation across municipal buildings in {request.city}.",
                f"Activate chiller load curtailment to shave {infra_rep.get('estimated_power_shift_kw', 480.0)} kW during peak solar zenith.",
                f"Maintain {civic_rep.cooling_shelters_active} cooling centers online with strict OSHA {civic_rep.osha_work_rest_ratio} outdoor labor schedules.",
            ]
        }
    except Exception as e:
        logger.exception("Multi-agent synthesis failed")
        raise HTTPException(status_code=500, detail=f"Multi-agent synthesis failed: {e}")


@app.get("/v1/fortyguard/heatmap")
def heatmap_endpoint(
    city: str = "Phoenix, AZ",
    analytic_type: str = "tcm",
    granularity: int = 100,
    force_live: bool = False,
):
    """Fetch FortyGuard spatial thermal tile mesh at 60m, 80m, or 100m resolution."""
    try:
        return fortyguard_client.get_heatmap_analytics(
            city=city,
            analytic_type=analytic_type,
            granularity=granularity,
            force_live=force_live,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/fortyguard/satellite")
def satellite_endpoint(city: str = "Phoenix, AZ"):
    """Fetch FortyGuard satellite land-cover material classification."""
    try:
        return fortyguard_client.get_satellite_segmentation(city=city)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/fortyguard/intelligence")
def intelligence_endpoint(city: str = "Phoenix, AZ", temp_f: Optional[float] = None):
    """Fetch FortyGuard 5-Pillar Heat Intelligence Report metadata."""
    try:
        return fortyguard_client.get_heat_intelligence_report(city=city, temp_f=temp_f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/fortyguard/quota")
def quota_endpoint():
    """Fetch FortyGuard credit balance, daily heatmap quota, and caching metrics."""
    try:
        return fortyguard_client.quota_tracker.get_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/v1/fortyguard/grid")
def national_grid_endpoint():
    """Return real FortyGuard-derived telemetry for every monitored city (cache-only).

    Uses ``allow_live=False`` so rendering the 24-city national grid never fans out
    dozens of async cloud calls or burns the 30/day heatmap quota. Each row is real
    where the cache/quickstart data exists and flagged ``is_modeled`` otherwise.
    """
    from fortyguard_client import CITY_COORDINATES
    rows = []
    for city in CITY_COORDINATES.keys():
        try:
            snap = fortyguard_client.get_live_telemetry_snapshot(city=city, allow_live=False)
            amb = snap.get("temperature_f", 0.0)
            surf = snap.get("surface_temperature_f", amb)
            risk = snap.get("risk_level", "nominal")
            status_map = {
                "extreme": ("Critical Heat Alert", "critical"),
                "high": ("High Heat Risk", "critical"),
                "elevated": ("Elevated Heat", "elevated"),
                "nominal": ("Nominal", "precool"),
            }
            status, status_type = status_map.get(risk, ("Nominal", "precool"))
            # Land-cover building fraction from cached satellite (no live fan-out here).
            try:
                sat = fortyguard_client.get_satellite_segmentation(city=city, allow_live=False)
                building_pct = sat.get("surface_composition", {}).get("impervious_building_pct")
            except Exception:
                building_pct = None
            rows.append({
                "city": city,
                "ambient": round(amb, 1),
                "surface": round(surf, 1),
                "delta": round(surf - amb, 1),
                "ghi": snap.get("solar_irradiance_ghi", 0.0),
                "humidity": snap.get("relative_humidity", 0.0),
                "wetBulb": snap.get("wet_bulb_f", 0.0),
                "wbgt": snap.get("wbgt_f", snap.get("heat_index_f", 0.0)),
                "buildingPct": building_pct,
                "status": status,
                "statusType": status_type,
                "data_source": snap.get("data_source", "MODELED"),
                "is_modeled": snap.get("is_modeled", True),
            })
        except Exception as e:
            logger.warning("Grid row failed for %s: %s", city, e)
    return {"cities": rows, "count": len(rows), "quota": fortyguard_client.quota_tracker.get_summary()}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_api:app", host="0.0.0.0", port=8000, reload=True)
