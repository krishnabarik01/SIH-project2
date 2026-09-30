"""
MONSOON-GUARD: Spatial Risk Map Endpoints
Returns geo-referenced risk levels for all blocks in pilot districts.
"""

from fastapi import APIRouter, Query
from typing import Dict, Any, List, Optional
import pandas as pd
from backend.api.forecast import get_loaded_artifacts, apply_block_downscaling
from backend.ml.features import FEATURE_COLUMNS

router = APIRouter(prefix="", tags=["Maps"])

def get_risk_tier(prob: float) -> Dict[str, Any]:
    if prob >= 0.70:
        return {"level": "Very High", "code": "VH", "color": "#ef4444", "severity": 4}
    elif prob >= 0.50:
        return {"level": "High", "code": "H", "color": "#f97316", "severity": 3}
    elif prob >= 0.30:
        return {"level": "Moderate", "code": "M", "color": "#eab308", "severity": 2}
    else:
        return {"level": "Low", "code": "L", "color": "#10b981", "severity": 1}

@router.get("/risk-map")
def get_risk_map(
    district: Optional[str] = None,
    horizon: int = Query(14, enum=[7, 14, 21, 30]),
    hazard: str = Query("break", enum=["break", "onset", "heavy"])
):
    artifacts = get_loaded_artifacts()
    df = artifacts["features_df"]
    
    # Get latest records across all blocks
    latest_records = df.sort_values("date").groupby("block_id").last().reset_index()
    
    if district and district.lower() != "all":
        latest_records = latest_records[
            (latest_records["district_name"].str.lower() == district.lower()) |
            (latest_records["district_id"].str.lower() == district.lower())
        ]
        
    model = artifacts[f"target_{hazard}_{horizon}d_model"]
    calibrator = artifacts[f"target_{hazard}_{horizon}d_calibrator"]
    
    features = []
    for _, row in latest_records.iterrows():
        x_vec = row[FEATURE_COLUMNS].values.reshape(1, -1)
        raw_p = model.predict_proba(x_vec)[:, 1]
        cal_p = float(calibrator.predict_proba(raw_p)[0])
        
        hazard_type_map = {"break": "break", "onset": "onset", "heavy": "heavy_rain"}
        downscaled_p = apply_block_downscaling(
            cal_p, float(row["elevation_m"]), float(row["dist_coast_km"]), hazard_type_map[hazard]
        )
        
        tier = get_risk_tier(downscaled_p)
        
        # Calculate onset and heavy rain also for complete info
        onset_raw = artifacts[f"target_onset_{horizon}d_model"].predict_proba(x_vec)[:, 1]
        onset_p = float(artifacts[f"target_onset_{horizon}d_calibrator"].predict_proba(onset_raw)[0])
        
        features.append({
            "block_id": row["block_id"],
            "block_name": row["block_name"],
            "district_id": row["district_id"],
            "district_name": row["district_name"],
            "state": row["state"],
            "coordinates": [float(row["lat"]), float(row["lon"])],
            "elevation_m": int(row["elevation_m"]),
            "distance_coast_km": int(row["dist_coast_km"]),
            "horizon_days": horizon,
            "target_hazard": hazard,
            "calibrated_probability": round(downscaled_p, 3),
            "onset_probability": round(onset_p, 3),
            "risk_tier": tier,
            # Non-negotiable: Pair color with probability and horizon
            "display_label": f"{tier['level']} ({int(downscaled_p*100)}% prob, {horizon}d)"
        })
        
    return {
        "status": "success",
        "horizon_days": horizon,
        "hazard": hazard,
        "total_blocks": len(features),
        "data_source": "synthetic",
        "features": features
    }
