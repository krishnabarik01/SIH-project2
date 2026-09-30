import React from 'react';
import { CloudRain, Globe, Compass, ShieldAlert, AlertTriangle } from 'lucide-react';
import { TeleconnectionData } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  climateState: TeleconnectionData | null;
  lang: 'en' | 'hi';
  setLang: (lang: 'en' | 'hi') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  climateState,
  lang,
  setLang,
}) => {
  const tabs = [
    { id: 'map', labelEn: 'Risk Map', labelHi: 'जोखिम मानचित्र' },
    { id: 'forecast', labelEn: 'Subseasonal Guidance', labelHi: 'पूर्वानुमान' },
    { id: 'farmer', labelEn: 'Farmer Advisory', labelHi: 'किसान सलाह' },
    { id: 'officer', labelEn: 'Extension Officer', labelHi: 'कृषि अधिकारी' },
    { id: 'hindcast', labelEn: 'Hindcast / False Onset', labelHi: 'मिथ्या आगमन विश्लेषण' },
    { id: 'verification', labelEn: 'Model Verification', labelHi: 'सत्यापन व सटीकता' },
    { id: 'whatsapp', labelEn: 'WhatsApp Mock', labelHi: 'व्हाट्सएप बॉट' },
  ];

  const enso = climateState?.teleconnections?.enso;
  const mjo = climateState?.teleconnections?.mjo;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* SYNTHETIC DATA BANNER - Non-negotiable Principle #9 */}
      <div className="bg-amber-950/80 border-b border-amber-600/40 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold tracking-wide uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-[11px] text-amber-300">
            SYNTHETIC DATA MODE (PROTOTYPE)
          </span>
          <span className="hidden sm:inline text-slate-300">
            Simulated physical meteorological fields (ERA5 + IMERG distributions, 2010–2024). Toggle to real data via <code className="text-amber-300 bg-amber-950 px-1 py-0.5 rounded">DATA_MODE=real</code>.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
            title="Toggle Language / भाषा बदलें"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">{lang === 'en' ? 'हिंदी' : 'English'}</span>
          </button>
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & MoES Attribution */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <CloudRain className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-mono">
                MONSOON<span className="text-emerald-400">-GUARD</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                MoES / NCMRWF
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'en'
                ? 'Hyperlocal Probabilistic Subseasonal Prediction System'
                : 'अति-स्थानीय संभाव्य मानसूनी उप-मौसमी मार्गदर्शन प्रणाली'}
            </p>
          </div>
        </div>

        {/* Global Teleconnection Pills */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60" title={enso?.monsoon_impact}>
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">ENSO (ONI):</span>
            <span className="font-mono font-semibold text-slate-200">
              {enso ? `${enso.value > 0 ? '+' : ''}${enso.value}` : '+0.60'}
            </span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-medium ${
              (enso?.value || 0) > 0.5 ? 'bg-orange-950 text-orange-400' : 'bg-emerald-950 text-emerald-400'
            }`}>
              {enso?.state.split(' ')[0] || 'Neutral'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60" title={mjo?.phase_summary}>
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400">MJO:</span>
            <span className="font-mono font-semibold text-slate-200">
              Phase {mjo?.phase || 4}
            </span>
            <span className="text-slate-400">Amp: {mjo?.amplitude || 1.3}</span>
            <span className={`text-[10px] px-1 py-0.2 rounded font-medium ${
              [3, 4, 5].includes(mjo?.phase || 4) ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
            }`}>
              {mjo?.monsoon_regime || 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex space-x-1 overflow-x-auto border-t border-slate-800 py-1 text-sm font-medium">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-md transition whitespace-nowrap text-xs sm:text-sm font-medium flex items-center gap-2 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.id === 'hindcast' && <ShieldAlert className="w-3.5 h-3.5 text-orange-300" />}
                {lang === 'en' ? tab.labelEn : tab.labelHi}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
