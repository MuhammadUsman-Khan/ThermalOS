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
import agent1_rag
from agent1_rag import run_compliance_audit, ComplianceReport
from agent2_controller import process_reading as agent2_process_reading
from agent3_dispatcher import evaluate_civic_dispatch, CivicDispatchReport

logger = logging.getLogger("thermalos.api")

app = FastAPI(title="FortyGuard Mock Temperature API & ThermalOS Agents")

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
    "Phoenix, AZ": {"min": 91, "max": 103, "spike_chance": 0.04, "spike_val": 106},
    "Houston, TX": {"min": 84, "max": 96, "spike_chance": 0.02, "spike_val": 101},
    "Las Vegas, NV": {"min": 88, "max": 101, "spike_chance": 0.03, "spike_val": 105},
    "Dallas, TX": {"min": 82, "max": 94, "spike_chance": 0.02, "spike_val": 100},
}

# In-memory last temperature tracking per city
LAST_CITY_TEMPS = {
    "Phoenix, AZ": 95,
    "Houston, TX": 88,
    "Las Vegas, NV": 92,
    "Dallas, TX": 86,
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
    """System status, uptime and per-agent readiness."""
    rag_ready = getattr(agent1_rag, "_collection", None) is not None
    return {
        "status": "ok",
        "uptime_seconds": int(time.time() - SERVER_START_TIME),
        "agents": {
            "agent1_compliance": "ready" if rag_ready else "initializing",
            "agent2_infrastructure": "ready",
            "agent3_civic": "ready",
        },
    }


@app.post("/v1/heat-intelligence")
async def get_heat_intelligence(request: HeatIntelligenceRequest):
    try:
        city = request.location
        cfg = CITY_CONFIGS.get(
            city,
            {"min": 85, "max": 100, "spike_chance": 0.03, "spike_val": 105},
        )
        last_temp = LAST_CITY_TEMPS.get(city, 95)

        # 3-4% chance of an occasional transient heat spike. The spike sits just
        # above the city's normal max, capped at its configured ceiling. Guard the
        # lower bound: cities whose ceiling is < 105°F (Houston, Dallas) would
        # otherwise hit random.randint(low > high) and raise ValueError -> 500.
        if random.random() < cfg["spike_chance"]:
            spike_low = min(cfg["max"] + 1, cfg["spike_val"])
            new_temp = random.randint(spike_low, cfg["spike_val"])
        else:
            # Visible fluctuation of +/- 1 to 3 degrees each second
            step = random.choice([-3, -2, -1, 1, 2, 3])
            new_temp = last_temp + step

            # Keep bounded in normal active range
            if new_temp < cfg["min"]:
                new_temp = cfg["min"] + random.randint(0, 2)
            elif new_temp > cfg["max"]:
                new_temp = cfg["max"] - random.randint(0, 2)

        LAST_CITY_TEMPS[city] = new_temp

        # Dynamic risk categories calibrated to urban thermal thresholds
        if new_temp >= 105:
            risk_level = "extreme"
        elif new_temp >= 103:
            risk_level = "high"
        elif new_temp >= 98:
            risk_level = "elevated"
        else:
            risk_level = "nominal"

        return {
            "location": city,
            "temperature_f": new_temp,
            "risk_level": risk_level,
            "resolution": "10m²",
            "measured_at": "2m above ground",
            "credits_remaining": 999999,
            "server_uptime_seconds": int(time.time() - SERVER_START_TIME),
        }
    except Exception as e:
        logger.exception("heat-intelligence generation failed")
        raise HTTPException(status_code=500, detail=f"Telemetry generation failed: {e}")


@app.post("/v1/agents/audit", response_model=ComplianceReport)
def audit_endpoint(request: AuditRequest):
    # Sync `def` (not async): run_compliance_audit does blocking work (Gemini
    # inference + ChromaDB query). FastAPI runs sync handlers in a threadpool, so
    # this never stalls the event loop / the 1s telemetry poll.
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
    # Sync `def`: Agent 2 fires a blocking requests.post to the n8n webhook.
    # Threadpool execution keeps the telemetry loop responsive.
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
    # Sync `def`: Agent 3 makes a blocking Open-Meteo GET (up to 3s) plus an n8n
    # POST. Running in the threadpool prevents a slow upstream from freezing the
    # event loop and every concurrent telemetry request.
    try:
        return evaluate_civic_dispatch(city=request.city, temp_f=request.temperature_f)
    except Exception as e:
        logger.exception("Agent 3 civic dispatcher failed")
        raise HTTPException(status_code=502, detail=f"Civic dispatcher failed: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_api:app", host="0.0.0.0", port=8000, reload=True)

