# MONSOON-GUARD: Scientific & Engineering Methodology

## 1. System Objective
MONSOON-GUARD provides calibrated, probabilistic subseasonal guidance (7, 14, 21, and 30-day horizons) for:
1. **Local Monsoon Onset** (sustained soil-wetting threshold)
2. **Monsoon Break / Extended Dry Spells** (drought and root-zone moisture depletion)
3. **Heavy Rainfall Events** ($\ge 64.5\text{ mm/day}$)

The pipeline translates ML probabilistic forecasts through an agronomic rule engine into actionable advisories for farmers and district agricultural officers.

---

## 2. Strict Architectural Safeguards

1. **Probabilistic Outputs Only:** No deterministic outputs (e.g., "monsoon will arrive on June 24") are ever produced. All predictions are expressed as calibrated probabilities $P \in [0, 1]$ with explicit uncertainty and confidence metrics.
2. **Zero Hallucination / Decoupled LLM:** The Large Language Model never generates forecasts, calculates risk, or issues agronomic advice.
   - **Pipeline:** `ML Model -> Calibrated Probabilities -> Deterministic Rule Engine -> Structured JSON -> LLM Translation / Language Simplification (Hindi/English)`.
   - The LLM is strictly constrained to the structured numbers passed to it.
3. **Strict Temporal Splitting (No Data Leakage):**
   - **Training Set:** 2010-01-01 to 2018-12-31 (9 years)
   - **Validation Set:** 2019-01-01 to 2021-12-31 (3 years)
   - **Test / Evaluation Set:** 2022-01-01 to 2024-12-31 (3 years)
   - *Temporal leakage unit tests* assert that features at date $t$ only contain information from $\le t$.
4. **Rigorous Climatology and Persistence Baselines:**
   - Every model forecast is directly benchmarked against sample-climatology and lagged persistence.
   - Skill is quantified via **Brier Skill Score (BSS)**:
     $$BSS = 1 - \frac{BS_{\text{model}}}{BS_{\text{climatology}}}$$

---

## 3. Data Ingestion & Features

### 3.1 Input Datasets
- **ERA5 Daily Reanalysis:** Surface pressure ($sp$), mean sea level pressure ($msl$), $2\text{m}$ temperature ($t2m$), $2\text{m}$ dewpoint ($d2m$), $10\text{m}$ wind vectors ($u10, v10$), sea surface temperature ($sst$), total precipitation ($tp$).
- **High-Resolution NASA GPM IMERG (~0.1°):** High-resolution daily precipitation calibrated against Indian rain gauges.
- **Teleconnections & Subseasonal Oscillations:**
  - Oceanic Niño Index (ONI / Nino3.4) & 7/14-day lags.
  - Indian Ocean Dipole (IOD / DMI) & 7/14-day lags.
  - Madden-Julian Oscillation (MJO Real-time Multivariate MJO series RMM1, RMM2, Phase 1-8, Amplitude).
- **Geographic & Topographic Attributes:** Latitude, longitude, elevation ($m$), distance to coast ($km$).

### 3.2 Feature Engineering
- **Antecedent Rainfall Dynamics:** 1d, 3d, 7d, 14d, 30d rolling sums, rolling rain days, and current consecutive dry days ($CDD$).
- **Climatological Anomalies:** Current 7d rainfall relative to 2010–2018 historical median for that calendar day of year.
- **Thermodynamic & Kinematic Trends:**
  - Relative humidity calculated via Clausius-Clapeyron approximation from $t2m$ and $d2m$.
  - 3-day and 7-day pressure tendency ($\Delta msl$).
  - Low-level moisture flux convergence approximation ($q \times \mathbf{u}_{10}$).
- **Seasonality:** Day-of-year harmonic encoding ($\sin(2\pi \cdot \text{DOY}/365.25), \cos(2\pi \cdot \text{DOY}/365.25)$).

---

## 4. Modeling & Probabilistic Calibration

### 4.1 Algorithms
1. **Multi-Horizon LightGBM Classifiers:** Gradient-boosted decision trees trained with binary logloss on multi-horizon targets ($H \in \{7, 14, 21, 30\}$) with early stopping on the 2019-2021 validation split.
2. **Sequential Model (GRU/LSTM):** Recurrent neural network operating on 30-day history vectors for comparison.
3. **Statistical Downscaling:** Spatial regression blending coarse ERA5 atmospheric fields with IMERG local topography and local station statistics to produce block-level predictions.

### 4.2 Probability Calibration
Raw tree/ensemble scores are uncalibrated probabilities. We apply **Isotonic Regression** and **Platt Scaling (Logistic Calibration)** fitted strictly on the validation set (2019–2021):
- Calibration quality evaluated with **Reliability Diagrams** (binned observed frequency vs predicted probability) and **Expected Calibration Error (ECE)**.

### 4.3 Evaluation Metrics
- **Brier Score (BS):** $BS = \frac{1}{N} \sum_{i=1}^N (P_i - Y_i)^2$
- **Brier Skill Score (BSS):** Skill relative to Climatology and Persistence.
- **ROC-AUC & PR-AUC:** Critical for rare extreme events (Heavy Rain).
- **Reliability Curves:** Assesses overconfidence vs underconfidence.

---

## 5. Explainability
Feature attribution is computed using **SHAP (SHapley Additive exPlanations)** TreeExplainer.
- Top positive and negative drivers are displayed for each forecast (e.g., "Active MJO Phase 3 in Indian Ocean increased onset probability by +18%").
- Every explanation carries a prominent scientific disclaimer:
  *"SHAP attributions indicate statistical feature importance in the model, not physical causality."*
