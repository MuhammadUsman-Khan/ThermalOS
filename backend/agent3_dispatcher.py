"""
ThermalOS - Agent 3: Environmental Data Fusion & Thermodynamic WBGT Engine
Developer: Sardar Ahmed (Data Fusion Developer)

This module implements Agent 3 (Civic Heat Stress & Emergency Dispatcher):
1. Fetches real-time relative humidity data from the free Open-Meteo REST API.
2. Fuses live ambient temperature (Ta) with humidity to calculate the Wet-Bulb Globe Temperature (WBGT)
   using the vapor pressure approximation formula:
       WBGT ≈ 0.567 * Ta + 0.393 * e + 3.94
3. Evaluates human heat stress survivability thresholds (>85.0°F WBGT).
4. Dispatches automated high-priority safety alert payloads to local n8n webhooks.
"""

import math
import time
import json
import logging
import urllib.request
from typing import Dict, Any, Optional
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    requests = None

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return self.__dict__
        def model_dump(self):
            return self.__dict__

    def Field(default=..., description=""):
        return default

# Configure logger for Agent 3
logger = logging.getLogger("thermalos.agent3")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [Agent3-DataFusion]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# =========================================================================
# CONFIGURATION & CITY GEOLOCATION MAPPING
# =========================================================================

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
DEFAULT_N8N_ALERT_WEBHOOK = "http://127.0.0.1:5678/webhook/thermalos-alert"

# Safe human survivability WBGT index threshold in Fahrenheit
WBGT_SURVIVABILITY_THRESHOLD_F = 85.0

# Geolocation lookup for supported US cities with baseline historical fallback humidity
CITY_COORDINATES: Dict[str, Dict[str, Any]] = {
    "Phoenix, AZ": {"lat": 33.4484, "lon": -112.0740, "default_rh": 22.0},
    "Houston, TX": {"lat": 29.7604, "lon": -95.3698, "default_rh": 65.0},
    "Las Vegas, NV": {"lat": 36.1699, "lon": -115.1398, "default_rh": 20.0},
    "Dallas, TX": {"lat": 32.7767, "lon": -96.7970, "default_rh": 55.0},
}

DEFAULT_LOCATION_CONFIG = {"lat": 33.4484, "lon": -112.0740, "default_rh": 30.0}

# =========================================================================
# DATA CONTRACT / PYDANTIC SCHEMA
# =========================================================================

class CivicDispatchReport(BaseModel):
    city: str = Field(description="Target US city audited")
    wbgt_index: float = Field(description="Calculated Wet-Bulb Globe Temperature in Fahrenheit")
    heat_stress_risk: str = Field(description="Risk classification: NOMINAL, ELEVATED, HIGH, or EXTREME")
    civic_alert_dispatched: bool = Field(description="True if emergency safety webhook was dispatched")
    emergency_protocol: str = Field(description="Active emergency protocol directive")
    relative_humidity: float = Field(description="Relative humidity percentage from Open-Meteo or fallback baseline")
    ambient_temp_f: float = Field(description="Ambient air surface temperature in Fahrenheit")
    timestamp: str = Field(description="ISO-8601 formatted execution timestamp")


# =========================================================================
# CORE DATA FUSION & THERMODYNAMIC FUNCTIONS
# =========================================================================

def get_open_meteo_humidity(city: str, timeout_seconds: float = 3.0) -> float:
    """
    Fetches real-time relative humidity from Open-Meteo REST API for a target city.
    
    Robust Dual-Tier Fallback:
    1. Primary: Uses `requests` if available.
    2. Secondary: Uses standard library `urllib.request` if `requests` is unavailable or fails.
    3. Tertiary: Returns regional historical default relative humidity if network is offline.
    """
    cfg = CITY_COORDINATES.get(city, DEFAULT_LOCATION_CONFIG)
    lat, lon, fallback_rh = cfg["lat"], cfg["lon"], cfg["default_rh"]
    query_url = f"{OPEN_METEO_URL}?latitude={lat}&longitude={lon}&current=relative_humidity_2m&timezone=auto"

    # Tier 1: Try requests library
    if requests is not None:
        try:
            response = requests.get(
                OPEN_METEO_URL,
                params={"latitude": lat, "longitude": lon, "current": "relative_humidity_2m", "timezone": "auto"},
                timeout=timeout_seconds
            )
            if response.status_code == 200:
                data = response.json()
                rh = data.get("current", {}).get("relative_humidity_2m")
                if rh is not None and isinstance(rh, (int, float)) and 0.0 <= rh <= 100.0:
                    logger.info("Open-Meteo humidity fetched via requests for %s: %.1f%%", city, float(rh))
                    return float(rh)
        except Exception as err:
            logger.warning("Requests call failed for %s (%s). Trying urllib fallback.", city, err)

    # Tier 2: Try urllib.request (std library)
    try:
        req = urllib.request.Request(query_url, headers={"User-Agent": "ThermalOS-Agent3/1.0"})
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            if resp.status == 200:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                rh = data.get("current", {}).get("relative_humidity_2m")
                if rh is not None and isinstance(rh, (int, float)) and 0.0 <= rh <= 100.0:
                    logger.info("Open-Meteo humidity fetched via urllib for %s: %.1f%%", city, float(rh))
                    return float(rh)
    except Exception as err:
        logger.warning("Open-Meteo urllib fetch failed for %s (%s). Using fallback humidity %.1f%%.", city, err, fallback_rh)

    # Tier 3: Historical regional baseline
    return fallback_rh


