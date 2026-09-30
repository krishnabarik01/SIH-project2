"""
MONSOON-GUARD: Farmer Profile & Extension Broadcast API
Handles farmer registrations, preferences, and mock broadcast alerts.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List
from backend.database.models import save_farmer_profile, get_registered_farmers, log_broadcast

router = APIRouter(prefix="", tags=["Farmer"])

class FarmerProfileRequest(BaseModel):
    name: str = Field(..., example="Ramesh Sahu")
    phone: str = Field(..., example="+919876543210")
    block_id: str = Field(..., example="CG_RAI_01")
    district_id: str = Field(..., example="CG_RAIPUR")
    crop: str = Field(..., example="paddy")
    is_irrigated: bool = Field(False, example=False)
    preferred_language: str = Field("hi", example="hi")

class BroadcastRequest(BaseModel):
    block_ids: List[str]
    hazard_type: str = "break"
    message_en: str
    message_hi: str

@router.post("/farmer/profile")
def register_farmer(req: FarmerProfileRequest):
    return save_farmer_profile(req.model_dump())

@router.get("/farmer/list")
def list_farmers(block_id: Optional[str] = None):
    return {"farmers": get_registered_farmers(block_id)}

@router.post("/farmer/broadcast")
def trigger_broadcast(req: BroadcastRequest):
    total_recipients = 0
    broadcast_ids = []
    for bid in req.block_ids:
        # In mock mode, calculate matching registered farmers + mock phone count
        farmers = get_registered_farmers(bid)
        count = max(len(farmers), 125)  # Mock count of registered farmers in block
        b_id = log_broadcast(bid, req.hazard_type, "HIGH", req.message_en, req.message_hi, count)
        total_recipients += count
        broadcast_ids.append(b_id)
        
    return {
        "status": "success",
        "blocks_covered": len(req.block_ids),
        "total_sms_whatsapp_queued": total_recipients,
        "broadcast_ids": broadcast_ids,
        "sample_dispatched_preview": req.message_hi
    }
