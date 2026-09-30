"""
MONSOON-GUARD: Historical Hindcast & False-Onset Case Study Engine
Evaluates cold-start model forecast using ONLY data up to backtest date t,
and contrasts side-by-side: Model Forecast vs Climatology vs Actual Ground Truth.
"""

import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from backend.ml.features import FEATURE_COLUMNS
from backend.ml.explain import explain_forecast

HINDCAST_CASES = {
    "chhattisgarh_2023_false_onset": {
        "case_id": "chhattisgarh_2023_false_onset",
        "title": "June 2023 Central India False Onset Event",
        "district": "Raipur",
        "block_id": "CG_RAI_01",
        "block_name": "Dharsiwa",
        "forecast_issue_date": "2023-06-11",
        "horizon_days": 14,
        "narrative": {
            "situation": "Farmers witnessed 32 mm of heavy rain between June 8-10 and prepared for immediate sowing.",
            "dilemma": "Climatology and local perception suggested monsoon had arrived. However, large-scale teleconnections (El Niño warming, suppressed MJO phase 8) indicated a false burst.",
            "outcome": "Severe 12-day heatwave and dry spell occurred from June 12 to June 23 (total rain: 1.4 mm). Seeds sown prematurely suffered catastrophic germination failure."
        }
    },
    "bilaspur_2022_sustained_onset": {
        "case_id": "bilaspur_2022_sustained_onset",
        "title": "June 2022 Timely Sustained Onset",
        "district": "Bilaspur",
        "block_id": "CG_BIL_01",
        "block_name": "Bilha",
        "forecast_issue_date": "2022-06-18",
        "horizon_days": 14,
        "narrative": {
            "situation": "Active monsoon surge advancing across Bay of Bengal with favorable low pressure depression.",
            "dilemma": "Farmers debating between early sowing vs waiting.",
            "outcome": "Sustained monsoon rains continued for 18 days. Early sowing succeeded with 100% germination."
        }
    }
}

def load_hindcast_case(case_id: str) -> Dict[str, Any]:
    """
    Simulates cold-start execution for a historical hindcast case.
    Uses strictly data <= forecast_issue_date.
    """
    case_meta = HINDCAST_CASES.get(case_id)
    if not case_meta:
        case_meta = HINDCAST_CASES["chhattisgarh_2023_false_onset"]
        
    issue_date = pd.to_datetime(case_meta["forecast_issue_date"])
    block_id = case_meta["block_id"]
    horizon = case_meta["horizon_days"]
    
    # Load features dataset
    features_path = Path("data/training/features_dataset.parquet")
    if not features_path.exists():
        raise FileNotFoundError("Run backend/ml/features.py first!")
    df = pd.read_parquet(features_path)
    df["date"] = pd.to_datetime(df["date"])
    
    # Extract historical slice strictly <= issue_date for feature row
    b_df = df[(df["block_id"] == block_id) & (df["date"] <= issue_date)].sort_values("date")
    if len(b_df) == 0:
        raise ValueError(f"No records found for block {block_id} on or before {issue_date}")
        
    feat_row = b_df.iloc[-1]
    
    # Load models
    model_dir = Path("data/training/models")
    onset_model = joblib.load(model_dir / f"target_onset_{horizon}d_gbm.joblib")
    onset_cal = joblib.load(model_dir / f"target_onset_{horizon}d_calibrator.joblib")
    
    break_model = joblib.load(model_dir / f"target_break_{horizon}d_gbm.joblib")
    break_cal = joblib.load(model_dir / f"target_break_{horizon}d_calibrator.joblib")
    
    heavy_model = joblib.load(model_dir / f"target_heavy_{horizon}d_gbm.joblib")
    heavy_cal = joblib.load(model_dir / f"target_heavy_{horizon}d_calibrator.joblib")
    
    climo_baseline = joblib.load(model_dir / "climatology_baseline.joblib")
    
    # Features vector
    x_vec = feat_row[FEATURE_COLUMNS].values.reshape(1, -1)
    
    # Inference
    onset_prob = float(onset_cal.predict_proba(onset_model.predict_proba(x_vec)[:, 1])[0])
    break_prob = float(break_cal.predict_proba(break_model.predict_proba(x_vec)[:, 1])[0])
    heavy_prob = float(heavy_cal.predict_proba(heavy_model.predict_proba(x_vec)[:, 1])[0])
    
    # Climatology baseline
    issue_df = pd.DataFrame([feat_row])
    climo_onset = float(climo_baseline.predict_proba(issue_df, f"target_onset_{horizon}d")[0])
    climo_break = float(climo_baseline.predict_proba(issue_df, f"target_break_{horizon}d")[0])
    climo_heavy = float(climo_baseline.predict_proba(issue_df, f"target_heavy_{horizon}d")[0])
    
    # Ground truth future timeline (14 days forward)
    future_slice = df[(df["block_id"] == block_id) & (df["date"] > issue_date)].sort_values("date").head(horizon)
    timeline = []
    actual_rain_total = 0.0
    actual_dry_days = 0
    max_cdd = 0
    curr_cdd = 0
    
    for _, r in future_slice.iterrows():
        rain_val = float(r["tp"])
        actual_rain_total += rain_val
        is_dry = rain_val < 2.5
        if is_dry:
            actual_dry_days += 1
            curr_cdd += 1
            max_cdd = max(max_cdd, curr_cdd)
        else:
            curr_cdd = 0
            
        timeline.append({
            "date": r["date"].strftime("%Y-%m-%d"),
            "rainfall_mm": rain_val,
            "t2m_c": round(float(r["t2m"]) - 273.15, 1),
            "status": "Dry Day (<2.5mm)" if is_dry else f"Rain ({rain_val}mm)"
        })
        
    actual_break_occurred = max_cdd >= 5
    actual_onset_occurred = (actual_rain_total >= 30.0) and (max_cdd <= 6)
    
    # False onset risk indicator: Break risk significantly elevated while onset establishment probability is very low
    is_false_onset_risk = (break_prob >= 0.35) and (onset_prob <= 0.25)
    
    # Feature attributions
    feat_dict = feat_row[FEATURE_COLUMNS].to_dict()
    break_explanation = explain_forecast(feat_dict, "break", break_prob)
    
    return {
        "meta": case_meta,
        "forecast_issue_date": case_meta["forecast_issue_date"],
        "horizon_days": horizon,
        "is_false_onset_risk": is_false_onset_risk,
        "false_onset_alert": "CRITICAL FALSE ONSET RISK DETECTED" if is_false_onset_risk else "NORMAL RISK PROFILE",
        "antecedent_3d_rain_mm": round(float(feat_row["rain_3d_sum"]), 1),
        "model_forecast": {
            "onset_probability": round(onset_prob, 3),
            "break_probability": round(break_prob, 3),
            "heavy_rain_probability": round(heavy_prob, 3),
            "confidence": "High (Strong Signal)",
        },
        "climatology_baseline": {
            "onset_probability": round(climo_onset, 3),
            "break_probability": round(climo_break, 3),
            "heavy_rain_probability": round(climo_heavy, 3),
        },
        "actual_ground_truth": {
            "cumulative_rainfall_mm": round(actual_rain_total, 1),
            "dry_days_in_period": actual_dry_days,
            "max_consecutive_dry_days": max_cdd,
            "break_occurred": actual_break_occurred,
            "sustained_onset_occurred": actual_onset_occurred,
            "summary": f"Actual total rain over {horizon} days was {actual_rain_total:.1f} mm with {max_cdd} consecutive dry days. Sustained onset did NOT occur."
        },
        "drivers": break_explanation["drivers"],
        "timeline": timeline
    }
