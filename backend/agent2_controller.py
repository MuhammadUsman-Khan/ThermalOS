import os
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()

WINDOW_SIZE = 5
CRITICAL_TEMP_F = 105.0
EXTREME_RISK = "extreme"
ANOMALY_JUMP_THRESHOLD_F = 5.0
COOLDOWN_SECONDS = 60.0
TARGET_PRECOOL_TEMP_F = 68.0

N8N_HVAC_WEBHOOK_URL = os.getenv(
    "N8N_HVAC_WEBHOOK_URL",
    "http://127.0.0.1:5678/webhook/thermalos-hvac-precool",
)


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


class RollingWindowThresholdModel:
    def __init__(self, window_size: int = WINDOW_SIZE):
        self.window_size = window_size
        self._window: deque = deque(maxlen=window_size)

    def ingest(self, reading: TemperatureReading) -> Optional[str]:
        self._window.append(reading)
        return self._should_trigger(reading)

    def _should_trigger(self, reading: TemperatureReading) -> Optional[str]:
        if reading.temperature_f >= CRITICAL_TEMP_F:
            return "critical_temp"
        if reading.risk_level.strip().lower() == EXTREME_RISK:
            return "extreme_risk"

        prior_readings = list(self._window)[:-1]
        if len(prior_readings) >= 3:
            prior_avg = sum(r.temperature_f for r in prior_readings) / len(prior_readings)
            if reading.temperature_f - prior_avg >= ANOMALY_JUMP_THRESHOLD_F:
                return "anomaly_jump"
        return None

    def describe_trigger(self, reason: Optional[str], reading: TemperatureReading) -> Optional[str]:
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
        if reason == "anomaly_jump":
            prior = list(self._window)[:-1]
            prior_avg = sum(r.temperature_f for r in prior) / len(prior)
            jump = reading.temperature_f - prior_avg
            return (
                f"Condition 3: Rolling-window anomaly — +{jump:.1f}°F jump vs "
                f"{len(prior)}-reading avg ({prior_avg:.1f}°F)"
            )
        return None

    def recent_temps(self) -> list:
        return [r.temperature_f for r in self._window]


class N8nHvacDispatcher:
    def __init__(self, webhook_url: str = N8N_HVAC_WEBHOOK_URL, timeout: int = 10):
        self.webhook_url = webhook_url
        self.timeout = timeout
        self._last_dispatch_by_location: dict = {}

    def dispatch(self, payload: dict) -> dict:
        now = time.time()
        location = payload.get("target_zone") or "unknown_zone"

        last_dispatch_at = self._last_dispatch_by_location.get(location)
        if (
            last_dispatch_at is not None
            and now - last_dispatch_at < COOLDOWN_SECONDS
        ):
            return {"dispatched": False, "reason": "cooldown", "status_code": None}

        try:
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            self._last_dispatch_by_location[location] = now
            return {"dispatched": True, "status_code": response.status_code, "reason": "triggered"}
        except requests.RequestException as exc:
            return {"dispatched": False, "status_code": None, "reason": f"webhook_error: {exc}"}


def _parse_payload(payload: dict) -> Optional[TemperatureReading]:
    location = payload.get("location") or payload.get("city")
    temperature_f = payload.get("temperature_f") or payload.get("temperature")
    risk_level = payload.get("risk_level", "nominal")
    if location is None or temperature_f is None:
        return None
    return TemperatureReading(
        location=location,
        temperature_f=float(temperature_f),
        risk_level=risk_level,
        timestamp=float(payload.get("timestamp") or time.time()),
    )


def process_reading(payload: dict) -> dict:
    model = _controller.model
    dispatcher = _controller.dispatcher

    reading = _parse_payload(payload)
    if reading is None:
        return {"error": "invalid payload: location and temperature_f are required"}

    triggered = model.ingest(reading)
    report = InfrastructurePrecoolReport(
        city=reading.location,
        current_temp_f=reading.temperature_f,
        target_precool_temp_f=TARGET_PRECOOL_TEMP_F,
        grid_load_shift_active=bool(triggered),
        trigger_reason=model.describe_trigger(triggered, reading),
        hvac_action_plan=(
            f"Initiate Stage 2 pre-cooling sequence for {reading.location} "
            f"to reach {TARGET_PRECOOL_TEMP_F}°F before peak load window "
            f"({reading.temperature_f}°F observed, risk={reading.risk_level})."
        )
        if triggered
        else "Standby: thermal profile within normal operating envelope.",
    )

    dispatch_result = {"dispatched": False, "reason": "no_trigger"}
    if triggered:
        dispatch_payload = {
            "target_zone": reading.location,
            "current_temp_f": reading.temperature_f,
            "risk_level": reading.risk_level,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(reading.timestamp)),
            "action": "HVAC_PRECOOL",
            "target_precool_temp_f": TARGET_PRECOOL_TEMP_F,
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

    _controller.model = RollingWindowThresholdModel()

    anomaly_samples = [
        {"location": "Phoenix, AZ", "temperature_f": 95, "risk_level": "nominal"},
        {"location": "Phoenix, AZ", "temperature_f": 96, "risk_level": "nominal"},
        {"location": "Phoenix, AZ", "temperature_f": 95, "risk_level": "nominal"},
        {"location": "Phoenix, AZ", "temperature_f": 102, "risk_level": "nominal"},
    ]
    print("== ROLLING-WINDOW ANOMALY DEMO (95-96F baseline, 102F jump) ==")
    for sample in anomaly_samples:
        result = process_reading(sample)
        print(json.dumps(result, indent=2))
        print("-" * 60)

    _controller.model = RollingWindowThresholdModel()
    _controller.dispatcher = N8nHvacDispatcher()

    cooldown_samples = [
        {"location": "Phoenix, AZ", "temperature_f": 106, "risk_level": "extreme"},
        {"location": "Houston, TX", "temperature_f": 105, "risk_level": "extreme"},
        {"location": "Phoenix, AZ", "temperature_f": 107, "risk_level": "extreme"},
    ]
    print("== PER-LOCATION COOLDOWN DEMO (Phoenix + Houston independent) ==")
    for sample in cooldown_samples:
        result = process_reading(sample)
        print(json.dumps(result["dispatch"], indent=2))
        print("-" * 60)
