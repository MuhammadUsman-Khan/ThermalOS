import json
from agent1_rag import run_compliance_audit
from agent2_controller import process_reading
from agent3_dispatcher import evaluate_civic_dispatch

test_cities = [
    ("Phoenix, AZ", 106.0),
    ("Houston, TX", 94.0),
    ("Denver, CO", 84.0),
]

for city, temp_f in test_cities:
    print("=" * 70)
    print(f"EXECUTIVE MUNICIPAL SYNTHESIS: {city} @ {temp_f}°F")
    print("=" * 70)
    
    # Agent 1
    rep1 = run_compliance_audit(city, int(temp_f))
    # Agent 2
    res2 = process_reading({"location": city, "temperature_f": temp_f, "risk_level": "extreme" if temp_f >= 105 else "elevated"})
    rep2 = res2["report"]
    # Agent 3
    rep3 = evaluate_civic_dispatch(city, temp_f)
    
    if rep3.heat_stress_risk == "EXTREME" or temp_f >= 105:
        composite = "CRITICAL EMERGENCY"
    elif rep3.heat_stress_risk == "HIGH" or temp_f >= 95:
        composite = "ELEVATED INTERVENTION"
    else:
        composite = "NOMINAL OPERATIONAL"
        
    print(f"Composite Risk Tier: {composite}")
    print(f"\n[Agent 1: Building Envelope & ASHRAE 55]")
    print(f"  Effective U-Factor:   {rep1.effective_u_factor} BTU/(hr·ft²·°F) (Base: {rep1.baseline_u_factor})")
    print(f"  R-Value Loss:         +{rep1.r_value_degradation_pct}%")
    print(f"  Sol-Air Temperature:  {rep1.sol_air_temp_f}°F")
    print(f"  Envelope Heat Flux:   {rep1.envelope_heat_flux_btu} BTU/(hr·ft²)")
    print(f"  Risk Classification:  {rep1.compliance_risk_tier}")

    print(f"\n[Agent 2: Infrastructure & Grid Pre-Cool]")
    print(f"  Power Curtailed (kW): {rep2['estimated_power_shift_kw']} kW")
    print(f"  Projected ROI ($):    ${rep2['projected_cost_savings_usd']}")
    print(f"  Pre-Cool Duration:    {rep2['chiller_pre_cool_duration_hrs']} hrs (Setpoint: {rep2['target_precool_temp_f']}°F)")
    print(f"  Solar Zenith Window:  {rep2['peak_demand_window']}")

    print(f"\n[Agent 3: Civic & Public Health]")
    print(f"  Calculated WBGT:      {rep3.wbgt_index}°F")
    print(f"  Compound Threat (CEHI): {rep3.compound_hazard_index} / 100")
    print(f"  OSHA Labor Schedule:  {rep3.osha_work_rest_ratio}")
    print(f"  Active Shelters:      {rep3.cooling_shelters_active} sites")

    print(f"\n[Consensus Executive Directives]")
    directives = [
        f"Enforce mandatory ASHRAE 55 thermal comfort mitigation across municipal buildings in {city}.",
        f"Activate chiller load curtailment to shave {rep2['estimated_power_shift_kw']} kW during peak solar zenith.",
        f"Maintain {rep3.cooling_shelters_active} cooling centers online with strict OSHA {rep3.osha_work_rest_ratio} outdoor labor schedules.",
    ]
    for d in directives:
        print(f"  • {d}")
    print("\n")
