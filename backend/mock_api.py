import time
import random
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent1_rag import run_compliance_audit, ComplianceReport

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

# Realistic physical micro-climate baseline temperatures and bounds per city
CITY_THERMODYNAMICS = {
    "Phoenix, AZ": {"base": 96.5, "min": 91.0, "max": 104.0},
    "Houston, TX": {"base": 88.2, "min": 82.0, "max": 95.0},
    "Las Vegas, NV": {"base": 93.0, "min": 87.0, "max": 101.0},
    "Dallas, TX": {"base": 86.8, "min": 81.0, "max": 93.0},
}

# Continuous floating-point state simulating real thermal inertia
CURRENT_FLOAT_TEMPS = {
    "Phoenix, AZ": 96.4,
    "Houston, TX": 88.2,
    "Las Vegas, NV": 93.0,
    "Dallas, TX": 86.8,
}


class HeatIntelligenceRequest(BaseModel):
    location: str


class AuditRequest(BaseModel):
    location: str
    temperature_f: Optional[int] = None


@app.post("/v1/heat-intelligence")
async def get_heat_intelligence(request: HeatIntelligenceRequest):
    city = request.location
    config = CITY_THERMODYNAMICS.get(city, {"base": 90.0, "min": 80.0, "max": 102.0})
    current = CURRENT_FLOAT_TEMPS.get(city, config["base"])

    # Realistic micro-climate thermal physics:
    # Ambient temperature drifts gently by fractions of a degree (+/- 0.08°F)
    micro_drift = random.uniform(-0.08, 0.08)
    # Slow mean-reversion toward city thermal baseline
    reversion = (config["base"] - current) * 0.03

    new_float = current + micro_drift + reversion
    # Clamp within realistic operating bounds
    new_float = max(config["min"], min(config["max"], new_float))
    CURRENT_FLOAT_TEMPS[city] = new_float

    # Physical sensors report rounded integer readings (holds steady and shifts naturally)
    temp_int = int(round(new_float))

    if temp_int >= 105:
        risk_level = "extreme"
    elif temp_int >= 100:
        risk_level = "high"
    elif temp_int >= 92:
        risk_level = "elevated"
    else:
        risk_level = "nominal"

    return {
        "location": city,
        "temperature_f": temp_int,
        "risk_level": risk_level,
        "resolution": "10m²",
        "measured_at": "2m above ground",
        "credits_remaining": 999999,
        "server_uptime_seconds": int(time.time() - SERVER_START_TIME),
    }


@app.post("/v1/agents/audit", response_model=ComplianceReport)
async def audit_endpoint(request: AuditRequest):
    if request.temperature_f is not None:
        temp_f = request.temperature_f
    else:
        current = CURRENT_FLOAT_TEMPS.get(request.location, 96.0)
        temp_f = int(round(current))

    report = run_compliance_audit(
        city=request.location,
        temp_f=temp_f,
    )
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_api:app", host="0.0.0.0", port=8000, reload=True)
