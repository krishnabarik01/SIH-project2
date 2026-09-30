export interface TeleconnectionData {
  as_of_date: string;
  teleconnections: {
    enso: {
      index_name: string;
      value: number;
      state: string;
      monsoon_impact: string;
    };
    iod: {
      index_name: string;
      value: number;
      state: string;
      monsoon_impact: string;
    };
    mjo: {
      index_name: string;
      phase: number;
      amplitude: number;
      rmm1: number;
      rmm2: number;
      phase_summary: string;
      monsoon_regime: string;
    };
  };
  data_source: string;
}

export interface BlockForecast {
  location: string;
  block_id: string;
  district: string;
  state: string;
  as_of_date: string;
  horizon_days: number;
  forecast: {
    onset_probability: number;
    break_probability: number;
    heavy_rain_probability: number;
  };
  all_horizons: {
    [key: string]: {
      onset_probability: number;
      break_probability: number;
      heavy_rain_probability: number;
    };
  };
  confidence: string;
  confidence_score: number;
  confidence_rationale: string;
  drivers: Array<{
    feature: string;
    name: string;
    impact: string;
    direction: "positive" | "negative";
    description: string;
  }>;
  causality_disclaimer: string;
  data_source: string;
}

export interface RiskMapFeature {
  block_id: string;
  block_name: string;
  district_id: string;
  district_name: string;
  state: string;
  coordinates: [number, number];
  elevation_m: number;
  distance_coast_km: number;
  horizon_days: number;
  target_hazard: string;
  calibrated_probability: number;
  onset_probability: number;
  risk_tier: {
    level: string;
    code: string;
    color: string;
    severity: number;
  };
  display_label: string;
}

export interface CropAdvisoryData {
  location: {
    block_id: string;
    block_name: string;
    district: string;
    state: string;
  };
  forecast_basis: {
    horizon_days: number;
    onset_probability: number;
    break_probability: number;
    heavy_rain_probability: number;
    confidence: string;
  };
  structured_advisory: {
    crop: string;
    crop_hindi: string;
    irrigated: boolean;
    crop_stage: string;
    risk_level: string;
    reasons: string[];
    recommended_action_en: string;
    recommended_action_hi: string;
    field_measures: string[];
    thresholds_used: {
      onset_probability: number;
      break_probability: number;
      heavy_rain_probability: number;
      horizon_days: number;
      water_requirement_mm: number;
    };
    disclaimer: string;
  };
  natural_language_guidance: {
    english_summary: string;
    hindi_summary: string;
    mode: string;
  };
  causality_disclaimer: string;
  data_source: string;
}

export interface HindcastCaseData {
  meta: {
    case_id: string;
    title: string;
    district: string;
    block_id: string;
    block_name: string;
    forecast_issue_date: string;
    horizon_days: number;
    narrative: {
      situation: string;
      dilemma: string;
      outcome: string;
    };
  };
  forecast_issue_date: string;
  horizon_days: number;
  is_false_onset_risk: boolean;
  false_onset_alert: string;
  antecedent_3d_rain_mm: number;
  model_forecast: {
    onset_probability: number;
    break_probability: number;
    heavy_rain_probability: number;
    confidence: string;
  };
  climatology_baseline: {
    onset_probability: number;
    break_probability: number;
    heavy_rain_probability: number;
  };
  actual_ground_truth: {
    cumulative_rainfall_mm: number;
    dry_days_in_period: number;
    max_consecutive_dry_days: number;
    break_occurred: boolean;
    sustained_onset_occurred: boolean;
    summary: string;
  };
  drivers: Array<{
    feature: string;
    name: string;
    impact: string;
    direction: "positive" | "negative";
    description: string;
  }>;
  timeline: Array<{
    date: string;
    rainfall_mm: number;
    t2m_c: number;
    status: string;
  }>;
}
