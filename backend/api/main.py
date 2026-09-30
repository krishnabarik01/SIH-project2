"""
MONSOON-GUARD: Main FastAPI Application
Ministry of Earth Sciences / NCMRWF Hyperlocal Monsoon Prediction Prototype
"""

import os
import joblib
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.api.forecast import router as forecast_router, get_loaded_artifacts
from backend.api.maps import router as maps_router
from backend.api.advisory import router as advisory_router
from backend.api.farmer import router as farmer_router
from backend.api.whatsapp import router as whatsapp_router
from backend.ml.hindcast import load_hindcast_case, HINDCAST_CASES
from backend.database.models import init_db

app = FastAPI(
    title="MONSOON-GUARD API",
    description="Hyperlocal Probabilistic Monsoon Onset & Break Prediction System (MoES / NCMRWF)",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Sub-Routers
app.include_router(forecast_router)
app.include_router(maps_router)
app.include_router(advisory_router)
app.include_router(farmer_router)
app.include_router(whatsapp_router)

@app.on_event("startup")
def startup_event():
    init_db()
    # Pre-warm artifacts cache
    try:
        get_loaded_artifacts()
        print("[API] Models and features dataset loaded successfully into memory.")
    except Exception as e:
        print(f"[API] Notice: Artifacts warm-up deferred: {e}")

@app.get("/")
def root():
    return {
        "system": "MONSOON-GUARD",
        "agency": "Ministry of Earth Sciences / NCMRWF",
        "description": "Hyperlocal Calibrated Probabilistic Monsoon Subseasonal Guidance",
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs",
        "endpoints": [
            "/forecast/block/{id}?horizon=14",
            "/risk-map?district=...&horizon=14&hazard=break",
            "/climate-state",
            "/crop-advisory?block_id=&crop=&irrigated=",
            "/hindcast/{case_id}",
            "/model/info",
            "/farmer/profile",
            "/whatsapp/webhook"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "monsoon-guard-backend"}

@app.get("/climate-state")
def get_climate_state():
    """
    Returns the latest teleconnection indices (ENSO, IOD, MJO) driving the subseasonal dynamics.
    """
    try:
        artifacts = get_loaded_artifacts()
        df = artifacts["features_df"]
        latest = df.iloc[-1]
        
        mjo_phase = int(latest["mjo_phase"])
        phase_descriptions = {
            1: "Western Hemisphere & Africa (Suppressed Indian convection)",
            2: "Indian Ocean (Developing convection)",
            3: "Indian Ocean / Bay of Bengal (Active monsoon burst favorable)",
            4: "Maritime Continent (Strong convective propagation)",
            5: "Maritime Continent / West Pacific (Active tropical convergence)",
            6: "Western Pacific (Weakening Indian monsoon influence)",
            7: "Western Pacific / Central Pacific (Suppressive phase for India)",
            8: "Western Hemisphere (Break monsoon phase favorable)"
        }
        
        enso_val = float(latest["enso_oni"])
        enso_state = "El Niño (Warm Phase)" if enso_val >= 0.5 else ("La Niña (Cool Phase)" if enso_val <= -0.5 else "ENSO-Neutral")
        
        iod_val = float(latest["iod_dmi"])
        iod_state = "Positive IOD (Monsoon Favorable)" if iod_val >= 0.2 else ("Negative IOD (Suppressive)" if iod_val <= -0.2 else "IOD-Neutral")
        
        return {
            "as_of_date": latest["date"].strftime("%Y-%m-%d"),
            "teleconnections": {
                "enso": {
                    "index_name": "Oceanic Niño Index (ONI)",
                    "value": round(enso_val, 2),
                    "state": enso_state,
                    "monsoon_impact": "El Niño increases risk of prolonged dry spells and delayed sustained onset." if enso_val > 0.5 else "Favorable moisture transport across Peninsular India."
                },
                "iod": {
                    "index_name": "Dipole Mode Index (DMI)",
                    "value": round(iod_val, 2),
                    "state": iod_state,
                    "monsoon_impact": "Positive phase enhances Arabian Sea and Bay of Bengal vapor transport."
                },
                "mjo": {
                    "index_name": "Real-time Multivariate MJO (RMM)",
                    "phase": mjo_phase,
                    "amplitude": round(float(latest["mjo_amplitude"]), 2),
                    "rmm1": round(float(latest["mjo_rmm1"]), 2),
                    "rmm2": round(float(latest["mjo_rmm2"]), 2),
                    "phase_summary": phase_descriptions.get(mjo_phase, "Convective active state"),
                    "monsoon_regime": "Active Convection" if mjo_phase in [3, 4, 5] else "Suppressed / Break Favorable"
                }
            },
            "data_source": "synthetic" if bool(latest.get("is_synthetic", True)) else "real"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/hindcast/{case_id}")
def get_hindcast_case(case_id: str):
    try:
        return load_hindcast_case(case_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Case {case_id} evaluation error: {e}")

@app.get("/hindcast-cases")
def list_hindcast_cases():
    return list(HINDCAST_CASES.values())

@app.get("/model/info")
def get_model_info():
    """
    Returns full model registry, calibration info, Brier Skill Scores vs baselines, and reliability diagram coordinates.
    """
    metrics_path = Path("data/training/models/evaluation_metrics.joblib")
    if not metrics_path.exists():
        raise HTTPException(status_code=503, detail="Model evaluation metrics not yet compiled.")
        
    metrics = joblib.load(metrics_path)
    return {
        "model_metadata": {
            "algorithm": "Multi-Horizon HistGradientBoosting + Isotonic Calibration",
            "feature_count": 36,
            "training_split": "2010-01-01 to 2018-12-31",
            "validation_split": "2019-01-01 to 2021-12-31",
            "test_split": "2022-01-01 to 2024-12-31 (Strict Out-of-Time)",
            "calibrator": "Isotonic Regression (Non-parametric)",
            "horizons_supported": [7, 14, 21, 30],
            "targets": ["Onset", "Break", "Heavy Rain"]
        },
        "metrics_by_target": metrics
    }
