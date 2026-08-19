import json
from agent3_dispatcher import evaluate_civic_dispatch

test_cases = [
    ("Phoenix, AZ", 106.0),
    ("Houston, TX", 94.0),
    ("Miami, FL", 89.0),
    ("Denver, CO", 84.0),
]

for city, temp_f in test_cases:
    print("=" * 60)
    print(f"Testing Agent 3 Civic Dispatcher: {city} @ {temp_f}°F")
    print("=" * 60)
    report = evaluate_civic_dispatch(city, temp_f)
    print(f"  Ambient Temp:            {report.ambient_temp_f}°F")
    print(f"  Relative Humidity:       {report.relative_humidity}%")
    print(f"  Calculated WBGT:         {report.wbgt_index}°F")
    print(f"  Compound Hazard Index:   {report.compound_hazard_index} / 100")
    print(f"  Heat Stress Risk:        {report.heat_stress_risk}")
    print(f"  OSHA Work/Rest Ratio:    {report.osha_work_rest_ratio}")
    print(f"  Cooling Shelters Active: {report.cooling_shelters_active} sites")
    print(f"  Alert Dispatched:        {report.civic_alert_dispatched}")
    print(f"  Vulnerability Advisory:  {report.vulnerable_demographic_advisory}")
    print(f"  Emergency Protocol:      {report.emergency_protocol[:90]}...\n")
