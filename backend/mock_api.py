import random
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent1_rag import run_compliance_audit, ComplianceReport

app = FastAPI(title="FortyGuard Mock Temperature API & ThermalOS Agents")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HeatIntelligenceRequest(BaseModel):
    location: str


class AuditRequest(BaseModel):
    location: str
    temperature_f: Optional[int] = None


@app.post("/v1/heat-intelligence")
async def get_heat_intelligence(request: HeatIntelligenceRequest):
    temperature_f = random.randint(95, 115)

    if temperature_f >= 110:
        risk_level = "extreme"
    elif temperature_f >= 100:
        risk_level = "high"
    else:
        risk_level = "elevated"

    return {
        "location": request.location,
        "temperature_f": temperature_f,
        "risk_level": risk_level,
        "resolution": "10mi²",
        "measured_at": "2m above ground",
        "credits_remaining": 999999,
    }


@app.post("/v1/agents/audit", response_model=ComplianceReport)
async def audit_endpoint(request: AuditRequest):
    # Default temperature to a dynamic realistic reading if not provided
    temp_f = request.temperature_f if request.temperature_f is not None else random.randint(95, 115)
    report = run_compliance_audit(
        city=request.location,
        temp_f=temp_f,
    )
    return report


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mock_api:app", host="0.0.0.0", port=8000, reload=True)
