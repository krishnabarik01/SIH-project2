"""
MONSOON-GUARD: Multi-Horizon Probabilistic GBM Engine
Trains calibrated gradient-boosted decision trees for onset, break, and heavy rain.
Adheres strictly to temporal train (2010-2018), val (2019-2021), test (2022-2024) splits.
"""

import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from sklearn.ensemble import HistGradientBoostingClassifier
from backend.ml.features import FEATURE_COLUMNS
from backend.ml.baselines import ClimatologyBaseline, PersistenceBaseline
from backend.ml.calibration import ProbabilityCalibrator, compute_probabilistic_metrics

TARGETS = [
    "target_onset_7d", "target_onset_14d", "target_onset_21d", "target_onset_30d",
    "target_break_7d", "target_break_14d", "target_break_21d", "target_break_30d",
    "target_heavy_7d", "target_heavy_14d", "target_heavy_21d", "target_heavy_30d"
]

def train_and_calibrate_models():
    in_path = Path("data/training/features_dataset.parquet")
    if not in_path.exists():
        raise FileNotFoundError("Run backend/ml/features.py first!")
        
    df = pd.read_parquet(in_path)
    df["date"] = pd.to_datetime(df["date"])
    
    # Strict temporal partitions
    train_mask = (df["date"].dt.year >= 2010) & (df["date"].dt.year <= 2018)
    val_mask = (df["date"].dt.year >= 2019) & (df["date"].dt.year <= 2021)
    test_mask = (df["date"].dt.year >= 2022) & (df["date"].dt.year <= 2024)
    
    df_train = df.loc[train_mask].reset_index(drop=True)
    df_val = df.loc[val_mask].reset_index(drop=True)
    df_test = df.loc[test_mask].reset_index(drop=True)
    
    print(f"[MODEL] Dataset partitions: Train={len(df_train)}, Val={len(df_val)}, Test={len(df_test)}")
    
    X_train = df_train[FEATURE_COLUMNS].values
    X_val = df_val[FEATURE_COLUMNS].values
    X_test = df_test[FEATURE_COLUMNS].values
    
    # 1. Fit Climatology baseline on Train
    climo_baseline = ClimatologyBaseline(TARGETS)
    climo_baseline.fit(df_train)
    
    persist_baseline = PersistenceBaseline()
    
    model_dir = Path("data/training/models")
    model_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    for target in TARGETS:
        horizon = int(target.split("_")[-1].replace("d", ""))
        y_train = df_train[target].values
        y_val = df_val[target].values
        y_test = df_test[target].values
        
        print(f"[MODEL] Training classifier for {target}...")
        
        # HistGradientBoostingClassifier: fast, handles non-linearities, natively supports early stopping
        clf = HistGradientBoostingClassifier(
            loss="log_loss",
            max_iter=150,
            learning_rate=0.06,
            max_leaf_nodes=31,
            min_samples_leaf=30,
            random_state=42
        )
        clf.fit(X_train, y_train)
        
        # Uncalibrated validation probabilities
        val_raw_probs = clf.predict_proba(X_val)[:, 1]
        
        # Fit Isotonic Calibrator on validation set
        calibrator = ProbabilityCalibrator(method="isotonic")
        calibrator.fit(val_raw_probs, y_val)
        
        # Evaluate on held-out Test set (2022-2024)
        test_raw_probs = clf.predict_proba(X_test)[:, 1]
        test_cal_probs = calibrator.predict_proba(test_raw_probs)
        
        # Baseline probabilities on Test set
        test_climo_probs = climo_baseline.predict_proba(df_test, target)
        test_persist_probs = persist_baseline.predict_proba(df_test, target, horizon)
        
        # Compute probabilistic verification metrics
        metrics = compute_probabilistic_metrics(
            y_true=y_test,
            p_model=test_cal_probs,
            p_climo=test_climo_probs,
            p_persist=test_persist_probs
        )
        
        results[target] = metrics
        print(f"  --> {target} | Test Brier: {metrics['brier_score_model']} (Climo: {metrics['brier_score_climatology']}) | BSS vs Climo: {metrics['bss_vs_climatology']} | ROC-AUC: {metrics['roc_auc']}")
        
        # Save model and calibrator
        joblib.dump(clf, model_dir / f"{target}_gbm.joblib")
        joblib.dump(calibrator, model_dir / f"{target}_calibrator.joblib")
        
    # Save baseline and metadata
    joblib.dump(climo_baseline, model_dir / "climatology_baseline.joblib")
    joblib.dump(results, model_dir / "evaluation_metrics.joblib")
    print(f"[MODEL] Training and calibration complete. Artifacts saved in {model_dir}")
    return results

if __name__ == "__main__":
    train_and_calibrate_models()
