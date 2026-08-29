# Project Summary — ThermalOS

**Track**: Track 6 — Agentic Track (API + Agentic)  
**Live Application**: [https://thermal-os.vercel.app](https://thermal-os.vercel.app)  
**Live Backend API**: [https://thermal-os-api.vercel.app](https://thermal-os-api.vercel.app)  
**Codebase**: [https://github.com/MuhammadUsman-Khan/ThermalOS](https://github.com/MuhammadUsman-Khan/ThermalOS)  
**API Documentation**: [FORTYGUARD_API_DOCUMENTATION.md](FORTYGUARD_API_DOCUMENTATION.md)  

---

### 1. The Problem
Extreme urban heat is the deadliest and fastest-growing climate risk, causing over 1,300 annual fatalities in the United States alone and pushing regional power grids into catastrophic chiller-driven brownouts. Conventional meteorological weather stations are spaced **10km+ apart**, completely blinding city administrators to hyper-local street canyon heat traps, asphalt radiation reservoirs, and rapid building envelope insulation degradation.

### 2. Who It's For
ThermalOS is engineered for:
* **Municipal Chief Heat Officers & Urban Planners** coordinating public health interventions, cooling shelters, and shade infrastructure.
* **Commercial Facility & Energy Managers** operating high-tonnage chiller plants and building portfolios.
* **Emergency Dispatch Commanders & OSHA Safety Officers** tasked with preventing heatstroke among outdoor municipal workforces.

### 3. FortyGuard Endpoints & Features Used
ThermalOS natively integrates FortyGuard's Enterprise API as its core thermodynamic intelligence engine:
* `POST /v1/heatmap`: Ingests street-level radiometric surface temperatures ($T_s$), ambient air temperatures ($T_a$), global horizontal solar irradiance ($\text{GHI}$), and relative humidity ($\text{RH}$) across $60\text{m}$, $80\text{m}$, and $100\text{m}$ spatial grid resolutions across major U.S. metropolitan areas (Phoenix, Houston, Miami, Las Vegas, San Jose, Denver).
* `POST /v1/system/fetch-api-key-usage` & `GET /v1/quota`: Real-time cloud credit telemetry and quota balance monitoring.
* **Smart Quota Caching**: Implements a persistent 1-hour disk cache (`backend/cache/`, `TTL: 3600s`) in `backend/fortyguard_client.py` adhering to §7.7 best practices.

### 4. The Measured Result & Agentic Execution
ThermalOS wraps FortyGuard endpoints in three specialized autonomous AI agents and an Executive Consensus Synthesis engine that plan, calculate, and execute automated interventions:

1. **Agent 1 (Energy & Compliance Auditor)**: Computes Sol-Air heat flux ($T_{\text{sol-air}} = T_a + \frac{\alpha \cdot \text{GHI}}{h_o} - \frac{\varepsilon \cdot \Delta R}{h_o}$) and executes vector RAG queries against embedded **ASHRAE 55-2023** and **IECC 2024** standards in ChromaDB, detecting building insulation $R$-value derating up to **35%**.
2. **Agent 2 (Infrastructure Pre-Cool Controller)**: Simulates building structural concrete thermal inertia lag ($2.0–3.5\text{ hours}$) and executes Model Predictive Control (MPC) load-shifting on municipal chiller plants during off-peak morning hours ($03:00–07:00$), shaving **$450–780\text{ kW}$ (25–40%)** of peak electric demand.
3. **Agent 3 (Civic & Public Health Dispatcher)**: Evaluates thermodynamic Liljegren Wet-Bulb Globe Temperature (WBGT) and dispatches automated **n8n emergency webhooks** to activate cooling shelters, deploy misting hubs, and enforce **OSHA/ACGIH 15 min/hr** outdoor work/rest rotations when $\text{WBGT} > 85.0^\circ\text{F}$.
4. **Executive Synthesis Directive**: Merges all three agents into a single unified municipal heat mitigation brief for city mayors and emergency commanders.

---

### 5. AI Tool Usage Disclosure
* **Google Antigravity**: Used as an AI pair-programming assistant for architecture design, thermodynamic physics model validation, ChromaDB RAG vector structuring, and frontend component scaffolding.
