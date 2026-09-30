"""
MONSOON-GUARD: Database Models & In-Memory Store
Stores farmer registrations, alert logs, and system preferences.
"""

import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

DB_PATH = Path("data/monsoon_guard.db")

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS farmers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        block_id TEXT NOT NULL,
        district_id TEXT NOT NULL,
        crop TEXT NOT NULL,
        is_irrigated INTEGER NOT NULL DEFAULT 0,
        preferred_language TEXT NOT NULL DEFAULT 'hi',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS advisory_broadcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        block_id TEXT NOT NULL,
        hazard_type TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        message_en TEXT NOT NULL,
        message_hi TEXT NOT NULL,
        sent_count INTEGER DEFAULT 0,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    conn.close()

def save_farmer_profile(data: Dict[str, Any]) -> Dict[str, Any]:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO farmers (name, phone, block_id, district_id, crop, is_irrigated, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
        name=excluded.name,
        block_id=excluded.block_id,
        district_id=excluded.district_id,
        crop=excluded.crop,
        is_irrigated=excluded.is_irrigated,
        preferred_language=excluded.preferred_language
    """, (
        data.get("name", "Farmer"),
        data.get("phone", "+919876543210"),
        data.get("block_id", "CG_RAI_01"),
        data.get("district_id", "CG_RAIPUR"),
        data.get("crop", "paddy"),
        1 if data.get("is_irrigated", False) else 0,
        data.get("preferred_language", "hi")
    ))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Farmer profile registered successfully"}

def get_registered_farmers(block_id: Optional[str] = None) -> List[Dict[str, Any]]:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    if block_id:
        cursor.execute("SELECT * FROM farmers WHERE block_id = ?", (block_id,))
    else:
        cursor.execute("SELECT * FROM farmers ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def log_broadcast(block_id: str, hazard_type: str, risk_level: str, msg_en: str, msg_hi: str, count: int) -> int:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO advisory_broadcasts (block_id, hazard_type, risk_level, message_en, message_hi, sent_count)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (block_id, hazard_type, risk_level, msg_en, msg_hi, count))
    conn.commit()
    broadcast_id = cursor.lastrowid
    conn.close()
    return broadcast_id