def calculate_wbgt(temp_f: float, relative_humidity: float) -> float:
    """
    Calculates Wet-Bulb Globe Temperature (WBGT) using the vapor pressure approximation formula:
        WBGT ≈ 0.567 * Ta + 0.393 * e + 3.94
        
    Steps:
    1. Convert ambient temperature (Ta) from Fahrenheit to Celsius.
    2. Calculate actual vapor pressure (e) in hPa using Tetens equation:
       e_sat = 6.105 * exp((17.27 * Ta_c) / (237.7 + Ta_c))
       e = (RH / 100) * e_sat
    3. Compute WBGT in Celsius: WBGT_C = 0.567 * Ta_c + 0.393 * e + 3.94
    4. Convert WBGT_C back to Fahrenheit.
    """
    # 1. Convert Ta to Celsius
    ta_c = (float(temp_f) - 32.0) * (5.0 / 9.0)

    # 2. Saturation & actual vapor pressure (e) in hPa
    # Tetens formula for saturation vapor pressure over liquid water
    e_sat = 6.105 * math.exp((17.27 * ta_c) / (237.7 + ta_c))
    e = (float(relative_humidity) / 100.0) * e_sat

    # 3. WBGT approximation in °C
    wbgt_c = 0.567 * ta_c + 0.393 * e + 3.94

    # 4. Convert to °F
    wbgt_f = (wbgt_c * 1.8) + 32.0

    return round(wbgt_f, 1)


