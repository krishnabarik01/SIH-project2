"""
MONSOON-GUARD: WhatsApp / SMS Mock Webhook Adapter
Receives incoming messages from farmers, parses requests, and returns tailored bilingual advisories.
Testable directly via cURL or frontend phone simulator.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from backend.api.forecast import get_block_forecast
from backend.agriculture.rules import generate_crop_advisory
from backend.llm.explain import generate_natural_language_explanation

router = APIRouter(prefix="", tags=["WhatsApp"])

class WhatsAppInboundMessage(BaseModel):
    from_number: str = Field("+919876543210", description="Farmer mobile number")
    body: str = Field("धान रायपुर सलाह", description="Message text")
    block_id: Optional[str] = "CG_RAI_01"
    crop: Optional[str] = "paddy"

@router.post("/whatsapp/webhook")
def handle_whatsapp_webhook(msg: WhatsAppInboundMessage):
    text = msg.body.lower().strip()
    
    # Parse crop from message if present
    crop = "paddy"
    if "सोयाबीन" in text or "soybean" in text:
        crop = "soybean"
    elif "मक्का" in text or "maize" in text:
        crop = "maize"
    elif "अरहर" in text or "तुअर" in text or "arhar" in text or "tur" in text:
        crop = "pigeonpea"
        
    # Parse block or use provided
    block_id = msg.block_id or "CG_RAI_01"
    if "durg" in text or "दुर्ग" in text:
        block_id = "CG_DUR_01"
    elif "bilaspur" in text or "बिलासपुर" in text:
        block_id = "CG_BIL_01"
    elif "bastar" in text or "बस्तर" in text or "जगदलपुर" in text:
        block_id = "CG_BAS_01"
        
    # Get forecast
    fc = get_block_forecast(block_id=block_id, horizon=14)
    probs = fc["forecast"]
    
    # Generate advisory
    adv = generate_crop_advisory(
        crop_name=crop,
        irrigated=False,
        onset_prob=probs["onset_probability"],
        break_prob=probs["break_probability"],
        heavy_rain_prob=probs["heavy_rain_probability"],
        horizon_days=14,
        crop_stage="sowing"
    )
    
    explanation = generate_natural_language_explanation(adv)
    
    # Build WhatsApp formatted chat response
    whatsapp_reply = (
        f"🇮🇳 *मौसम-रक्षक (MONSOON-GUARD) MoES/NCMRWF*\n"
        f"📍 *स्थान:* {fc['location']} ({fc['district']})\n\n"
        f"{explanation['hindi_summary']}\n\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"⚠️ *विश्वसनीयता:* {fc['confidence']} ({fc['confidence_score']*100:.0f}%)\n"
        f"🌱 अन्य फसल की जानकारी के लिए 'सोयाबीन', 'मक्का', या 'अरहर' लिखकर भेजें।"
    )
    
    return {
        "status": "delivered",
        "recipient": msg.from_number,
        "parsed_intent": {
            "crop": crop,
            "block_id": block_id,
            "horizon_days": 14
        },
        "response_message": whatsapp_reply,
        "advisory_data": adv
    }
