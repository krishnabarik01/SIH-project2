"""
Unit tests for operational ground truth label construction.
Verifies onset criteria, false-onset distinction, break detection, and heavy rain detection.
"""

import unittest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from backend.ml.labels import compute_ground_truth_labels

class TestLabelConstruction(unittest.TestCase):
    def setUp(self):
        # Build 100 days of mock data from May 15 to August 22
        start_date = datetime(2023, 5, 15)
        dates = [start_date + timedelta(days=i) for i in range(100)]
        self.base_df = pd.DataFrame({
            "date": dates,
            "block_id": ["TEST_BLK"] * 100,
            "block_name": ["Test Block"] * 100,
            "district_id": ["TEST_DIST"] * 100,
            "district_name": ["Test District"] * 100,
            "state": ["Chhattisgarh"] * 100,
            "lat": [21.0] * 100,
            "lon": [81.5] * 100,
            "elevation_m": [300] * 100,
            "dist_coast_km": [400] * 100,
            "t2m": [302.0] * 100,
            "d2m": [295.0] * 100,
            "sp": [98000.0] * 100,
            "msl": [100500.0] * 100,
            "u10": [4.0] * 100,
            "v10": [3.0] * 100,
            "sst": [301.0] * 100,
            "tp": [0.0] * 100,
            "enso_oni": [0.5] * 100,
            "iod_dmi": [0.1] * 100,
            "mjo_rmm1": [0.2] * 100,
            "mjo_rmm2": [0.3] * 100,
            "mjo_phase": [4] * 100,
            "mjo_amplitude": [1.2] * 100,
            "is_synthetic": [True] * 100,
        })

    def test_heavy_rain_target(self):
        df = self.base_df.copy()
        # Day index 20 (June 4) has 70mm (heavy rain >= 64.5 mm)
        df.loc[20, "tp"] = 70.0
        labeled = compute_ground_truth_labels(df, horizons=[7, 14])
        # Day 15 (June - 5 days prior) should see heavy rain in 7d and 14d
        self.assertEqual(labeled.loc[15, "target_heavy_7d"], 1)
        self.assertEqual(labeled.loc[15, "target_heavy_14d"], 1)
        # Day 25 (after the heavy rain) should NOT see it forward-looking
        self.assertEqual(labeled.loc[25, "target_heavy_7d"], 0)

    def test_break_spell_target(self):
        df = self.base_df.copy()
        # Active monsoon: July 1 to July 10 (day index 47 to 56) completely dry (tp = 0)
        # Preceding with rain
        df.loc[:46, "tp"] = 15.0
        df.loc[47:53, "tp"] = 0.0  # 7 dry days (break >= 5 days)
        df.loc[54:, "tp"] = 10.0
        labeled = compute_ground_truth_labels(df, horizons=[7, 14])
        # Day 45 looking 7 days ahead should detect break
        self.assertEqual(labeled.loc[45, "target_break_7d"], 1)

    def test_verified_onset_vs_false_onset(self):
        df = self.base_df.copy()
        # June 10 (day index 26, 27, 28): 3-day burst = 30mm (10, 10, 10)
        df.loc[26:28, "tp"] = 10.0
        # Subsequent 10 days (day 29 to 38) are completely dry (10 consecutive dry days >= 7) -> False Onset!
        df.loc[29:38, "tp"] = 0.0
        labeled = compute_ground_truth_labels(df, horizons=[14])
        # Must be flagged as false onset episode
        self.assertEqual(labeled["is_false_onset_episode"].sum(), 1)
        # It must NOT be counted as verified onset
        self.assertEqual(labeled.loc[20, "target_onset_14d"], 0)

if __name__ == "__main__":
    unittest.main()
