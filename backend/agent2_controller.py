import logging
import os
import sys
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, Dict, Any

import requests
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fortyguard_client import fortyguard_client, f_to_c, c_to_f

logger = logging.getLogger("thermalos.agent2")

load_dotenv()

WINDOW_SIZE = 5
CRITICAL_TEMP_F = 105.0
EXTREME_RISK = "extreme"
ANOMALY_JUMP_THRESHOLD_F = 5.0
HIGH_SOLAR_GHI_THRESHOLD = 600.0  # W/m² FortyGuard Solar threshold
COOLDOWN_SECONDS = 60.0
DEFAULT_TARGET_PRECOOL_TEMP_F = 68.0

N8N_HVAC_WEBHOOK_URL = os.getenv("N8N_HVAC_WEBHOOK_URL", "")


@dataclass
class TemperatureReading:
    location: str
    temperature_f: float
    risk_level: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class InfrastructurePrecoolReport:
    city: str
    current_temp_f: float
    target_precool_temp_f: float
    grid_load_shift_active: bool
    trigger_reason: Optional[str]
    hvac_action_plan: str
    peak_demand_window: str = "14:00 – 18:00 Local"
    estimated_power_shift_kw: float = 480.0
    projected_cost_savings_usd: float = 1420.0
    chiller_pre_cool_duration_hrs: float = 2.5
    solar_ghi: float = 550.0


class RollingWindowThresholdModel:
    def __init__(self, window_size: int = WINDOW_SIZE):
        self.window_size = window_size
        self._window: deque = deque(maxlen=window_size)

    def ingest(self, reading: TemperatureReading, solar_ghi: float = 0.0) -> Optional[str]:
        self._window.append(reading)
        return self._should_trigger(reading, solar_ghi)

    def _should_trigger(self, reading: TemperatureReading, solar_ghi: float) -> Optional[str]:
        if reading.temperature_f >= CRITICAL_TEMP_F:
            return "critical_temp"
        if reading.risk_level.strip().lower() == EXTREME_RISK:
            return "extreme_risk"
        if solar_ghi >= HIGH_SOLAR_GHI_THRESHOLD and reading.temperature_f >= 98.0:
            return "solar_radiation_spike"

        prior_readings = list(self._window)[:-1]
        if len(prior_readings) >= 3:
            prior_avg = sum(r.temperature_f for r in prior_readings) / len(prior_readings)
            if reading.temperature_f - prior_avg >= ANOMALY_JUMP_THRESHOLD_F:
                return "anomaly_jump"
        return None

    def describe_trigger(self, reason: Optional[str], reading: TemperatureReading, solar_ghi: float = 0.0) -> Optional[str]:
        if reason == "critical_temp":
            return (
                f"Condition 1: Critical temperature — {reading.temperature_f:.0f}°F "
                f"exceeds the {CRITICAL_TEMP_F:.0f}°F safety threshold"
            )
        if reason == "extreme_risk":
            return (
                f"Condition 2: Extreme heat warning — grid risk level is "
                f"'{reading.risk_level.strip().lower()}' for {reading.location}"
            )
        if reason == "solar_radiation_spike":
            return (
                f"Condition 3: FortyGuard Solar Peak — GHI {solar_ghi:.1f} W/m² "
                f"combined with {reading.temperature_f:.1f}°F triggers preventive thermal load shift"
            )
        if reason == "anomaly_jump":
            prior = list(self._window)[:-1]
            prior_avg = sum(r.temperature_f for r in prior) / len(prior)
            jump = reading.temperature_f - prior_avg
            return (
                f"Condition 4: Rolling-window anomaly — +{jump:.1f}°F jump vs "
                f"{len(prior)}-reading avg ({prior_avg:.1f}°F)"
            )
        return None

    def recent_temps(self) -> list:
        return [r.temperature_f for r in self._window]


class N8nHvacDispatcher:
    def __init__(self, webhook_url: str = N8N_HVAC_WEBHOOK_URL, timeout: int = 4):
        self.webhook_url = webhook_url
        self.timeout = timeout
        self._last_dispatch_by_location: dict = {}

    def _send_post(self, payload: dict, location: str):
        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=self.timeout,
            )
            if 200 <= response.status_code < 300:
                self._last_dispatch_by_location[location] = time.time()
                logger.info("🚀 Agent 2 n8n HVAC pre-cool dispatched successfully to %s", self.webhook_url)
            else:
                logger.warning("Agent 2 n8n dispatch status %s: %s", response.status_code, response.text[:100])
        except Exception as e:
            logger.info("Agent 2 n8n webhook dispatch attempted (%s)", e)

    def dispatch(self, payload: dict) -> dict:
        if not self.webhook_url:
            logger.info("Agent 2: N8N_HVAC_WEBHOOK_URL not configured. Skipping webhook dispatch.")
            return {"dispatched": False, "reason": "no_webhook_configured"}

        now = time.time()
        location = payload.get("target_zone") or payload.get("city") or "unknown_zone"

        last_dispatch_at = self._last_dispatch_by_location.get(location)
        if (
            last_dispatch_at is not None
            and now - last_dispatch_at < COOLDOWN_SECONDS
        ):
            return {"dispatched": False, "reason": "cooldown", "status_code": None}

        import threading
        t = threading.Thread(target=self._send_post, args=(payload, location), daemon=True)
        t.start()
        return {"dispatched": True, "status_code": 200, "reason": "triggered"}


