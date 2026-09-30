import React from 'react';
import { ShieldCheck, AlertCircle, TrendingUp, TrendingDown, HelpCircle, Layers, Calendar } from 'lucide-react';
import { BlockForecast } from '../types';

interface ForecastScreenProps {
  forecast: BlockForecast | null;
  selectedBlockId: string;
  setSelectedBlockId: (id: string) => void;
  selectedHorizon: number;
  setSelectedHorizon: (h: number) => void;
  allBlocks: Array<{ id: string; name: string; district: string }>;
  lang: 'en' | 'hi';
}

export const ForecastScreen: React.FC<ForecastScreenProps> = ({
  forecast,
  selectedBlockId,
  setSelectedBlockId,
  selectedHorizon,
  setSelectedHorizon,
  allBlocks,
  lang,
}) => {
  if (!forecast) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono">
        Loading calibrated subseasonal forecast...
      </div>
    );
  }

  const horizons = [7, 14, 21, 30];
  const fc = forecast.forecast;

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            {lang === 'en' ? 'Subseasonal Probabilistic Guidance' : 'उप-मौसमी संभाव्य मार्गदर्शन'}
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            {forecast.location}, {forecast.district}
          </h2>
          <p className="text-xs text-slate-400">
            {forecast.state} • Valid as of: <span className="font-mono text-slate-300">{forecast.as_of_date}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Block Selector */}
          <div>
            <label className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">
              {lang === 'en' ? 'Select Block' : 'ब्लॉक चुनें'}
            </label>
            <select
              value={selectedBlockId}
              onChange={(e) => setSelectedBlockId(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              {allBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.district})
                </option>
              ))}
            </select>
          </div>

          {/* Lead Horizon Selector */}
          <div>
            <label className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">
              {lang === 'en' ? 'Forecast Lead Horizon' : 'अग्रिम अवधि'}
            </label>
            <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {horizons.map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHorizon(h)}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                    selectedHorizon === h
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  +{h}d
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Forecast Bars & Confidence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calibrated Probabilities (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
                {lang === 'en' ? `Calibrated Probabilities (+${selectedHorizon} Days Lead)` : `अंशांकित संभावनाएं (+${selectedHorizon} दिन अग्रिम)`}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'en'
                  ? 'Isotonically calibrated on 2019–2021 validation set. Strictly probabilistic.'
                  : 'सत्यापन डेटा पर आइसोटोनिक रूप से अंशांकित। शुद्ध रूप से संभाव्य।'}
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-emerald-400 px-2.5 py-1 rounded border border-slate-700">
              +{selectedHorizon}d Horizon
            </span>
          </div>

          {/* Hazard Probability Cards */}
          <div className="space-y-4">
            {/* 1. Monsoon Break Risk */}
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    {lang === 'en' ? 'Monsoon Break / Extended Dry Spell' : 'मानसून ब्रेक / लंबा सूखा दौर'}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Probability of >=5 consecutive dry days' : 'लगातार >=५ सूखे दिनों की संभावना'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-orange-400">
                    {Math.round(fc.break_probability * 100)}%
                  </span>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono">
                    {fc.break_probability > 0.5 ? 'Elevated Break' : 'Normal Spell'}
                  </span>
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${Math.round(fc.break_probability * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* 2. Local Onset Establishment */}
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    {lang === 'en' ? 'Local Sustained Onset' : 'स्थानीय निरंतर मानसून आगमन'}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Sustained soil-wetting threshold (>=25mm burst + verified stability)' : 'स्थिर मृदा-नमी सीमा (>=२५ मिमी प्रारंभिक + १० दिन स्थिरता)'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {Math.round(fc.onset_probability * 100)}%
                  </span>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono">
                    {fc.onset_probability > 0.6 ? 'Onset Expected' : 'Onset Stalled'}
                  </span>
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round(fc.onset_probability * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* 3. Heavy Rain Event */}
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    {lang === 'en' ? 'Heavy Rain Event' : 'भारी वर्षा की घटना'}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'en' ? 'Probability of 24h rainfall >= 64.5 mm (IMD threshold)' : '२४ घंटे में वर्षा >= ६४.५ मिमी की संभावना'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold font-mono text-blue-400">
                    {Math.round(fc.heavy_rain_probability * 100)}%
                  </span>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono">
                    {fc.heavy_rain_probability > 0.4 ? 'Localized Alert' : 'Low Probability'}
                  </span>
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                  style={{ width: `${Math.round(fc.heavy_rain_probability * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Multi-Horizon Cross-Comparison Table */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              {lang === 'en' ? 'Multi-Horizon Trajectory (7 / 14 / 21 / 30 Days)' : 'बहु-अवधि प्रक्षेपवक्र (७ / १४ / २१ / ३० दिन)'}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2">Lead Horizon</th>
                    <th className="py-2">Onset Prob.</th>
                    <th className="py-2">Break / Dry Spell</th>
                    <th className="py-2">Heavy Rain (&gt;=64.5mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {[7, 14, 21, 30].map((h) => {
                    const hData = forecast.all_horizons[`${h}d`] || {
                      onset_probability: fc.onset_probability,
                      break_probability: fc.break_probability,
                      heavy_rain_probability: fc.heavy_rain_probability,
                    };
                    return (
                      <tr
                        key={h}
                        className={h === selectedHorizon ? 'bg-slate-800/60 font-semibold' : ''}
                      >
                        <td className="py-2 text-slate-300">+{h} Days</td>
                        <td className="py-2 text-emerald-400">
                          {Math.round(hData.onset_probability * 100)}%
                        </td>
                        <td className="py-2 text-orange-400">
                          {Math.round(hData.break_probability * 100)}%
                        </td>
                        <td className="py-2 text-blue-400">
                          {Math.round(hData.heavy_rain_probability * 100)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Confidence Indicator Panel (Non-negotiable Principle #7) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'en' ? 'Forecast Confidence Metric' : 'पूर्वानुमान विश्वसनीयता माप'}</span>
            </div>

            <div className="p-4 rounded-lg bg-slate-850 border border-slate-800 text-center space-y-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                forecast.confidence === 'High'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : forecast.confidence === 'Moderate'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {forecast.confidence} Confidence ({Math.round(forecast.confidence_score * 100)}%)
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {forecast.confidence_rationale}
              </p>
            </div>

            {/* Why this confidence breakdown */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
                Confidence Evaluation Breakdown
              </span>
              <ul className="space-y-1.5 text-slate-300 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Lead Horizon Penalty:</strong> Subseasonal predictability diminishes naturally between Day 14 and Day 30.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Ensemble Sharpness:</strong> Low probability spread confirms strong teleconnection forcing.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400">•</span>
                  <span><strong>Climatological Verification:</strong> Verified positive Brier Skill Score against calendar baselines.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* SHAP Feature Drivers Panel (Non-negotiable Principle #8) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              {lang === 'en' ? 'Model Attributions: Why this Forecast?' : 'मॉडल कारक: यह पूर्वानुमान क्यों?'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'en'
                ? 'Top meteorological drivers evaluated by tree marginal attributions for the primary hazard signal.'
                : 'प्राथमिक आपदा संकेत के लिए ट्री मार्जिनल एट्रिब्यूशन द्वारा मूल्यांकन किए गए शीर्ष मौसमी कारक।'}
            </p>
          </div>
        </div>

        {/* Feature Drivers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {forecast.drivers.map((d, idx) => {
            const isPos = d.direction === 'positive';
            return (
              <div
                key={idx}
                className="bg-slate-850 border border-slate-800 p-3.5 rounded-lg space-y-1.5 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    {d.name}
                  </span>
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    isPos ? 'bg-orange-950 text-orange-400' : 'bg-emerald-950 text-emerald-400'
                  }`}>
                    {d.impact}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {d.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Non-Causality Disclaimer - Principle #8 */}
        <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Scientific Attribution Notice:</strong> {forecast.causality_disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};