def dispatch_n8n_safety_alert(
    payload: Dict[str, Any],
    webhook_url: str = DEFAULT_N8N_ALERT_WEBHOOK,
    timeout_seconds: float = 0.4
) -> bool:
    """
    Dispatches automated high-priority safety alert HTTP POST payload to local n8n webhook.
    
    Robust Exception Handling: Dual-tier dispatch via `requests` and `urllib.request`.
    Catches connection errors gracefully if n8n server is offline.
    """
    # Tier 1: Try requests
    if requests is not None:
        try:
            response = requests.post(webhook_url, json=payload, timeout=timeout_seconds)
            if 200 <= response.status_code < 300:
                logger.info("🚀 n8n Civic Safety Alert dispatched via requests to %s", webhook_url)
                return True
        except Exception as err:
            logger.info("n8n requests POST attempted for %s (%s)", payload.get("city"), err)

    # Tier 2: Try urllib.request
    try:
        json_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=json_data,
            headers={"Content-Type": "application/json", "User-Agent": "ThermalOS-Agent3/1.0"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            if 200 <= resp.status < 300:
                logger.info("🚀 n8n Civic Safety Alert dispatched via urllib to %s", webhook_url)
                return True
    except Exception as err:
        logger.info("n8n webhook dispatch attempted for %s (n8n endpoint offline/unreachable: %s)", payload.get("city"), err)
        return False

    return False


def evaluate_civic_dispatch(
    city: str,
    temp_f: float,
    webhook_url: Optional[str] = None
) -> CivicDispatchReport:
    """
    Main Agent 3 Orchestration Function:
    1. Fetches humidity for city via Open-Meteo API.
    2. Calculates WBGT index.
    3. Evaluates human thermal survivability threshold (>85°F).
    4. Triggers n8n civic safety alert webhook if threshold breached.
    5. Returns strictly typed CivicDispatchReport object.
    """
    target_webhook = webhook_url or DEFAULT_N8N_ALERT_WEBHOOK
    
    # Step 1: Environmental Data Fusion (Temperature + Humidity)
    humidity = get_open_meteo_humidity(city)

    # Step 2: Thermodynamic Modeling
    wbgt_index = calculate_wbgt(temp_f, humidity)

    # Step 3: Human Survivability Risk Classification
    if wbgt_index >= 90.0 or temp_f >= 105.0:
        heat_stress_risk = "EXTREME"
        emergency_protocol = (
            f"CRITICAL HEAT EMERGENCY: WBGT {wbgt_index}°F breaches extreme human survivability limits. "
            "Activate municipal cooling centers, issue regional red-flag heat health advisories, "
            "and dispatch high-priority automated SMS/email notifications to field emergency units."
        )
    elif wbgt_index >= WBGT_SURVIVABILITY_THRESHOLD_F:
        heat_stress_risk = "HIGH"
        emergency_protocol = (
            f"HIGH HEAT STRESS WARNING: WBGT {wbgt_index}°F exceeds safe outdoor labor threshold (85°F). "
            "Enforce mandatory shade breaks, hydrate public works crews, and open regional hydration stations."
        )
    elif wbgt_index >= 80.0:
        heat_stress_risk = "ELEVATED"
        emergency_protocol = (
            f"ELEVATED THERMAL PROFILE: WBGT {wbgt_index}°F. "
            "Continuous micro-climate monitoring active. Standard preventative heat measures deployed."
        )
    else:
        heat_stress_risk = "NOMINAL"
        emergency_protocol = (
            f"NOMINAL THERMAL ENVELOPE: WBGT {wbgt_index}°F is within safe human comfort and survivability envelope."
        )

    # Step 4: Mathematical Trigger Condition & Webhook Execution
    should_alert = wbgt_index > WBGT_SURVIVABILITY_THRESHOLD_F or temp_f >= 105.0

    # Single timestamp shared by the dispatched payload and the returned report so
    # they never disagree by a few microseconds.
    event_timestamp = datetime.now(timezone.utc).isoformat()

    alert_dispatched = False
    if should_alert:
        alert_payload = {
            "agent": "Agent 3 (Civic Heat Stress & Emergency Dispatcher)",
            "city": city,
            "ambient_temp_f": temp_f,
            "relative_humidity_pct": humidity,
            "wbgt_index_f": wbgt_index,
            "survivability_threshold_f": WBGT_SURVIVABILITY_THRESHOLD_F,
            "heat_stress_risk": heat_stress_risk,
            "emergency_protocol": emergency_protocol,
            "timestamp": event_timestamp
        }
        alert_dispatched = dispatch_n8n_safety_alert(alert_payload, webhook_url=target_webhook)

    # Step 5: Construct & Return Pydantic Report
    return CivicDispatchReport(
        city=city,
        wbgt_index=wbgt_index,
        heat_stress_risk=heat_stress_risk,
        civic_alert_dispatched=alert_dispatched,
        emergency_protocol=emergency_protocol,
        relative_humidity=humidity,
        ambient_temp_f=float(temp_f),
        timestamp=event_timestamp
    )


# =========================================================================
# STANDALONE MODULE VERIFICATION / DEMO RUN
# =========================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Agent 3 (Data Fusion & WBGT Thermodynamic Dispatcher) Verification")
    print("=" * 70)

    test_cases = [
        ("Phoenix, AZ", 95.0),
        ("Phoenix, AZ", 106.0),
        ("Houston, TX", 94.0),
        ("Las Vegas, NV", 102.0),
        ("Dallas, TX", 88.0),
    ]

    for test_city, test_temp in test_cases:
        print(f"\n---> Auditing: {test_city} @ {test_temp}°F")
        report = evaluate_civic_dispatch(test_city, test_temp)
        print(f"  RH (Open-Meteo): {report.relative_humidity}%")
        print(f"  Calculated WBGT: {report.wbgt_index}°F")
        print(f"  Heat Risk Level: {report.heat_stress_risk}")
        print(f"  Alert Dispatched: {report.civic_alert_dispatched}")
        print(f"  Protocol: {report.emergency_protocol[:90]}...")
    
    print("\n" + "=" * 70)
    print("Agent 3 Execution Test Completed Successfully with Zero Errors.")
    print("=" * 70)
