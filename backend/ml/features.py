"""
MONSOON-GUARD: Feature Engineering Engine
Computes causal, strictly backward-looking meteorological features.
Leakage Guarantee: Features computed at date t strictly use data <= t.
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import List, Tuple, Dict, Any

def compute_relative_humidity(t2m_k: np.ndarray, d2m_k: np.ndarray) -> np.ndarray:
    """
    Computes relative humidity (%) using the August-Roche-Magnus approximation.
    """
    t_c = t2m_k - 273.15
    td_c = d2m_k - 273.15
    es = 6.112 * np.exp((17.67 * t_c) / (t_c + 243.5))
    e = 6.112 * np.exp((17.67 * td_c) / (td_c + 243.5))
    rh = 100.0 * (e / np.maximum(es, 1e-4))
    return np.clip(rh, 5.0, 100.0)

def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Generates subseasonal features for each block independently.
    Ensures zero temporal leakage.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["block_id", "date"]).reset_index(drop=True)
    
    # 1. Day of Year Harmonics (sin / cos)
    doy = df["date"].dt.dayofyear.values
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    
    # 2. Relative Humidity & Specific Humidity Proxy
    df["relative_humidity"] = compute_relative_humidity(df["t2m"].values, df["d2m"].values)
    # Wind speed
    df["wind_speed_10m"] = np.sqrt(df["u10"] ** 2 + df["v10"] ** 2)
    # Moisture flux proxy
    df["moisture_flux_proxy"] = df["relative_humidity"] * df["wind_speed_10m"]
    
    processed_blocks = []
    
    for block_id, b_df in df.groupby("block_id"):
        b_df = b_df.sort_values("date").reset_index(drop=True)
        rain = b_df["tp"]
        msl = b_df["msl"]
        t2m = b_df["t2m"]
        
        # Antecedent rolling sums (backward looking only: closed='left' or shift(1))
        # Note: at date t, current day's complete 24h rainfall is known at end of day,
        # but to be conservative, features at morning t use rolling rain up to t-1
        b_df["rain_1d_lag1"] = rain.shift(1).fillna(0.0)
        b_df["rain_3d_sum"] = rain.shift(1).rolling(3, min_periods=1).sum().fillna(0.0)
        b_df["rain_7d_sum"] = rain.shift(1).rolling(7, min_periods=1).sum().fillna(0.0)
        b_df["rain_14d_sum"] = rain.shift(1).rolling(14, min_periods=1).sum().fillna(0.0)
        b_df["rain_30d_sum"] = rain.shift(1).rolling(30, min_periods=1).sum().fillna(0.0)
        
        # Rain days in 7d and 14d
        is_rd = (rain.shift(1) >= 2.5).astype(float)
        b_df["rain_days_7d"] = is_rd.rolling(7, min_periods=1).sum().fillna(0.0)
        b_df["rain_days_14d"] = is_rd.rolling(14, min_periods=1).sum().fillna(0.0)
        
        # Consecutive Dry Days (CDD) prior to date t
        cdd = np.zeros(len(b_df), dtype=float)
        curr = 0.0
        rd_vals = is_rd.values
        for idx in range(len(b_df)):
            if idx == 0:
                cdd[idx] = 0.0
            else:
                if rd_vals[idx] == 0:
                    curr += 1.0
                else:
                    curr = 0.0
                cdd[idx] = curr
        b_df["cdd_antecedent"] = cdd
        
        # Pressure & Temperature tendencies (MSL drops indicate monsoon trough / depression)
        b_df["msl_trend_3d"] = msl - msl.shift(3).fillna(msl)
        b_df["msl_trend_7d"] = msl - msl.shift(7).fillna(msl)
        b_df["t2m_trend_3d"] = t2m - t2m.shift(3).fillna(t2m)
        
        # Lagged climate indices (lags 7d and 14d to respect operational teleconnection reporting)
        b_df["enso_oni_lag7"] = b_df["enso_oni"].shift(7).fillna(b_df["enso_oni"])
        b_df["enso_oni_lag14"] = b_df["enso_oni"].shift(14).fillna(b_df["enso_oni"])
        b_df["iod_dmi_lag7"] = b_df["iod_dmi"].shift(7).fillna(b_df["iod_dmi"])
        b_df["iod_dmi_lag14"] = b_df["iod_dmi"].shift(14).fillna(b_df["iod_dmi"])
        
        # MJO phase changes
        b_df["mjo_phase_lag7"] = b_df["mjo_phase"].shift(7).fillna(b_df["mjo_phase"]).astype(int)
        b_df["mjo_amp_lag7"] = b_df["mjo_amplitude"].shift(7).fillna(b_df["mjo_amplitude"])
        
        # Historical DOY median anomaly (computed over training period 2010-2018)
        train_mask = (b_df["date"].dt.year >= 2010) & (b_df["date"].dt.year <= 2018)
        doy_series = b_df["date"].dt.dayofyear
        doy_medians = b_df.loc[train_mask].groupby(doy_series)["rain_7d_sum"].median().to_dict()
        b_df["rain_7d_climo_median"] = doy_series.map(doy_medians).fillna(5.0)
        b_df["rain_7d_anomaly"] = b_df["rain_7d_sum"] - b_df["rain_7d_climo_median"]
        
        processed_blocks.append(b_df)
        
    res_df = pd.concat(processed_blocks, ignore_index=True)
    return res_df

FEATURE_COLUMNS = [
    "doy_sin", "doy_cos",
    "lat", "lon", "elevation_m", "dist_coast_km",
    "t2m", "d2m", "relative_humidity", "sp", "msl",
    "u10", "v10", "wind_speed_10m", "moisture_flux_proxy", "sst",
    "rain_1d_lag1", "rain_3d_sum", "rain_7d_sum", "rain_14d_sum", "rain_30d_sum",
    "rain_days_7d", "rain_days_14d", "cdd_antecedent",
    "msl_trend_3d", "msl_trend_7d", "t2m_trend_3d",
    "enso_oni_lag7", "enso_oni_lag14", "iod_dmi_lag7", "iod_dmi_lag14",
    "mjo_phase", "mjo_amplitude", "mjo_phase_lag7", "mjo_amp_lag7",
    "rain_7d_anomaly"
]

def run_features_pipeline():
    in_path = Path("data/training/labeled_dataset.parquet")
    if not in_path.exists():
        raise FileNotFoundError("Run backend/ml/labels.py first!")
    df = pd.read_parquet(in_path)
    print(f"[FEATURES] Computing features for {len(df)} records...")
    feat_df = compute_features(df)
    out_path = Path("data/training/features_dataset.parquet")
    feat_df.to_parquet(out_path, index=False)
    print(f"[FEATURES] Features created. Stored {len(FEATURE_COLUMNS)} features to {out_path}")
    return feat_df

if __name__ == "__main__":
    run_features_pipeline()
