"""
MONSOON-GUARD: API Contract & Integration Tests
Validates all endpoints specified in the MoES / NCMRWF requirements.
"""

import unittest
from fastapi.testclient import TestClient
from backend.api.main import app

class TestMonsoonGuardAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_root_and_health(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["system"], "MONSOON-GUARD")
        
        health = self.client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "healthy")

    def test_forecast_endpoint(self):
        res = self.client.get("/forecast/block/CG_RAI_01?horizon=14")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["block_id"], "CG_RAI_01")
        self.assertIn("forecast", data)
        self.assertIn("onset_probability", data["forecast"])
        self.assertIn("break_probability", data["forecast"])
        self.assertIn("heavy_rain_probability", data["forecast"])
        self.assertIn("confidence", data)
        self.assertIn("drivers", data)
        self.assertIn("causality_disclaimer", data)

    def test_risk_map_endpoint(self):
        res = self.client.get("/risk-map?district=Raipur&horizon=14&hazard=break")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertGreater(len(data["features"]), 0)
        first_feat = data["features"][0]
        self.assertIn("risk_tier", first_feat)
        self.assertIn("calibrated_probability", first_feat)
        # Non-negotiable: Pair color with probability and horizon
        self.assertIn("display_label", first_feat)

    def test_climate_state_endpoint(self):
        res = self.client.get("/climate-state")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("teleconnections", data)
        self.assertIn("enso", data["teleconnections"])
        self.assertIn("mjo", data["teleconnections"])

    def test_crop_advisory_endpoint(self):
        res = self.client.get("/crop-advisory?block_id=CG_RAI_01&crop=paddy&irrigated=false&horizon=14")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("structured_advisory", data)
        self.assertIn("natural_language_guidance", data)
        self.assertIn("hindi_summary", data["natural_language_guidance"])
        self.assertIn("english_summary", data["natural_language_guidance"])

    def test_hindcast_false_onset_case(self):
        res = self.client.get("/hindcast/chhattisgarh_2023_false_onset")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["is_false_onset_risk"])
        self.assertIn("CRITICAL FALSE ONSET RISK DETECTED", data["false_onset_alert"])
        self.assertIn("model_forecast", data)
        self.assertIn("climatology_baseline", data)
        self.assertIn("actual_ground_truth", data)
        self.assertIn("timeline", data)

    def test_model_info_registry(self):
        res = self.client.get("/model/info")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("model_metadata", data)
        self.assertIn("metrics_by_target", data)

    def test_farmer_registration_and_whatsapp_webhook(self):
        reg = self.client.post("/farmer/profile", json={
            "name": "Ramesh Patel",
            "phone": "+919876543210",
            "block_id": "CG_RAI_01",
            "district_id": "CG_RAIPUR",
            "crop": "paddy",
            "is_irrigated": False,
            "preferred_language": "hi"
        })
        self.assertEqual(reg.status_code, 200)
        
        wa = self.client.post("/whatsapp/webhook", json={
            "from_number": "+919876543210",
            "body": "नमस्ते, धान की बुवाई की सलाह चाहिए",
            "block_id": "CG_RAI_01",
            "crop": "paddy"
        })
        self.assertEqual(wa.status_code, 200)
        wa_data = wa.json()
        self.assertEqual(wa_data["status"], "delivered")
        self.assertIn("response_message", wa_data)
        self.assertIn("मौसम-रक्षक", wa_data["response_message"])

if __name__ == "__main__":
    unittest.main()
