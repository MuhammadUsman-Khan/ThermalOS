"""
ThermalOS Comprehensive Backend Test Suite
Tests FortyGuard client, Agent 1 (RAG), Agent 2 (Pre-Cool), Agent 3 (Civic),
and FastAPI Endpoints.
"""

import unittest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from mock_api import app
from fortyguard_client import fortyguard_client, f_to_c, c_to_f
from agent1_rag import run_compliance_audit
from agent2_controller import process_reading as agent2_process_reading
from agent3_dispatcher import evaluate_civic_dispatch, calculate_wbgt


class TestFortyGuardClient(unittest.TestCase):
    def test_temperature_conversions(self):
        self.assertAlmostEqual(f_to_c(32.0), 0.0, places=2)
        self.assertAlmostEqual(f_to_c(212.0), 100.0, places=2)
        self.assertAlmostEqual(c_to_f(0.0), 32.0, places=2)
        self.assertAlmostEqual(c_to_f(100.0), 212.0, places=2)

    def test_live_telemetry_snapshot(self):
        snapshot = fortyguard_client.get_live_telemetry_snapshot("Phoenix, AZ", 104.0)
        self.assertIn("temperature_f", snapshot)
        self.assertIn("surface_temperature_f", snapshot)
        self.assertIn("relative_humidity", snapshot)
        self.assertIn("solar_irradiance_ghi", snapshot)
        self.assertIn("wet_bulb_f", snapshot)


class TestAgent1Compliance(unittest.TestCase):
    def test_compliance_audit_calculation(self):
        report = run_compliance_audit("Phoenix, AZ", 105)
        self.assertIsNotNone(report)
        self.assertGreater(report.effective_u_factor, 0)
        self.assertGreater(report.r_value_degradation_pct, 0)
        self.assertIn(report.compliance_risk_tier, ["CRITICAL_EXCEEDANCE", "ELEVATED_DRIFT", "NOMINAL_COMPLIANT"])


class TestAgent2PrecoolController(unittest.TestCase):
    def test_precool_high_temp(self):
        result = agent2_process_reading({
            "location": "Phoenix, AZ",
            "temperature_f": 106.0,
            "risk_level": "extreme"
        })
        self.assertIn("report", result)
        report = result["report"]
        self.assertTrue(report["grid_load_shift_active"])
        self.assertGreater(report["estimated_power_shift_kw"], 0)
        self.assertGreater(report["projected_cost_savings_usd"], 0)


class TestAgent3CivicDispatcher(unittest.TestCase):
    def test_wbgt_calculation(self):
        wbgt = calculate_wbgt(temp_f=100.0, relative_humidity=50.0)
        self.assertGreater(wbgt, 70.0)
        self.assertLess(wbgt, 130.0)

    def test_civic_dispatch_extreme(self):
        report = evaluate_civic_dispatch("Phoenix, AZ", 106.0)
        self.assertEqual(report.heat_stress_risk, "EXTREME")
        self.assertTrue(report.civic_alert_dispatched)
        self.assertGreater(report.cooling_shelters_active, 0)


class TestFastAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("fortyguard_api_mode", data)

    def test_telemetry_get_endpoint(self):
        response = self.client.get("/api/telemetry?city=Phoenix%2C%20AZ")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("temperature_f", data)
        self.assertIn("surface_temperature_f", data)

    def test_fortyguard_quota_endpoint(self):
        response = self.client.get("/v1/fortyguard/quota")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("credit_allowance", data)
        self.assertIn("credits_remaining", data)

    def test_agent1_endpoint(self):
        response = self.client.post("/v1/agents/audit", json={
            "location": "Phoenix, AZ",
            "temperature_f": 104.0
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("effective_u_factor", data)

    def test_agent2_endpoint(self):
        response = self.client.post("/v1/agents/infrastructure", json={
            "city": "Phoenix, AZ",
            "temperature_f": 104.0,
            "risk_level": "extreme"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("hvac_action_plan", data)

    def test_agent3_endpoint(self):
        response = self.client.post("/v1/agents/civic", json={
            "city": "Phoenix, AZ",
            "temperature_f": 104.0,
            "risk_level": "extreme"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("wbgt_index", data)


if __name__ == "__main__":
    unittest.main()
