"""
MONSOON-GUARD: Statistical Downscaling Engine
Downscales coarse synoptic/reanalysis predictors to block-level predictions
incorporating terrain elevation, distance to coast, and local orographic biases.
"""

from typing import Dict, Any, List

def apply_block_downscaling(
    synoptic_prob: float,
    elevation_m: float,
    dist_coast_km: float,
    hazard_type: str
) -> float:
    """
    Applies orographic and coastal distance adjustments to calibrate block-scale probabilities.
    High plateau elevation (e.g. Bastar > 500m) increases orographic rainfall probability,
    while inland lowlands experience higher break risk.
    """
    prob = synoptic_prob
    if hazard_type == "heavy_rain":
        # Orographic enhancement on elevated plateau blocks
        if elevation_m > 450:
            prob *= 1.15
        elif elevation_m < 280:
            prob *= 0.95
    elif hazard_type == "break":
        # Continental inland distance increases dry spell duration
        if dist_coast_km > 400:
            prob *= 1.05
    elif hazard_type == "onset":
        # Southern coastal proximity (Bastar) experiences earlier onset surge
        if dist_coast_km < 300:
            prob *= 1.10
            
    return max(0.01, min(0.99, round(prob, 3)))
