# MONSOON-GUARD
### Hyperlocal Probabilistic Monsoon Onset & Break Prediction System
**Ministry of Earth Sciences (MoES) / National Centre for Medium Range Weather Forecasting (NCMRWF)**

---

## 1. System Overview
MONSOON-GUARD produces calibrated **probabilistic 7 / 14 / 21 / 30-day guidance** for:
1. **Local Monsoon Onset:** Distinguishing sustained soil-wetting onset from deceptive pre-monsoon transient showers.
2. **Monsoon Break / Extended Dry Spells:** Predicting consecutive dry sequences ($\ge 5$ days) that induce severe root-zone moisture depletion.
3. **Heavy Rainfall Hazards:** Probabilistic classification for extreme convective precipitation ($\ge 64.5\text{ mm/day}$).

Predictions are downscaled to **Block / Panchayat centroids** across Central India (Pilot region: Chhattisgarh districts including Raipur, Durg, Bilaspur, and Bastar plateau) and routed through a **deterministic agronomic rule engine** coupled with a **decoupled bilingual (Hindi/English) language formatting layer**.

```
+-----------------------------------------------------------------------------------------+
|                                    MONSOON-GUARD PIPELINE                               |
|                                                                                         |
|   [ERA5 Atmospheric Fields]    [NASA GPM IMERG Precipitation]   [ENSO / IOD / MJO]      |
|                                         │                                               |
|                                         ▼                                               |
|               Causal Feature Engineering (Strictly Backward-Looking <= t)               |
|                                         │                                               |
|                                         ▼                                               |
|    Multi-Horizon LightGBM/HistGBM Probabilistic Classifiers (7d, 14d, 21d, 30d Leads)    |
|                                         │                                               |
|                                         ▼                                               |
|      Non-Parametric Isotonic Calibration (Fitted strictly on 2019-2021 Validation)       |
|                                         │                                               |
|                                         ▼                                               |
|       Deterministic Agronomic Rule Engine (Crops: Paddy, Soybean, Maize, Arhar)         |
|                                         │                                               |
|                                         ▼                                               |
|       Decoupled Language Formatting Layer (Zero LLM Hallucination - Hindi & English)    |
|                                         │                                               |
|                  ┌──────────────────────┴──────────────────────┐                        |
|                  ▼                                             ▼                        |
|      Interactive Web Command Center              Farmer WhatsApp / SMS Mock Gateway     |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Non-Negotiable Scientific Principles

1. **Strictly Probabilistic:** Never outputs deterministic claims (e.g. *"monsoon will arrive on June 23"*). All outputs are calibrated probabilities $P \in [0, 1]$ accompanied by an explicit confidence rating.
2. **Decoupled LLM Architecture:** The LLM NEVER produces forecasts, risk assessments, or agronomic rules.
   $$\text{ML Model} \longrightarrow \text{Calibrated Probabilities} \longrightarrow \text{Rule Engine} \longrightarrow \text{Structured JSON} \longrightarrow \text{LLM Language Formatting}$$
3. **Baselines First:** Every forecast is benchmarked against **Sample Climatology** and **Lagged Persistence**. Skill is measured via Brier Score and Brier Skill Score ($BSS = 1 - \frac{BS_{\text{model}}}{BS_{\text{climo}}}$).
4. **Strict Temporal Splitting (No Data Leakage):**
   - **Training:** 2010-01-01 to 2018-12-31
   - **Validation & Calibration:** 2019-01-01 to 2021-12-31
   - **Out-of-Time Test Set:** 2022-01-01 to 2024-12-31
   - Automated unit test [`tests/test_leakage.py`](file:///d:/SIH/project2/tests/test_leakage.py) programmatically asserts that features at date $t$ strictly use data $\le t$.
5. **Calibrated Probabilities:** Evaluated on test set via reliability diagrams, Brier score, ROC-AUC, and PR-AUC.
6. **Local Operational Definition:** Onset is defined at block scale based on sustained soil-wetting thresholds ($\ge 25\text{ mm}$ 3-day burst verified by $\le 6$ consecutive dry days and $\ge 30\text{ mm}$ rain over subsequent 10 days). Complete definitions in [`docs/label_definitions.md`](file:///d:/SIH/project2/docs/label_definitions.md).
7. **Honest Skill Reporting:** We never fake accuracy. Predictability naturally diminishes between Day 14 and Day 30 for localized heavy convective rain; the UI prominently declares a **Low Confidence** indicator when skill degrades.
8. **Non-Causal SHAP:** Feature attributions explicitly declare that feature importance indicates statistical sensitivity, not thermodynamic causality.
9. **Transparent Synthetic Mode:** If real CDS/Earthdata APIs are unavailable, physically consistent synthetic data matching central Indian monsoon distributions is used. A visible **SYNTHETIC DATA BANNER** is displayed across the interface.

---

## 3. Quickstart & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1-Step Development Launch
To start both the FastAPI backend and Next.js/React frontend concurrently:
```bash
npm run dev
```
- **Web UI:** [http://localhost:5173](http://localhost:5173)
- **FastAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)

### CLI Targets (Makefile)
```bash
make setup      # Install Python and npm packages
make data       # Ingest data, compute labels, engineer features
make train      # Train multi-horizon probabilistic models & calibrate
make evaluate   # Generate verification report (docs/model_evaluation_report.md)
make test       # Run 15 unit and temporal leakage tests
make demo       # Run the 3-minute historical false-onset case demo in terminal
```

---

## 4. The 3-Minute Demo Walkthrough Flow

Follow this story flow to demonstrate MONSOON-GUARD:

1. **The Trap (June 11, 2023 - Dharsiwa Block, Raipur):**
   - Open the **Hindcast / False Onset** tab.
   - Explain the situation: Farmers saw 32 mm of rain between June 8-10. Calendar Climatology showed a moderate onset expectation (~38%) and low break risk (~8%). Traditional perception urged farmers to sow immediately.
2. **The MONSOON-GUARD Forecast (Cold-Start Execution):**
   - The model evaluated data *strictly up to June 11, 2023*.
   - Because MJO was in a suppressive phase and El Niño was intensifying, the model flagged **Onset Prob: 0.1% (LOW)** and **Break Prob: 46% (HIGH)**.
   - Result: A prominent **CRITICAL FALSE ONSET RISK DETECTED** banner was triggered.
3. **The Ground Truth Outcome:**
   - Review the 14-day timeline: From June 12 to June 23, an acute 12-day severe dry break occurred (total rainfall: 1.4 mm). Sown seeds in rainfed fields suffered catastrophic germination failure. MONSOON-GUARD's advisory successfully prevented seed loss.
4. **Interactive Spatial Drill-down:**
   - Switch to the **Risk Map** tab. Filter by district (e.g. Raipur, Bastar, Bilaspur) and switch lead horizons (7, 14, 21, 30 days).
   - Point out that every color is paired with explicit probability % and horizon labels.
5. **Crop-Specific Advisory & Farmer View:**
   - Switch to the **Farmer Advisory** tab.
   - Toggle between **Rainfed** and **Assured Irrigated**, switch crops (Paddy vs Soybean), and toggle language between **English** and **हिंदी**.
   - Tap **Audio** to hear simulated spoken advisory.
6. **WhatsApp Agromet Bot Simulation:**
   - Switch to the **WhatsApp Mock** tab.
   - Click one of the pre-set prompts (e.g. *"धान रायपुर सलाह"* or *"सोयाबीन दुर्ग मौसम"*).
   - Observe the instant bilingual WhatsApp guidance generated through the decoupled pipeline.
7. **Verification & Scientific Skill:**
   - Open the **Model Verification** tab. Review test set Brier Skill Scores (+0.19 to +0.37 vs Climatology) and observe honest transparency on subseasonal chaos limits.

---

## 5. Limitations & Scientific Governance
See [`docs/limitations.md`](file:///d:/SIH/project2/docs/limitations.md) for full boundaries:
- **Atmospheric Chaos:** Subseasonal heavy rainfall beyond 14 days has low deterministic predictability.
- **Microclimate vs Downscaling:** Statistical downscaling captures elevation and coastal distance but does not resolve isolated localized cloudburst cells (<5 km).
- **Advisory Authority:** Advisories serve as decision-support aids for field workers and farmers. Statutory directives remain under the mandate of IMD Agromet and State Agricultural Departments.
#   S I H - p r o j e c t 2  
 