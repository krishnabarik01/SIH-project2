"""
MONSOON-GUARD: Climatology and Persistence Baselines
Always benchmark model skill against these non-negotiable baselines.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List

class ClimatologyBaseline:
    """
    Computes empirical conditional historical probability per Day-Of-Year (DOY)
    and block using training period data (2010-2018).
    """
    def __init__(self, target_cols: List[str]):
        self.target_cols = target_cols
        self.climo_probs: Dict[str, Dict[int, float]] = {}

    def fit(self, train_df: pd.DataFrame):
        train_df = train_df.copy()
        doy = train_df["date"].dt.dayofyear
        for target in self.target_cols:
            # Empirical probability smoothed across +-3 days window
            rates = train_df.groupby(doy)[target].mean().to_dict()
            overall_mean = float(train_df[target].mean())
            self.climo_probs[target] = {d: rates.get(d, overall_mean) for d in range(1, 367)}

    def predict_proba(self, df: pd.DataFrame, target_col: str) -> np.ndarray:
        doy = df["date"].dt.dayofyear.values
        rates_map = self.climo_probs.get(target_col, {})
        probs = np.array([rates_map.get(d, 0.05) for d in doy])
        return np.clip(probs, 0.001, 0.999)

class PersistenceBaseline:
    """
    Persistence benchmark: predicts probability based on recent antecedent window state.
    """
    def predict_proba(self, df: pd.DataFrame, target_col: str, horizon: int) -> np.ndarray:
        # If break: persistence uses whether last 5 days were dry
        if "break" in target_col:
            is_currently_dry = (df["cdd_antecedent"] >= 5).astype(float).values
            return np.where(is_currently_dry == 1, 0.65, 0.15)
        # If heavy rain: recent 3-day max
        elif "heavy" in target_col:
            has_recent_heavy = (df["rain_3d_sum"] >= 50.0).astype(float).values
            return np.where(has_recent_heavy == 1, 0.40, 0.10)
        # Onset: persistence is low since onset is a one-time seasonal state transition
        elif "onset" in target_col:
            # Baseline proxy: pre-monsoon rain surge in last 7 days
            has_surge = (df["rain_7d_sum"] >= 25.0).astype(float).values
            return np.where(has_surge == 1, 0.30, 0.05)
        return np.full(len(df), 0.10)
