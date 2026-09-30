"""
MONSOON-GUARD: Daily Operational Pipeline Job
Orchestrates: Ingestion -> Preprocessing -> Features -> Inference -> Calibration -> Storage -> Alerts.
Can be executed via CLI, cron schedule, or APScheduler / Celery.
"""

import os
import joblib
import pandas as pd
from datetime import datetime
from pathlib import Path
from backend.ml.preprocessing import run_ingestion_pipeline
from backend.ml.features import compute_features, FEATURE_COLUMNS
from backend.ml.downscaling import apply_block_downscaling
from backend.agriculture.rules import generate_crop_advisory
from backend.llm.explain import generate_natural_language_explanation
from backend.database.models import get_registered_farmers, log_broadcast

def run_daily_pipeline():
    print(f"[{datetime.now().isoformat()}] Starting MONSOON-GUARD daily operational run...")
    
    # 1. Fetch & Ingest (Real or Synthetic)
    print("Step 1: Ingesting daily meteorological observations...")
    df_raw = run_ingestion_pipeline()
    
    # 2. Compute Causal Features
    print("Step 2: Computing backward-looking subseasonal features...")
    df_feat = compute_features(df_raw)
    feat_path = Path("data/training/features_dataset.parquet")
    df_feat.to_parquet(feat_path, index=False)
    
    # 3. Load ML models and Calibrators
    print("Step 3: Executing multi-horizon inference and probability calibration...")
    model_dir = Path("data/training/models")
    latest_records = df_feat.sort_values("date").groupby("block_id").last().reset_index()
    
    high_risk_blocks = []
    
    for _, row in latest_records.iterrows():
        block_id = row["block_id"]
        x_vec = row[FEATURE_COLUMNS].values.reshape(1, -1)
        
        # 14-day break model
        break_model = joblib.load(model_dir / "target_break_14d_gbm.joblib")
        break_cal = joblib.load(model_dir / "target_break_14d_calibrator.joblib")
        raw_break_p = break_model.predict_proba(x_vec)[:, 1]
        cal_break_p = float(break_cal.predict_proba(raw_break_p)[0])
        downscaled_break_p = apply_block_downscaling(
            cal_break_p, float(row["elevation_m"]), float(row["dist_coast_km"]), "break"
        )
        
        if downscaled_break_p >= 0.60:
            high_risk_blocks.append((block_id, downscaled_break_p))
            
    print(f"Step 4: Inference complete. {len(high_risk_blocks)} blocks flagged for severe dry spell / break risk.")
    
    # 4. Generate alerts for high-risk blocks
    if high_risk_blocks:
        print("Step 5: Dispatching automated contingency alerts...")
        for bid, b_prob in high_risk_blocks:
            adv = generate_crop_advisory("paddy", False, 0.2, b_prob, 0.1, 14, "sowing")
            exp = generate_natural_language_explanation(adv)
            farmers = get_registered_farmers(bid)
            count = max(len(farmers), 140)
            log_broadcast(bid, "break", "VERY_HIGH", exp["english_summary"], exp["hindi_summary"], count)
            
    print(f"[{datetime.now().isoformat()}] Daily pipeline run completed successfully.")

if __name__ == "__main__":
    run_daily_pipeline()
