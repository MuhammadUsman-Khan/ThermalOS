import json
from agent2_controller import process_reading

test_cases = [
    ("Phoenix, AZ", 106.0, "extreme"),
    ("Las Vegas, NV", 102.0, "high"),
    ("Dallas, TX", 95.0, "elevated"),
]

for city, temp_f, risk in test_cases:
    print(f"==================================================")
    print(f"Testing Agent 2 Controller: {city} @ {temp_f}°F ({risk})")
    print(f"==================================================")
    res = process_reading({"location": city, "temperature_f": temp_f, "risk_level": risk})
    rep = res["report"]
    print(f"  Load Shift Active:     {rep['grid_load_shift_active']}")
    print(f"  Power Curtailed (kW):  {rep['estimated_power_shift_kw']} kW")
    print(f"  Projected Savings:     ${rep['projected_cost_savings_usd']}")
    print(f"  Pre-Cool Lead Time:    {rep['chiller_pre_cool_duration_hrs']} hrs")
    print(f"  Pre-Cool Setpoint:     {rep['target_precool_temp_f']}°F")
    print(f"  Solar Zenith Window:   {rep['peak_demand_window']}")
    print(f"  Action Plan:           {rep['hvac_action_plan']}")
    print(f"  Dispatch Result:       {res['dispatch']}\n")
