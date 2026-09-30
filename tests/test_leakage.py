"""
Unit test for temporal data leakage prevention.
Strict Guarantee: Modifying observations at dates > t MUST NOT alter feature values at date t.
"""

import unittest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from backend.ml.features import compute_features, FEATURE_COLUMNS

class TestFeatureLeakage(unittest.TestCase):
    def test_no_future_leakage(self):
        # 1. Create a synthetic baseline time series of 60 days
        start_date = datetime(2022, 6, 1)
        dates = [start_date + timedelta(days=i) for i in range(60)]
        np.random.seed(123)
        
        df_base = pd.DataFrame({
            "date": dates,
            "block_id": ["BLK_LEAK_CHECK"] * 60,
            "block_name": ["Leak Check Block"] * 60,
            "district_id": ["DIST_01"] * 60,
            "district_name": ["Dist"] * 60,
            "state": ["State"] * 60,
            "lat": [21.5] * 60,
            "lon": [81.8] * 60,
            "elevation_m": [300] * 60,
            "dist_coast_km": [400] * 60,
            "t2m": 300.0 + np.random.randn(60),
            "d2m": 294.0 + np.random.randn(60),
            "sp": 98000.0 + np.random.randn(60) * 10,
            "msl": 100500.0 + np.random.randn(60) * 10,
            "u10": 4.0 + np.random.randn(60),
            "v10": 3.0 + np.random.randn(60),
            "sst": 301.0 + np.random.randn(60) * 0.1,
            "tp": np.random.choice([0.0, 5.0, 15.0, 45.0], size=60),
            "enso_oni": [0.6] * 60,
            "iod_dmi": [0.2] * 60,
            "mjo_rmm1": [0.5] * 60,
            "mjo_rmm2": [0.2] * 60,
            "mjo_phase": [4] * 60,
            "mjo_amplitude": [1.4] * 60,
            "is_synthetic": [True] * 60,
        })
        
        # Compute features on original dataset
        feat_base = compute_features(df_base)
        
        # Pick reference date t (e.g. index 30, July 1)
        target_index = 30
        features_at_t_original = feat_base.loc[target_index, FEATURE_COLUMNS].to_dict()
        
        # 2. Perturb future data ONLY (indices 31 to 59: inject massive floods, extreme heat, inverted pressure)
        df_perturbed = df_base.copy()
        df_perturbed.loc[31:, "tp"] = 500.0  # Massive flood in future
        df_perturbed.loc[31:, "t2m"] = 350.0 # Heat anomaly in future
        df_perturbed.loc[31:, "msl"] = 80000.0 # Pressure collapse in future
        df_perturbed.loc[31:, "enso_oni"] = 3.5 # Super El Nino in future
        
        # Compute features on perturbed dataset
        feat_perturbed = compute_features(df_perturbed)
        features_at_t_perturbed = feat_perturbed.loc[target_index, FEATURE_COLUMNS].to_dict()
        
        # 3. Assert exact equality for all features at date t
        for col in FEATURE_COLUMNS:
            val_orig = features_at_t_original[col]
            val_pert = features_at_t_perturbed[col]
            self.assertAlmostEqual(
                val_orig, val_pert, places=5,
                msg=f"Data Leakage detected in feature '{col}'! Value changed at date t when future data was modified."
            )

if __name__ == "__main__":
    unittest.main()
