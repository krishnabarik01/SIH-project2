"""
MONSOON-GUARD: Operational Label Construction Engine
Implements mathematically rigorous definitions for Local Monsoon Onset,
False Onset, Monsoon Break / Dry Spell, and Heavy Rainfall across multiple horizons.
Reference: docs/label_definitions.md
"""

import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List

def compute_ground_truth_labels(df: pd.DataFrame, horizons: List[int] = [7, 14, 21, 30]) -> pd.DataFrame:
    """
    Computes operational binary target labels for each block and date.
    
    Targets constructed:
    - target_onset_{H}d: 1 if verified local onset occurs in (t, t + H]
    - target_break_{H}d: 1 if a break (>= 5 consecutive dry days) occurs in (t, t + H]
    - target_heavy_{H}d: 1 if any day in (t, t + H] has precipitation >= 64.5 mm
    - is_false_onset_episode: 1 if early rain burst is followed by severe dry spell
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["block_id", "date"]).reset_index(drop=True)
    
    df["is_rain_day"] = (df["tp"] >= 2.5).astype(int)
    
    # Store computed onset dates per (block_id, year)
    onset_dates_dict = {}
    false_onset_dict = set()
    
    for (block_id, year), group in df.groupby(["block_id", df["date"].dt.year]):
        group = group.sort_values("date").reset_index(drop=True)
        dates = group["date"].values
        rain = group["tp"].values
        rain_day = group["is_rain_day"].values
        n = len(dates)
        
        # Search candidate window: June 1 to July 15
        onset_found = None
        for i in range(n):
            dt = pd.Timestamp(dates[i])
            if dt.month == 6 or (dt.month == 7 and dt.day <= 15):
                # Check 3-day initial burst
                if i + 2 < n:
                    burst_rain = rain[i:i+3].sum()
                    burst_rain_days = rain_day[i:i+3].sum()
                    if burst_rain >= 25.0 and burst_rain_days >= 2:
                        # Check subsequent 10 days verification window (i+3 to i+12)
                        if i + 12 < n:
                            post_window_rain = rain[i+3:i+13].sum()
                            post_rain_days = rain_day[i+3:i+13]
                            # Find max consecutive dry days in post-window
                            max_cdd = 0
                            curr_cdd = 0
                            for is_rd in post_rain_days:
                                if is_rd == 0:
                                    curr_cdd += 1
                                    max_cdd = max(max_cdd, curr_cdd)
                                else:
                                    curr_cdd = 0
                                    
                            if max_cdd <= 6 and post_window_rain >= 30.0:
                                onset_found = dt
                                break  # Earliest verified onset established for this year
                            elif max_cdd >= 7:
                                false_onset_dict.add((block_id, dt.strftime("%Y-%m-%d")))
                                
        if onset_found is not None:
            onset_dates_dict[(block_id, year)] = onset_found
            
    # Apply targets across horizons
    for h in horizons:
        df[f"target_onset_{h}d"] = 0
        df[f"target_break_{h}d"] = 0
        df[f"target_heavy_{h}d"] = 0
        
    df["is_false_onset_episode"] = 0
    
    # Process targets per block
    result_groups = []
    for block_id, b_df in df.groupby("block_id"):
        b_df = b_df.sort_values("date").reset_index(drop=True)
        dates = b_df["date"].values
        rain = b_df["tp"].values
        rain_day = b_df["is_rain_day"].values
        n = len(dates)
        
        # Rolling CDD forward calculation for break detection
        # Break definition: sequence of >= 5 consecutive dry days during active monsoon (June 25 - Sept 15)
        is_break_start = np.zeros(n, dtype=int)
        for i in range(n):
            dt = pd.Timestamp(dates[i])
            # Active monsoon window
            if (dt.month == 6 and dt.day >= 25) or (dt.month in [7, 8]) or (dt.month == 9 and dt.day <= 15):
                if i + 4 < n and np.all(rain_day[i:i+5] == 0):
                    is_break_start[i] = 1
                    
        for h in horizons:
            onset_target = np.zeros(n, dtype=int)
            break_target = np.zeros(n, dtype=int)
            heavy_target = np.zeros(n, dtype=int)
            
            for i in range(n):
                current_dt = pd.Timestamp(dates[i])
                year = current_dt.year
                verified_onset = onset_dates_dict.get((block_id, year))
                
                # Forward window: [i+1, min(i+h, n-1)]
                end_idx = min(i + h, n - 1)
                if i < end_idx:
                    # Onset target: verified onset falls within future window and hasn't already passed
                    if verified_onset is not None and verified_onset > current_dt:
                        window_end_dt = pd.Timestamp(dates[end_idx])
                        if verified_onset <= window_end_dt:
                            onset_target[i] = 1
                            
                    # Break target: any break starting or ongoing within future window
                    if np.any(is_break_start[i+1:end_idx+1] == 1):
                        break_target[i] = 1
                        
                    # Heavy rain target: any day in window >= 64.5 mm
                    if np.any(rain[i+1:end_idx+1] >= 64.5):
                        heavy_target[i] = 1
                        
            b_df[f"target_onset_{h}d"] = onset_target
            b_df[f"target_break_{h}d"] = break_target
            b_df[f"target_heavy_{h}d"] = heavy_target
            
        # Map false onset episodes
        b_df["is_false_onset_episode"] = b_df.apply(
            lambda r: 1 if (r["block_id"], r["date"].strftime("%Y-%m-%d")) in false_onset_dict else 0,
            axis=1
        )
        result_groups.append(b_df)
        
    res_df = pd.concat(result_groups, ignore_index=True)
    return res_df

def run_label_pipeline():
    processed_path = Path("data/processed/meteorological_daily.parquet")
    if not processed_path.exists():
        raise FileNotFoundError("Run backend/ml/preprocessing.py first!")
    df = pd.read_parquet(processed_path)
    print(f"[LABELS] Building ground truth labels for {len(df)} records...")
    labeled_df = compute_ground_truth_labels(df)
    
    training_dir = Path("data/training")
    training_dir.mkdir(parents=True, exist_ok=True)
    out_path = training_dir / "labeled_dataset.parquet"
    labeled_df.to_parquet(out_path, index=False)
    print(f"[LABELS] Target label generation complete. Saved to {out_path}")
    print("[LABELS] Label frequencies (14-day horizon):")
    print(f"  - Onset (14d): {labeled_df['target_onset_14d'].mean():.4f}")
    print(f"  - Break (14d): {labeled_df['target_break_14d'].mean():.4f}")
    print(f"  - Heavy Rain (14d): {labeled_df['target_heavy_14d'].mean():.4f}")
    print(f"  - False Onset Events: {labeled_df['is_false_onset_episode'].sum()}")
    return labeled_df

if __name__ == "__main__":
    run_label_pipeline()
