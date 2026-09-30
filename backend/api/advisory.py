"""
MONSOON-GUARD: Crop Advisory API Endpoint
Orchestrates ML probabilistic forecast, deterministic agronomic rule engine, and LLM explanation layer.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from backend.api.forecast import get_block_forecast
from backend.agriculture.rules import generate_crop_advisory
from backend.llm.explain import generate_natural_language_explanation

router = APIRouter(prefix="", tags=["Advisory"])

@router.get("/crop-advisory")
def get_crop_advisory(
    block_id: str = Query("CG_RAI_01", description="Block identifier"),
    crop: str = Query("paddy", description="Crop name (paddy, soybean, maize, pigeonpea)"),
    irrigated: bool = Query(False, description="Whether farmer has assured irrigation"),
    stage: str = Query("sowing", description="Current stage: sowing, nursery, flowering, etc."),
    horizon: int = Query(14, enum=[7, 14, 21, 30])
):
    # 1. Fetch calibrated forecast for block
    forecast_data = get_block_forecast(block_id=block_id, horizon=horizon)
    f = forecast_data["forecast"]
    
    # 2. Pass to deterministic agronomic rule engine
    structured_rule_result = generate_crop_advisory(
        crop_name=crop,
        irrigated=irrigated,
        onset_prob=f["onset_probability"],
        break_prob=f["break_probability"],
        heavy_rain_prob=f["heavy_rain_probability"],
        horizon_days=horizon,
        crop_stage=stage
    )
    
    # 3. Pass to LLM formatting / explanation layer (strictly decoupled)
    bilingual_explanation = generate_natural_language_explanation(structured_rule_result)
    
    return {
        "location": {
            "block_id": block_id,
            "block_name": forecast_data["location"],
            "district": forecast_data["district"],
            "state": forecast_data["state"]
        },
        "forecast_basis": {
            "horizon_days": horizon,
            "onset_probability": f["onset_probability"],
            "break_probability": f["break_probability"],
            "heavy_rain_probability": f["heavy_rain_probability"],
            "confidence": forecast_data["confidence"]
        },
        "structured_advisory": structured_rule_result,
        "natural_language_guidance": bilingual_explanation,
        "causality_disclaimer": forecast_data["causality_disclaimer"],
        "data_source": forecast_data["data_source"]
    }
