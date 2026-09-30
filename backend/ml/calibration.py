"""
MONSOON-GUARD: Probabilistic Calibration & Reliability Metrics
Applies Isotonic Regression / Platt scaling fitted strictly on validation split (2019-2021).
Calculates Brier Score, Brier Skill Score (BSS), and reliability diagrams.
"""

import numpy as np
from typing import Dict, Any, Tuple
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss, roc_auc_score, average_precision_score

class ProbabilityCalibrator:
    def __init__(self, method: str = "isotonic"):
        self.method = method
        if method == "isotonic":
            self.calibrator = IsotonicRegression(out_of_bounds="clip", y_min=0.001, y_max=0.999)
        else:
            self.calibrator = LogisticRegression(C=1.0, solver="lbfgs")

    def fit(self, raw_probs: np.ndarray, y_val: np.ndarray):
        raw_probs = np.clip(raw_probs, 1e-5, 1 - 1e-5)
        if self.method == "isotonic":
            self.calibrator.fit(raw_probs, y_val)
        else:
            self.calibrator.fit(raw_probs.reshape(-1, 1), y_val)

    def predict_proba(self, raw_probs: np.ndarray) -> np.ndarray:
        raw_probs = np.clip(raw_probs, 1e-5, 1 - 1e-5)
        if self.method == "isotonic":
            cal_probs = self.calibrator.predict(raw_probs)
        else:
            cal_probs = self.calibrator.predict_proba(raw_probs.reshape(-1, 1))[:, 1]
        return np.clip(cal_probs, 0.001, 0.999)

def compute_probabilistic_metrics(
    y_true: np.ndarray,
    p_model: np.ndarray,
    p_climo: np.ndarray,
    p_persist: np.ndarray,
    n_bins: int = 10
) -> Dict[str, Any]:
    """
    Computes Brier Score, BSS vs Climatology & Persistence, ROC-AUC, PR-AUC, and Reliability Curve.
    """
    bs_model = float(brier_score_loss(y_true, p_model))
    bs_climo = float(brier_score_loss(y_true, p_climo))
    bs_persist = float(brier_score_loss(y_true, p_persist))
    
    # Brier Skill Score: 1 - (BS_model / BS_ref)
    bss_climo = float(1.0 - (bs_model / max(bs_climo, 1e-6)))
    bss_persist = float(1.0 - (bs_model / max(bs_persist, 1e-6)))
    
    # ROC-AUC & PR-AUC
    try:
        roc_auc = float(roc_auc_score(y_true, p_model))
    except Exception:
        roc_auc = 0.5
        
    try:
        pr_auc = float(average_precision_score(y_true, p_model))
    except Exception:
        pr_auc = float(np.mean(y_true))
        
    # Reliability curve (Observed frequency vs Mean predicted probability)
    prob_true, prob_pred = calibration_curve(y_true, p_model, n_bins=n_bins, strategy="uniform")
    reliability_points = [
        {"predicted": round(float(p), 3), "observed": round(float(o), 3)}
        for p, o in zip(prob_pred, prob_true)
    ]
    
    return {
        "brier_score_model": round(bs_model, 4),
        "brier_score_climatology": round(bs_climo, 4),
        "brier_score_persistence": round(bs_persist, 4),
        "bss_vs_climatology": round(bss_climo, 4),
        "bss_vs_persistence": round(bss_persist, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "reliability_curve": reliability_points,
        "sample_size": len(y_true),
        "positive_rate": round(float(np.mean(y_true)), 4)
    }
