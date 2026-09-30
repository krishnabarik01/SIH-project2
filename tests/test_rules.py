"""
Unit tests for agronomic advisory rule engine and decoupled LLM layer.
Asserts deterministic rules and strict number preservation.
"""

import unittest
from backend.agriculture.rules import generate_crop_advisory
from backend.llm.explain import generate_natural_language_explanation

class TestAgronomicRules(unittest.TestCase):
    def test_delay_sowing_when_high_break_prob(self):
        # High break risk (75%), low onset prob (20%), rainfed paddy
        advisory = generate_crop_advisory(
            crop_name="paddy",
            irrigated=False,
            onset_prob=0.20,
            break_prob=0.75,
            heavy_rain_prob=0.10,
            horizon_days=14,
            crop_stage="sowing"
        )
        self.assertEqual(advisory["risk_level"], "VERY_HIGH")
        self.assertIn("Delay sowing", advisory["recommended_action_en"])
        self.assertIn("स्थगित", advisory["recommended_action_hi"])
        
        # Pass to LLM formatting layer
        formatted = generate_natural_language_explanation(advisory)
        # Verify numbers are strictly preserved
        self.assertIn("75%", formatted["english_summary"])
        self.assertIn("20%", formatted["english_summary"])
        self.assertIn("75%", formatted["hindi_summary"])

    def test_favorable_sowing_conditions(self):
        advisory = generate_crop_advisory(
            crop_name="soybean",
            irrigated=True,
            onset_prob=0.85,
            break_prob=0.15,
            heavy_rain_prob=0.10,
            horizon_days=14,
            crop_stage="sowing"
        )
        self.assertEqual(advisory["risk_level"], "LOW")
        self.assertIn("Optimal window", advisory["recommended_action_en"])

    def test_heavy_rain_drainage_trigger(self):
        advisory = generate_crop_advisory(
            crop_name="pigeonpea",
            irrigated=False,
            onset_prob=0.50,
            break_prob=0.20,
            heavy_rain_prob=0.70,
            horizon_days=7,
            crop_stage="seedling"
        )
        self.assertIn(advisory["risk_level"], ["HIGH", "VERY_HIGH"])
        self.assertIn("drainage channels", advisory["recommended_action_en"])

if __name__ == "__main__":
    unittest.main()
