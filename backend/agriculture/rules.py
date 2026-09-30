"""
MONSOON-GUARD: Agronomic Advisory Rule Engine
Deterministic rule engine mapping calibrated probabilities + crop sensitivity
into structured, actionable agronomic guidance.
"""

import yaml
from pathlib import Path
from typing import Dict, Any, List

CONFIG_CROPS_PATH = Path("config/crops.yaml")

def load_crops_config() -> Dict[str, Any]:
    with open(CONFIG_CROPS_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def generate_crop_advisory(
    crop_name: str,
    irrigated: bool,
    onset_prob: float,
    break_prob: float,
    heavy_rain_prob: float,
    horizon_days: int = 14,
    crop_stage: str = "sowing"
) -> Dict[str, Any]:
    """
    Evaluates risk rules deterministically.
    Outputs a structured dictionary with risk level, concrete field actions, and thresholds.
    """
    config = load_crops_config()
    crops = config.get("crops", {})
    crop_key = crop_name.lower().strip()
    
    # Default to paddy if crop unrecognized
    crop_meta = crops.get(crop_key, crops.get("paddy"))
    
    reasons = []
    actions_en = []
    actions_hi = []
    measures = []
    
    # 1. Evaluate False Onset / Sowing Window Dilemma
    if crop_stage in ["sowing", "nursery"]:
        if break_prob >= 0.55 and onset_prob < 0.45:
            risk_level = "VERY_HIGH" if not irrigated else "HIGH"
            reasons.append(f"High risk of severe dry spell ({break_prob*100:.0f}%) over the next {horizon_days} days.")
            reasons.append("Initial rainfall bursts are transient and insufficient for sustained root moisture.")
            
            if not irrigated:
                actions_en.append("STRICT ADVISORY: Delay sowing operations immediately.")
                actions_en.append("Do not sow dry seed beds; wait for verified sustained monsoon surge.")
                actions_hi.append("सख्त सलाह: बुवाई तुरंत स्थगित करें।")
                actions_hi.append("शुरुआती बारिश में बीज न डालें, 10-14 दिनों में सूखे का गंभीर जोखिम है।")
                measures.append("Keep seed stocks in moisture-proof bags.")
                measures.append("Prepare summer ploughing to conserve subsequent rain.")
            else:
                actions_en.append("Sow only if assured tubewell/canal irrigation is operational to bridge the 14-day dry gap.")
                actions_hi.append("केवल तभी बुवाई करें जब 14 दिनों तक ट्यूबवेल/नहर से सुनिश्चित सिंचाई उपलब्ध हो।")
                measures.append("Ensure micro-irrigation channels are unblocked.")
                
        elif onset_prob >= 0.65 and break_prob <= 0.35:
            risk_level = "LOW"
            reasons.append(f"Strong monsoon onset establishment ({onset_prob*100:.0f}%) with low break probability ({break_prob*100:.0f}%).")
            actions_en.append("Optimal window for main-field preparation and sowing.")
            actions_hi.append("बुवाई और मुख्य खेत की तैयारी के लिए सबसे अनुकूल समय।")
            measures.append("Complete seed treatment with Trichoderma or Rhizobium.")
            measures.append("Commence nursery sowing for transplanting varieties.")
        else:
            risk_level = "MODERATE"
            reasons.append(f"Mixed probability profile (Onset: {onset_prob*100:.0f}%, Break: {break_prob*100:.0f}%).")
            actions_en.append("Stagger sowing activities. Prefer short-duration drought-tolerant varieties.")
            actions_hi.append("किस्तों में बुवाई करें। कम अवधि और सूखा-सहिष्णु किस्मों को प्राथमिकता दें।")
            measures.append("Use broad-bed furrow (BBF) sowing method to buffer moisture shocks.")
            
    # 2. Evaluate Active Growth Stages (Tillering / Flowering / Pod Formation)
    else:
        stage_info = crop_meta.get("critical_stages", {}).get(crop_stage, {})
        tol_days = stage_info.get("dry_spell_tolerance_days", 6)
        
        if break_prob >= 0.60:
            risk_level = "VERY_HIGH"
            reasons.append(f"Crop is in sensitive stage '{crop_stage}' (tolerance: {tol_days} dry days).")
            reasons.append(f"High probability of extended dry break ({break_prob*100:.0f}%).")
            actions_en.append("Apply life-saving supplemental irrigation or in-situ straw mulch.")
            actions_hi.append("जीवनरक्षक सिंचाई दें या खेत में पलवार (मल्चिंग) बिछाकर नमी बचाएं।")
            measures.append("Spray 2% potassium chloride (KCl) or anti-transpirant to reduce moisture loss.")
        else:
            risk_level = "LOW"
            reasons.append(f"Adequate moisture stability expected across horizon.")
            actions_en.append("Proceed with scheduled nutrient and weeding management.")
            actions_hi.append("उर्वरक और खरपतवार नियंत्रण का सामान्य कार्य जारी रखें।")

    # 3. Waterlogging & Heavy Rain Alert
    if heavy_rain_prob >= 0.50:
        if risk_level in ["LOW", "MODERATE"]:
            risk_level = "HIGH"
        reasons.append(f"Heavy rainfall alert ({heavy_rain_prob*100:.0f}% probability >= 64.5 mm/day).")
        actions_en.append("Open drainage channels immediately to avert root asphyxiation.")
        actions_hi.append("खेतों में पानी निकासी की नालियां तुरंत खोलें ताकि जड़ों में सड़न न हो।")
        measures.append("Clean boundary bunds and outlet drains.")

    return {
        "crop": crop_meta["common_name"],
        "crop_hindi": crop_meta["hindi_name"],
        "irrigated": irrigated,
        "crop_stage": crop_stage,
        "risk_level": risk_level,
        "reasons": reasons,
        "recommended_action_en": " ".join(actions_en),
        "recommended_action_hi": " ".join(actions_hi),
        "field_measures": measures,
        "thresholds_used": {
            "onset_probability": onset_prob,
            "break_probability": break_prob,
            "heavy_rain_probability": heavy_rain_prob,
            "horizon_days": horizon_days,
            "water_requirement_mm": crop_meta["water_requirement_mm"]
        },
        "disclaimer": "Agricultural thresholds are placeholder models to be reviewed by agronomy experts / KVK scientists."
    }
