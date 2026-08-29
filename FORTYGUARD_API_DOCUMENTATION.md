# FortyGuard Enterprise API — Integration & Usage Documentation

**System**: [ThermalOS](https://github.com/MuhammadUsman-Khan/ThermalOS)  
**Live Frontend**: [https://thermal-os-frontend.vercel.app](https://thermal-os-frontend.vercel.app)  
**Live Backend API**: [https://thermal-os-api.vercel.app](https://thermal-os-api.vercel.app)  
**Client Module**: [`backend/fortyguard_client.py`](file:///d:/ThermalOS/backend/fortyguard_client.py)  
**API Documentation Reference**: [FortyGuard Developer Portal](https://api.fortyguard.com)

---

## 1. Overview & Architecture

**ThermalOS** natively integrates FortyGuard's high-resolution microclimate API to transform raw urban radiometry into actionable thermodynamic intelligence. Rather than relying on coarse 10km+ regional weather stations, ThermalOS ingests hyper-local **60m–100m surface temperatures**, **solar irradiance (GHI)**, and **relative humidity** to drive three autonomous AI agents and executive visualization suites.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               FortyGuard Cloud API                                     │
│  - POST https://api.fortyguard.com/v1/heatmap                                          │
│  - GET  https://api.fortyguard.com/v1/quota                                            │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ (x-api-key Authentication)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   ThermalOS FortyGuard Client (1-Hour Cache TTL)                       │
│                        `backend/fortyguard_client.py`                                  │
└───────────────┬───────────────────────────┬────────────────────────────┬───────────────┘
                │                           │                            │
                ▼                           ▼                            ▼
┌───────────────────────────────┐ ┌──────────────────────────┐ ┌─────────────────────────┐
│     Agent 1 (ASHRAE 55)       │ │   Agent 2 (Pre-Cool)     │ │   Agent 3 (WBGT Civic)  │
│ Sol-Air Envelope Heat Flux    │ │ Thermal Inertia Chiller  │ │ Liljegren Public Health │
│ RAG Vector Compliance Core    │ │ Peak Demand Shaving      │ │ n8n Emergency Dispatch  │
└───────────────────────────────┘ └──────────────────────────┘ └─────────────────────────┘
```

---

## 2. Authentication & Credentials

All requests to FortyGuard endpoints are authenticated via HTTP headers:

```http
POST /v1/heatmap HTTP/1.1
Host: api.fortyguard.com
Content-Type: application/json
x-api-key: YOUR_FORTYGUARD_API_KEY
```

Environment variable configuration in `backend/.env`:
```bash
FORTYGUARD_API_KEY=your_fortyguard_api_key_here
```

---

## 3. Endpoints Integrated & Payloads

### A. Street-Level Radiometric Heatmap & Telemetry
* **Endpoint**: `POST https://api.fortyguard.com/v1/heatmap`
* **Purpose**: Fetches street-level surface temperature raster grids, global horizontal irradiance (GHI), ambient air temperatures, and relative humidity.
* **Request Payload**:
```json
{
  "location": "Phoenix, AZ",
  "coordinates": {
    "latitude": 33.4484,
    "longitude": -112.0740
  },
  "resolution_meters": 60,
  "parameters": [
    "surface_temperature",
    "ambient_temperature",
    "solar_ghi",
    "relative_humidity",
    "land_cover_albedo"
  ]
}
```

* **ThermalOS Processing & Response**:
```json
{
  "city": "Phoenix, AZ",
  "temperature_f": 104.2,
  "surface_temp_f": 116.8,
  "ghi_w_m2": 604.5,
  "humidity_pct": 22.9,
  "wbgt_f": 92.4,
  "resolution_meters": 60,
  "albedo": 0.18,
  "served_from": "1H_CACHE"
}
```

---

### B. Enterprise Account Quota & Credits Check
* **Endpoint**: `GET https://api.fortyguard.com/v1/quota`
* **Purpose**: Real-time cloud verification of active API credit consumption, plan status, and daily generation allowances.
* **Response Model**:
```json
{
  "account_id": "acc#XXXXXXXXXX",
  "subscription_id": "sub_XXXXXXXXXX",
  "plan_type": "Hackathon",
  "total_credits_allowance": 2000000,
  "credits_used_today": 21100,
  "heatmaps_generated_today": 5,
  "daily_heatmap_limit": 30
}
```

---

## 4. Downstream AI Agent Data Fusion

### 1. Agent 1 — Energy & Thermal Compliance Auditor ([`agent1_rag_auditor.py`](file:///d:/ThermalOS/backend/agent1_rag_auditor.py))
* **FortyGuard Parameters Used**: Surface Temperature ($T_s$), Ambient Air ($T_a$), Solar GHI ($I_t$).
* **Thermodynamic Formula**:
  $$T_{\text{sol-air}} = T_a + \frac{\alpha \cdot I_t}{h_o} - \frac{\varepsilon \cdot \Delta R}{h_o}$$
  $$q = U_{\text{eff}} \cdot (T_{\text{sol-air}} - T_{\text{indoor}})$$
* Evaluates insulation R-value degradation and executes ChromaDB RAG vector queries against **ASHRAE 55-2023** and **IECC 2024** building energy standards.

---

### 2. Agent 2 — Infrastructure & HVAC Pre-Cool Controller ([`agent2_precool_controller.py`](file:///d:/ThermalOS/backend/agent2_precool_controller.py))
* **FortyGuard Parameters Used**: Solar Zenith Window, Diurnal Surface-Ambient Delta ($\Delta T$).
* **Optimization Model**:
  * Simulates structural concrete and envelope thermal inertia lag ($2.0–3.5\text{ hrs}$).
  * Shifts municipal chiller power consumption to off-peak morning hours ($03:00–07:00$), shaving **$450–780\text{ kW}$** of peak electrical demand and reducing thermal grid failure risk.

---

### 3. Agent 3 — Civic & Public Health Heat Stress Dispatcher ([`agent3_dispatcher.py`](file:///d:/ThermalOS/backend/agent3_dispatcher.py))
* **FortyGuard Parameters Used**: Ambient Air ($T_a$), Relative Humidity ($\text{RH}$), Solar Flux ($S$).
* **Liljegren Wet-Bulb Globe Temperature (WBGT) Calculation**:
  $$\text{Vapor Pressure } (e) = \frac{\text{RH}}{100} \cdot 6.105 \cdot \exp\left(\frac{17.27 \cdot T_a}{237.7 + T_a}\right)$$
  $$\text{WBGT} \approx 0.567 \cdot T_a + 0.393 \cdot e + 3.94 + f(\text{Solar GHI})$$
* **Automated n8n Emergency Dispatch**: If $\text{WBGT} > 85.0^\circ\text{F}$, dispatches high-priority webhooks to activate cooling shelters, misting hubs, and enforce OSHA/ACGIH 15m/hr outdoor labor limits.

---

## 5. Smart Caching & Quota Protection Layer

To ensure continuous, resilient performance during hackathon judging and prevent credit depletion:
* **1-Hour Disk TTL (`max_age_seconds: 3600`)**: Caches all queries for 60 minutes based on city and coordinate hash.
* **Deterministic Fallback**: If network is unreachable or cloud rate limits are encountered, seamlessly falls back to high-fidelity microclimate thermodynamic models with zero user-facing downtime.

---

## 6. Key Code References

| Module | Purpose | Location |
| :--- | :--- | :--- |
| **FortyGuard Client Core** | Full SDK, caching layer, quota monitor | [`backend/fortyguard_client.py`](file:///d:/ThermalOS/backend/fortyguard_client.py) |
| **FastAPI Telemetry Endpoints** | Exposes `/v1/heat-intelligence`, `/api/telemetry` | [`backend/mock_api.py`](file:///d:/ThermalOS/backend/mock_api.py) |
| **Agent 1 Compliance Core** | ASHRAE 55 RAG Sol-Air Energy Auditor | [`backend/agent1_rag_auditor.py`](file:///d:/ThermalOS/backend/agent1_rag_auditor.py) |
| **Agent 2 Infrastructure Core** | Chiller Pre-Cooling MPC Load Shifter | [`backend/agent2_precool_controller.py`](file:///d:/ThermalOS/backend/agent2_precool_controller.py) |
| **Agent 3 Civic Dispatcher** | Liljegren WBGT & n8n Emergency Alert Hub | [`backend/agent3_dispatcher.py`](file:///d:/ThermalOS/backend/agent3_dispatcher.py) |
| **Spatial GIS Heatmap UI** | 60m / 80m / 100m Leaflet Microclimate Layer | [`frontend/src/components/SpatialHeatmapView.jsx`](file:///d:/ThermalOS/frontend/src/components/SpatialHeatmapView.jsx) |
| **24H Diurnal Forecaster UI** | 24-Hour Thermodynamic Lag Timeline | [`frontend/src/components/DiurnalTimelineScrubber.jsx`](file:///d:/ThermalOS/frontend/src/components/DiurnalTimelineScrubber.jsx) |
