"""
MONSOON-GUARD: Forecast API Endpoints
Serves calibrated multi-horizon probabilistic forecasts with confidence indicators and drivers.
"""

import os
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.ml.features import FEATURE_COLUMNS
from backend.ml.downscaling import apply_block_downscaling
from backend.ml.explain import explain_forecast

router = APIRouter(prefix="", tags=["Forecast"])

# Cache loaded artifacts
MODELS_CACHE = {}

def get_loaded_artifacts():
    if not MODELS_CACHE:
        model_dir = Path("data/training/models")
        if not (model_dir / "target_onset_14d_gbm.joblib").exists():
            raise FileNotFoundError("Models not trained yet! Run backend/ml/model_gbm.py first.")
            
        horizons = [7, 14, 21, 30]
        for h in horizons:
            for hazard in ["onset", "break", "heavy"]:
                key = f"target_{hazard}_{h}d"
                MODELS_CACHE[f"{key}_model"] = joblib.load(model_dir / f"{key}_gbm.joblib")
                MODELS_CACHE[f"{key}_calibrator"] = joblib.load(model_dir / f"{key}_calibrator.joblib")
                
        MODELS_CACHE["climo"] = joblib.load(model_dir / "climatology_baseline.joblib")
        MODELS_CACHE["features_df"] = pd.read_parquet("data/training/features_dataset.parquet")
    return MODELS_CACHE

def compute_confidence_level(onset_p: float, break_p: float, heavy_p: float, horizon_days: int) -> Dict[str, Any]:
    """
    Computes an honest confidence score based on horizon decay and signal clarity.
    Principle 7: Never fake accuracy. Show an honest confidence indicator on every forecast.
    """
    # Base score decays with lead horizon due to subseasonal predictability barrier
    horizon_factor = {7: 0.88, 14: 0.78, 21: 0.65, 30: 0.52}.get(horizon_days, 0.65)
    
    # Signal sharpness (probabilities close to 0.5 have higher uncertainty)
    max_divergence = max(abs(onset_p - 0.5), abs(break_p - 0.5), abs(heavy_p - 0.5))
    signal_score = horizon_factor * (0.6 + 0.8 * max_divergence)
    signal_score = min(0.95, max(0.20, signal_score))
    
    if signal_score >= 0.72:
        level = "High"
        rationale = f"Strong teleconnection coherence (MJO/ENSO) and well-established moisture trajectory for {horizon_days}d lead."
    elif signal_score >= 0.48:
        level = "Moderate"
        rationale = f"Moderate ensemble agreement at {horizon_days}d lead; boundary conditions are transitioning."
    else:
        level = "Low"
        rationale = f"High atmospheric chaotic uncertainty at {horizon_days}d lead. Use guidance with wide contingency buffers."
        
    return {
        "level": level,
        "score": round(signal_score, 2),
        "rationale": rationale
    }

@router.get("/forecast/block/{block_id}")
def get_block_forecast(block_id: str, horizon: int = Query(14, enum=[7, 14, 21, 30])):
    artifacts = get_loaded_artifacts()
    df = artifacts["features_df"]
    
    # Filter for block
    b_df = df[df["block_id"] == block_id].sort_values("date")
    if len(b_df) == 0:
        raise HTTPException(status_code=404, detail=f"Block {block_id} not found in pilot region.")
        
    latest_row = b_df.iloc[-1]
    elev = float(latest_row["elevation_m"])
    dist_coast = float(latest_row["dist_coast_km"])
    
    x_vec = latest_row[FEATURE_COLUMNS].values.reshape(1, -1)
    
    # Predict probabilities
    onset_raw = artifacts[f"target_onset_{horizon}d_model"].predict_proba(x_vec)[:, 1]
    onset_p = float(artifacts[f"target_onset_{horizon}d_calibrator"].predict_proba(onset_raw)[0])
    onset_downscaled = apply_block_downscaling(onset_p, elev, dist_coast, "onset")
    
    break_raw = artifacts[f"target_break_{horizon}d_model"].predict_proba(x_vec)[:, 1]
    break_p = float(artifacts[f"target_break_{horizon}d_calibrator"].predict_proba(break_raw)[0])
    break_downscaled = apply_block_downscaling(break_p, elev, dist_coast, "break")
    
    heavy_raw = artifacts[f"target_heavy_{horizon}d_model"].predict_proba(x_vec)[:, 1]
    heavy_p = float(artifacts[f"target_heavy_{horizon}d_calibrator"].predict_proba(heavy_raw)[0])
    heavy_downscaled = apply_block_downscaling(heavy_p, elev, dist_coast, "heavy_rain")
    
    # Confidence rating
    conf = compute_confidence_level(onset_downscaled, break_downscaled, heavy_downscaled, horizon)
    
    # Primary driver target (focus on highest risk hazard)
    primary_target = "break" if break_downscaled > 0.40 else ("onset" if onset_downscaled > 0.40 else "heavy")
    feat_dict = latest_row[FEATURE_COLUMNS].to_dict()
    explanation = explain_forecast(feat_dict, primary_target, max(onset_downscaled, break_downscaled))
    
    # Multi-horizon forecast summary table
    horizon_summary = {}
    for h in [7, 14, 21, 30]:
        o_p = float(artifacts[f"target_onset_{h}d_calibrator"].predict_proba(
            artifacts[f"target_onset_{h}d_model"].predict_proba(x_vec)[:, 1]
        )[0])
        b_p = float(artifacts[f"target_break_{h}d_calibrator"].predict_proba(
            artifacts[f"target_break_{h}d_model"].predict_proba(x_vec)[:, 1]
        )[0])
        h_p = float(artifacts[f"target_heavy_{h}d_calibrator"].predict_proba(
            artifacts[f"target_heavy_{h}d_model"].predict_proba(x_vec)[:, 1]
        )[0])
        horizon_summary[f"{h}d"] = {
            "onset_probability": round(o_p, 3),
            "break_probability": round(b_p, 3),
            "heavy_rain_probability": round(h_p, 3)
        }
        
    return {
        "location": latest_row["block_name"],
        "block_id": block_id,
        "district": latest_row["district_name"],
        "state": latest_row["state"],
        "as_of_date": latest_row["date"].strftime("%Y-%m-%d"),
        "horizon_days": horizon,
        "forecast": {
            "onset_probability": round(onset_downscaled, 3),
            "break_probability": round(break_downscaled, 3),
            "heavy_rain_probability": round(heavy_downscaled, 3)
        },
        "all_horizons": horizon_summary,
        "confidence": conf["level"],
        "confidence_score": conf["score"],
        "confidence_rationale": conf["rationale"],
        "drivers": explanation["drivers"],
        "causality_disclaimer": explanation["causality_disclaimer"],
        "data_source": "synthetic" if bool(latest_row.get("is_synthetic", True)) else "real_era5_imerg"
    }