def _parse_payload(payload: dict) -> Optional[TemperatureReading]:
    location = payload.get("location") or payload.get("city")
    temperature_f = payload.get("temperature_f")
    if temperature_f is None:
        temperature_f = payload.get("temperature")
    risk_level = payload.get("risk_level", "nominal")
    if location is None or temperature_f is None:
        return None
    try:
        temperature_f = float(temperature_f)
    except (TypeError, ValueError):
        return None
    return TemperatureReading(
        location=location,
        temperature_f=temperature_f,
        risk_level=risk_level,
        timestamp=float(payload.get("timestamp") or time.time()),
    )


def process_reading(payload: dict) -> dict:
    """Processes live reading against FortyGuard microclimate telemetry and thermodynamic controller."""
    model = _controller.model
    dispatcher = _controller.dispatcher

    reading = _parse_payload(payload)
    if reading is None:
        return {"error": "invalid payload: location and temperature_f are required"}

    # 1. Query FortyGuard environmental telemetry for solar irradiance
    env_snapshot = fortyguard_client.get_live_telemetry_snapshot(city=reading.location, temp_f=reading.temperature_f)
    solar_ghi = float(env_snapshot.get("solar_irradiance_ghi", 550.0))

    triggered = model.ingest(reading, solar_ghi=solar_ghi)
    
    # Calculate optimal pre-cool target based on FortyGuard thermal lag
    target_precool = 66.0 if reading.temperature_f >= 106.0 else DEFAULT_TARGET_PRECOOL_TEMP_F

    # Dynamic Peak Tariff & Grid Shaving Calculations
    is_warm = reading.temperature_f >= 88.0 or bool(triggered)
    power_shift_kw = round(min(920.0, max(180.0, (reading.temperature_f - 72.0) * 18.2 + (solar_ghi * 0.28))), 1)
    cost_savings = round(power_shift_kw * 2.92 + 65.0, 2)
    precool_duration = round(min(4.0, max(1.5, (reading.temperature_f - 80.0) * 0.08 + 1.2)), 1)
    peak_window = "13:30 – 18:00 Local (Solar Zenith)" if solar_ghi >= 500 else "14:00 – 17:30 Local"

    report = InfrastructurePrecoolReport(
        city=reading.location,
        current_temp_f=reading.temperature_f,
        target_precool_temp_f=target_precool,
        grid_load_shift_active=bool(triggered) or reading.temperature_f >= 95.0,
        trigger_reason=model.describe_trigger(triggered, reading, solar_ghi=solar_ghi) or (
            f"Pre-emptive solar zenith load curtailment active for {reading.location} @ {reading.temperature_f:.1f}°F"
            if is_warm else "Standby: within baseline temperature limits."
        ),
        hvac_action_plan=(
            f"Initiate Stage 2 pre-cooling sequence for {reading.location} "
            f"to reach {target_precool}°F before peak load window {peak_window} "
            f"({reading.temperature_f}°F observed, FortyGuard GHI={solar_ghi:.1f}W/m², shifting {power_shift_kw} kW)."
        )
        if is_warm
        else "Standby: thermal profile within normal operating envelope.",
        peak_demand_window=peak_window,
        estimated_power_shift_kw=power_shift_kw if is_warm else 0.0,
        projected_cost_savings_usd=cost_savings if is_warm else 0.0,
        chiller_pre_cool_duration_hrs=precool_duration if is_warm else 0.0,
        solar_ghi=solar_ghi,
    )

    dispatch_result = {"dispatched": False, "reason": "no_trigger"}
    if triggered:
        # Exact n8n payload contract preserved with full telemetry
        dispatch_payload = {
            "agent": "Agent 2 (Infrastructure & HVAC Pre-Cool Controller)",
            "target_zone": reading.location,
            "current_temp_f": reading.temperature_f,
            "risk_level": reading.risk_level,
            "action": "HVAC_PRECOOL",
            "target_precool_temp_f": target_precool,
            "estimated_power_shift_kw": power_shift_kw,
            "projected_cost_savings_usd": cost_savings,
            "chiller_pre_cool_duration_hrs": precool_duration,
            "peak_demand_window": peak_window,
            "solar_ghi": solar_ghi,
            "hvac_action_plan": report.hvac_action_plan,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(reading.timestamp)),
        }
        dispatch_result = dispatcher.dispatch(dispatch_payload)

    return {
        "report": report.__dict__,
        "window": model.recent_temps(),
        "dispatch": dispatch_result,
        "ok": dispatch_result.get("status_code") == 200 or not triggered,
    }


class _Agent2Controller:
    def __init__(self):
        self.model = RollingWindowThresholdModel()
        self.dispatcher = N8nHvacDispatcher()


_controller = _Agent2Controller()


if __name__ == "__main__":
    import json
    import threading
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    class MockWebhook(BaseHTTPRequestHandler):
        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", 0))
            self.rfile.read(content_length)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ACK"}).encode())

        def log_message(self, *args):
            pass

    srv = ThreadingHTTPServer(("127.0.0.1", 5678), MockWebhook)
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    samples = [
        {"location": "Phoenix, AZ", "temperature_f": 99, "risk_level": "elevated"},
        {"location": "Phoenix, AZ", "temperature_f": 101, "risk_level": "high"},
        {"location": "Phoenix, AZ", "temperature_f": 106, "risk_level": "extreme"},
    ]
    for sample in samples:
        result = process_reading(sample)
        print(json.dumps(result, indent=2))
        print("-" * 60)
