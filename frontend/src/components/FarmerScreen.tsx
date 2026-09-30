import React, { useState } from 'react';
import { Sprout, Droplets, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Volume2, Copy, Check } from 'lucide-react';
import { CropAdvisoryData } from '../types';

interface FarmerScreenProps {
  advisory: CropAdvisoryData | null;
  selectedCrop: string;
  setSelectedCrop: (c: string) => void;
  isIrrigated: boolean;
  setIsIrrigated: (irr: boolean) => void;
  cropStage: string;
  setCropStage: (st: string) => void;
  lang: 'en' | 'hi';
}

export const FarmerScreen: React.FC<FarmerScreenProps> = ({
  advisory,
  selectedCrop,
  setSelectedCrop,
  isIrrigated,
  setIsIrrigated,
  cropStage,
  setCropStage,
  lang,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const crops = [
    { id: 'paddy', nameEn: 'Paddy / Rice', nameHi: 'धान (Paddy)', icon: '🌾' },
    { id: 'soybean', nameEn: 'Soybean', nameHi: 'सोयाबीन (Soybean)', icon: '🌱' },
    { id: 'maize', nameEn: 'Maize / Corn', nameHi: 'मक्का (Maize)', icon: '🌽' },
    { id: 'pigeonpea', nameEn: 'Arhar / Tur', nameHi: 'अरहर / तुअर (Tur)', icon: '🌿' },
  ];

  const stages = [
    { id: 'sowing', labelEn: 'Sowing / Nursery', labelHi: 'बुवाई / नर्सरी' },
    { id: 'tillering', labelEn: 'Vegetative / Tillering', labelHi: 'कल्ले फूटना / वानस्पतिक' },
    { id: 'flowering', labelEn: 'Flowering / Silking', labelHi: 'फूल आना / दाना भरना' },
  ];

  const handleCopy = () => {
    if (!advisory) return;
    const textToCopy = lang === 'en'
      ? advisory.natural_language_guidance.english_summary
      : advisory.natural_language_guidance.hindi_summary;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateSpeech = () => {
    if ('speechSynthesis' in window && advisory) {
      window.speechSynthesis.cancel();
      const textToSpeak = lang === 'hi'
        ? advisory.structured_advisory.recommended_action_hi
        : advisory.structured_advisory.recommended_action_en;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const adv = advisory?.structured_advisory;
  const isHighRisk = adv?.risk_level === 'VERY_HIGH' || adv?.risk_level === 'HIGH';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Mobile-First Header Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xl">
              🌾
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {lang === 'en' ? 'Farmer Decision Support System' : 'किसान कृषि सलाह व मौसम रक्षक'}
              </h2>
              <p className="text-xs text-slate-400">
                {advisory?.location.block_name}, {advisory?.location.district} • +{advisory?.forecast_basis.horizon_days}d Guidance
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 block">
              MoES Agromet Engine
            </span>
          </div>
        </div>

        {/* Crop Selector Tabs */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            {lang === 'en' ? '1. Select Your Crop' : '१. अपनी फसल चुनें'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {crops.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCrop(c.id)}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  selectedCrop === c.id
                    ? 'bg-emerald-950/70 border-emerald-500 ring-1 ring-emerald-500 text-white'
                    : 'bg-slate-850 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="text-lg">{c.icon}</span>
                <div>
                  <span className="text-xs font-bold block">
                    {lang === 'en' ? c.nameEn : c.nameHi}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Condition Toggles: Irrigation & Stage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          {/* Irrigation Availability */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {lang === 'en' ? '2. Irrigation Source' : '२. सिंचाई की सुविधा'}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setIsIrrigated(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition text-center ${
                  !isIrrigated
                    ? 'bg-slate-750 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-850 border-slate-800 text-slate-400'
                }`}
              >
                {lang === 'en' ? 'Rainfed (वर्षा आधारित)' : 'वर्षा आधारित (असिंचित)'}
              </button>
              <button
                onClick={() => setIsIrrigated(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition text-center ${
                  isIrrigated
                    ? 'bg-slate-750 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-850 border-slate-800 text-slate-400'
                }`}
              >
                {lang === 'en' ? 'Assured Irrigated' : 'सुनिश्चित सिंचाई (ट्यूबवेल/नहर)'}
              </button>
            </div>
          </div>

          {/* Growth Stage */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {lang === 'en' ? '3. Current Growth Stage' : '३. फसल का वर्तमान चरण'}
            </label>
            <div className="flex gap-1.5">
              {stages.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setCropStage(st.id)}
                  className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-medium border transition text-center ${
                    cropStage === st.id
                      ? 'bg-slate-750 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-850 border-slate-800 text-slate-400'
                  }`}
                >
                  {lang === 'en' ? st.labelEn : st.labelHi}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Advisory Presentation Card */}
      {advisory && (
        <div className={`border rounded-2xl p-6 shadow-md transition space-y-5 ${
          isHighRisk
            ? 'bg-rose-950/20 border-rose-800/60'
            : 'bg-slate-900 border-slate-800'
        }`}>
          {/* Risk Level Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isHighRisk ? (
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              )}
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  {lang === 'en' ? 'Calculated Agronomic Risk' : 'आकलित कृषि जोखिम'}
                </span>
                <h3 className={`text-base font-bold ${isHighRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {adv?.risk_level} RISK LEVEL
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateSpeech}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition flex items-center gap-1.5"
                title="Listen Audio / ऑडियो सुनें"
              >
                <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'text-emerald-400 animate-pulse' : 'text-slate-300'}`} />
                <span className="hidden sm:inline">{lang === 'en' ? 'Audio' : 'सुनें'}</span>
              </button>

              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition flex items-center gap-1.5"
                title="Copy Advisory / कॉपी करें"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Primary Action Guidance */}
          <div className={`p-4 rounded-xl border ${
            isHighRisk
              ? 'bg-rose-950/40 border-rose-800 text-rose-100'
              : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-100'
          }`}>
            <span className="text-[11px] font-bold uppercase tracking-wider block mb-1">
              {lang === 'en' ? 'Recommended Field Directive' : 'प्रमुख कृषि निर्देश'}
            </span>
            <p className="text-sm font-semibold leading-relaxed">
              {lang === 'en' ? adv?.recommended_action_en : adv?.recommended_action_hi}
            </p>
          </div>

          {/* Probabilistic Context */}
          <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">MONSOON ONSET</span>
              <span className="text-emerald-400 font-bold text-sm">
                {Math.round(advisory.forecast_basis.onset_probability * 100)}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">BREAK / DRY SPELL</span>
              <span className="text-orange-400 font-bold text-sm">
                {Math.round(advisory.forecast_basis.break_probability * 100)}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">HEAVY RAINFALL</span>
              <span className="text-blue-400 font-bold text-sm">
                {Math.round(advisory.forecast_basis.heavy_rain_probability * 100)}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">CONFIDENCE</span>
              <span className="text-slate-200 font-bold text-sm">
                {advisory.forecast_basis.confidence}
              </span>
            </div>
          </div>

          {/* Field Measures Checklist */}
          {adv?.field_measures && adv.field_measures.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                {lang === 'en' ? 'Immediate Field Contingency Steps' : 'खेत पर तुरंत किए जाने वाले उपाय'}
              </span>
              <div className="space-y-2">
                {adv.field_measures.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-850/80 border border-slate-800 text-xs text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-negotiable Principle #2 attribution */}
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              <strong>Scientific Governance:</strong> {adv?.disclaimer}
            </span>
            <span className="text-emerald-400 font-mono text-[10px]">
              Decoupled Rule Engine v1.0
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
