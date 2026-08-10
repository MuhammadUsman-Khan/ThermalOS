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

# City temperature configuration: normal active range and rare spike ceiling
CITY_CONFIGS = {
    "Phoenix, AZ": {"min": 93, "max": 103, "spike_chance": 0.05, "spike_val": 106},
    "Houston, TX": {"min": 85, "max": 95, "spike_chance": 0.03, "spike_val": 101},
    "Las Vegas, NV": {"min": 90, "max": 101, "spike_chance": 0.04, "spike_val": 105},
    "Dallas, TX": {"min": 84, "max": 94, "spike_chance": 0.03, "spike_val": 100},
}

# In-memory last temperature tracking per city
LAST_CITY_TEMPS = {
    "Phoenix, AZ": 96,
    "Houston, TX": 88,
    "Las Vegas, NV": 93,
    "Dallas, TX": 87,
}


class HeatIntelligenceRequest(BaseModel):
    location: str


class AuditRequest(BaseModel):
    location: str
    temperature_f: Optional[int] = None


@app.post("/v1/heat-intelligence")
async def get_heat_intelligence(request: HeatIntelligenceRequest):
    city = request.location
    cfg = CITY_CONFIGS.get(
        city,
        {"min": 88, "max": 100, "spike_chance": 0.04, "spike_val": 105},
    )
    last_temp = LAST_CITY_TEMPS.get(city, 96)

    # 4-5% chance of an occasional transient heat spike
    if random.random() < cfg["spike_chance"]:
        new_temp = random.randint(105, cfg["spike_val"])
    else:
        # Guarantee a visible change of +/- 1 to 3 degrees each second
        step_options = [-3, -2, -1, 1, 2, 3]
        step = random.choice(step_options)
        new_temp = last_temp + step

        # Keep strictly bounded in normal active range
        if new_temp < cfg["min"]:
            new_temp = cfg["min"] + random.randint(0, 2)
        elif new_temp > cfg["max"]:
            new_temp = cfg["max"] - random.randint(0, 2)

    LAST_CITY_TEMPS[city] = new_temp

    if new_temp >= 105:
        risk_level = "extreme"
    elif new_temp >= 100:
        risk_level = "high"
    elif new_temp >= 92:
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


@app.post("/v1/agents/audit", response_model=ComplianceReport)
async def audit_endpoint(request: AuditRequest):
    if request.temperature_f is not None:
        temp_f = request.temperature_f
    else:
        temp_f = LAST_CITY_TEMPS.get(request.location, 96)

    report = run_compliance_audit(
        city=request.location,
        temp_f=temp_f,
    )
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_api:app", host="0.0.0.0", port=8000, reload=True)
