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

# Realistic micro-climate baseline temperatures and bounds per city
CITY_BASELINES = {
    "Phoenix, AZ": {"base": 96.0, "min": 91.0, "max": 107.0},
    "Houston, TX": {"base": 88.0, "min": 82.0, "max": 96.0},
    "Las Vegas, NV": {"base": 92.0, "min": 86.0, "max": 102.0},
    "Dallas, TX": {"base": 87.0, "min": 81.0, "max": 95.0},
}

# In-memory smooth temperature tracking
CITY_CURRENT_TEMPS = {
    "Phoenix, AZ": 96.0,
    "Houston, TX": 88.0,
    "Las Vegas, NV": 92.0,
    "Dallas, TX": 87.0,
}


class HeatIntelligenceRequest(BaseModel):
    location: str


class AuditRequest(BaseModel):
    location: str
    temperature_f: Optional[int] = None


@app.post("/v1/heat-intelligence")
async def get_heat_intelligence(request: HeatIntelligenceRequest):
    city = request.location
    config = CITY_BASELINES.get(city, {"base": 90.0, "min": 80.0, "max": 105.0})
    current = CITY_CURRENT_TEMPS.get(city, config["base"])

    # Natural smooth drift (-0.8 to +0.8 deg F per sample)
    drift = random.uniform(-0.8, 0.8)
    # Gentle mean-reversion toward base temperature
    drift += (config["base"] - current) * 0.12

    # Rare 5% microclimate transient heat plume
    if random.random() < 0.05:
        drift += random.uniform(1.5, 3.5)

    new_temp = round(max(config["min"], min(config["max"], current + drift)), 1)
    CITY_CURRENT_TEMPS[city] = new_temp
    temp_int = int(round(new_temp))

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
    # Default temperature to current reading or baseline
    if request.temperature_f is not None:
        temp_f = request.temperature_f
    else:
        config = CITY_BASELINES.get(request.location, {"base": 96.0})
        temp_f = int(round(config["base"]))

    report = run_compliance_audit(
        city=request.location,
        temp_f=temp_f,
    )
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_api:app", host="0.0.0.0", port=8000, reload=True)
