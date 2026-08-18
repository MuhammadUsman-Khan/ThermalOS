import sys
import os
import time
import random
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

# City temperature configuration: normal active range and rare spike ceiling
CITY_CONFIGS = {
    "Phoenix, AZ": {"min": 91, "max": 104, "spike_chance": 0.04, "spike_val": 108},
    "Las Vegas, NV": {"min": 88, "max": 102, "spike_chance": 0.03, "spike_val": 106},
    "Houston, TX": {"min": 84, "max": 96, "spike_chance": 0.02, "spike_val": 101},
    "Dallas, TX": {"min": 82, "max": 95, "spike_chance": 0.02, "spike_val": 100},
    "San Jose, CA": {"min": 74, "max": 88, "spike_chance": 0.02, "spike_val": 94},
    "New York, NY": {"min": 76, "max": 90, "spike_chance": 0.02, "spike_val": 96},
    "Chicago, IL": {"min": 72, "max": 86, "spike_chance": 0.02, "spike_val": 92},
    "Miami, FL": {"min": 83, "max": 93, "spike_chance": 0.03, "spike_val": 98},
    "Los Angeles, CA": {"min": 78, "max": 95, "spike_chance": 0.03, "spike_val": 101},
    "Atlanta, GA": {"min": 79, "max": 93, "spike_chance": 0.02, "spike_val": 97},
}

# In-memory last temperature tracking per city
LAST_CITY_TEMPS = {
    "Phoenix, AZ": 95,
    "Las Vegas, NV": 92,
    "Houston, TX": 88,
    "Dallas, TX": 86,
    "San Jose, CA": 78,
    "New York, NY": 82,
    "Chicago, IL": 79,
    "Miami, FL": 89,
    "Los Angeles, CA": 86,
    "Atlanta, GA": 84,
}


class HeatIntelligenceRequest(BaseModel):
    location: str


class AuditRequest(BaseModel):
    location: str
    temperature_f: Optional[int] = None


class InfrastructurePrecoolReport(BaseModel):
    city: str
    current_temp_f: float
    target_precool_temp_f: float
    grid_load_shift_active: bool
    trigger_reason: Optional[str] = None
    hvac_action_plan: str
    n8n_dispatch: str


class AgentRequest(BaseModel):
    city: str
    temperature_f: float
    risk_level: Optional[str] = None


@app.get("/health")
async def health():
    """System status, uptime, FortyGuard engine mode, and per-agent readiness."""
    rag_ready = getattr(agent1_rag, "_collection", None) is not None
    return {
        "status": "ok",
        "uptime_seconds": int(time.time() - SERVER_START_TIME),
        "fortyguard_api_mode": "LIVE" if fortyguard_client.is_live else "CACHED_QUICKSTART",
        "agents": {
            "agent1_compliance": "ready" if rag_ready else "initializing",
            "agent2_infrastructure": "ready",
            "agent3_civic": "ready",
        },
    }


@app.post("/v1/heat-intelligence")
async def get_heat_intelligence(request: HeatIntelligenceRequest):
    """
    Real-time continuous telemetry stream powered by FortyGuard Microclimate Engine.
    Fuses ground-truth ambient air, surface temperature, wet-bulb, solar GHI, and air quality.
    """
    try:
        city = request.location
        cfg = CITY_CONFIGS.get(
            city,
            {"min": 85, "max": 100, "spike_chance": 0.03, "spike_val": 105},
        )
        last_temp = LAST_CITY_TEMPS.get(city, 95)

        if random.random() < cfg["spike_chance"]:
            spike_low = min(cfg["max"] + 1, cfg["spike_val"])
            new_temp = random.randint(spike_low, cfg["spike_val"])
        else:
            step = random.choice([-3, -2, -1, 1, 2, 3])
            new_temp = last_temp + step

            if new_temp < cfg["min"]:
                new_temp = cfg["min"] + random.randint(0, 2)
            elif new_temp > cfg["max"]:
                new_temp = cfg["max"] - random.randint(0, 2)

        LAST_CITY_TEMPS[city] = new_temp

        # Ingest FortyGuard real-time microclimate packet
        snapshot = fortyguard_client.get_live_telemetry_snapshot(city=city, temp_f=float(new_temp))

        snapshot["server_uptime_seconds"] = int(time.time() - SERVER_START_TIME)
        return snapshot
    except Exception as e:
        logger.exception("FortyGuard heat-intelligence generation failed")
        raise HTTPException(status_code=500, detail=f"Telemetry generation failed: {e}")


@app.post("/v1/agents/audit", response_model=ComplianceReport)
def audit_endpoint(request: AuditRequest):
    """Agent 1: ASHRAE 55 & IECC RAG Compliance Audit powered by FortyGuard."""
    if request.temperature_f is not None:
        temp_f = request.temperature_f
    else:
        temp_f = LAST_CITY_TEMPS.get(request.location, 95)

    try:
        return run_compliance_audit(city=request.location, temp_f=temp_f)
    except Exception as e:
        logger.exception("Agent 1 compliance audit failed")
        raise HTTPException(status_code=502, detail=f"Compliance audit failed: {e}")


@app.post("/v1/agents/infrastructure", response_model=InfrastructurePrecoolReport)
def infrastructure_precool_endpoint(request: AgentRequest):
    """Agent 2: Infrastructure Pre-Cool Controller powered by FortyGuard Solar & Thermal Lag."""
    time.sleep(1.0)
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


@app.get("/v1/fortyguard/heatmap")
def heatmap_endpoint(city: str = "Phoenix, AZ", analytic_type: str = "tcm"):
    """Fetch FortyGuard spatial thermal tile mesh."""
    try:
        return fortyguard_client.get_heatmap_analytics(city=city, analytic_type=analytic_type)
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_api:app", host="0.0.0.0", port=8000, reload=True)
