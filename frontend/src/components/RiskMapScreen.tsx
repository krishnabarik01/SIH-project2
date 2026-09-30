import React, { useState } from 'react';
import { MapPin, Mountain, Waves, Info, ArrowRight, Map, LayoutGrid } from 'lucide-react';
import { RiskMapFeature } from '../types';
import { CartoMap } from './CartoMap';

interface RiskMapScreenProps {
  features: RiskMapFeature[];
  selectedHorizon: number;
  setSelectedHorizon: (h: number) => void;
  selectedHazard: string;
  setSelectedHazard: (h: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (d: string) => void;
  onSelectBlock: (blockId: string) => void;
  lang: 'en' | 'hi';
}

export const RiskMapScreen: React.FC<RiskMapScreenProps> = ({
  features,
  selectedHorizon,
  setSelectedHorizon,
  selectedHazard,
  setSelectedHazard,
  selectedDistrict,
  setSelectedDistrict,
  onSelectBlock,
  lang,
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string>('CG_RAI_01');
  const [viewMode, setViewMode] = useState<'both' | 'map_only' | 'cards_only'>('both');

  const districts = ['All', 'Raipur', 'Durg', 'Bilaspur', 'Bastar'];
  const horizons = [7, 14, 21, 30];
  const hazards = [
    { id: 'break', labelEn: 'Monsoon Break / Dry Spell', labelHi: 'मानसून ब्रेक / सूखा दौर' },
    { id: 'onset', labelEn: 'Local Onset Establishment', labelHi: 'स्थानीय आगमन सक्रियता' },
    { id: 'heavy', labelEn: 'Heavy Rainfall (>=64.5mm)', labelHi: 'भारी वर्षा (>=६४.५ मिमी)' },
  ];

  const filteredFeatures = selectedDistrict === 'All'
    ? features
    : features.filter((f) => f.district_name.toLowerCase() === selectedDistrict.toLowerCase());

  const activeBlock = features.find((f) => f.block_id === selectedBlockId) || features[0];

  const handleSelectBlockFromMap = (blockId: string) => {
    setSelectedBlockId(blockId);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: District, Hazard, Horizon & View Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Hazard Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'en' ? 'Target Hazard Layer' : 'लक्ष्य आपदा श्रेणी'}
            </label>
            <div className="flex flex-wrap gap-2">
              {hazards.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHazard(h.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedHazard === h.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {lang === 'en' ? h.labelEn : h.labelHi}
                </button>
              ))}
            </div>
          </div>

          {/* Horizon Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'en' ? 'Forecast Lead Horizon' : 'पूर्वानुमान अग्रिम अवधि'}
            </label>
            <div className="flex gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
              {horizons.map((h) => (
                <button
                  key={h}
                  onClick={() => setSelectedHorizon(h)}
                  className={`px-3 py-1 rounded text-xs font-medium font-mono transition ${
                    selectedHorizon === h
                      ? 'bg-slate-700 text-emerald-400 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  +{h}d
                </button>
              ))}
            </div>
          </div>

          {/* District Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'en' ? 'District Filter' : 'जिला फ़िल्टर'}
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d} {d !== 'All' ? 'District' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'en' ? 'View Layout' : 'दृश्य लेआउट'}
            </label>
            <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode('both')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                  viewMode === 'both' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400'
                }`}
                title="Map & Cards"
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                onClick={() => setViewMode('map_only')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                  viewMode === 'map_only' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400'
                }`}
                title="CARTO Map Only"
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                onClick={() => setViewMode('cards_only')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                  viewMode === 'cards_only' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400'
                }`}
                title="Grid Cards Only"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Legend Notice (Never color alone) */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {lang === 'en'
                ? 'Color is always paired with calibrated probability %, risk tier, and forecast horizon.'
                : 'रंग सदैव अंशांकित संभावना प्रतिशत, जोखिम स्तर और अवधि के साथ प्रदर्शित होता है।'}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Low (&lt;30%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate (30-50%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> High (50-70%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Very High (&gt;70%)</span>
          </div>
        </div>
      </div>

      {/* CARTO GIS Interactive Map Section */}
      {(viewMode === 'both' || viewMode === 'map_only') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Map className="w-3.5 h-3.5 text-emerald-400" />
              <span>CARTO GIS Hyperlocal Block Layer ({filteredFeatures.length} Active Centroids)</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              Central Peninsular Plateau ({districts.filter(d => d !== 'All').join(', ')})
            </span>
          </div>

          <CartoMap
            features={filteredFeatures}
            selectedBlockId={selectedBlockId}
            onSelectBlock={handleSelectBlockFromMap}
            selectedHazard={selectedHazard}
            selectedHorizon={selectedHorizon}
          />
        </div>
      )}

      {/* Block Cards Grid + Detail Sidebar */}
      {(viewMode === 'both' || viewMode === 'cards_only') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Block Cards Grid (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {lang === 'en' ? 'Sub-District (Block) Guidance Grid' : 'उप-जिला (ब्लॉक) मार्गदर्शन ग्रिड'}
                <span className="ml-2 font-mono text-xs text-emerald-400">({filteredFeatures.length} Blocks)</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Horizon: +{selectedHorizon} Days
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredFeatures.map((feat) => {
                const isSelected = activeBlock?.block_id === feat.block_id;
                const probPct = Math.round(feat.calibrated_probability * 100);
                const tier = feat.risk_tier;

                let badgeColor = 'bg-emerald-950 text-emerald-400 border-emerald-800';
                let barColor = 'bg-emerald-500';
                if (tier.level === 'Very High') {
                  badgeColor = 'bg-rose-950 text-rose-400 border-rose-800';
                  barColor = 'bg-rose-500';
                } else if (tier.level === 'High') {
                  badgeColor = 'bg-orange-950 text-orange-400 border-orange-800';
                  barColor = 'bg-orange-500';
                } else if (tier.level === 'Moderate') {
                  badgeColor = 'bg-amber-950 text-amber-400 border-amber-800';
                  barColor = 'bg-amber-500';
                }

                return (
                  <div
                    key={feat.block_id}
                    onClick={() => setSelectedBlockId(feat.block_id)}
                    className={`cursor-pointer rounded-xl p-4 transition border ${
                      isSelected
                        ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <h3 className="font-semibold text-slate-200 text-sm">
                            {feat.block_name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 ml-5">
                          {feat.district_name}, {feat.state}
                        </p>
                      </div>
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-semibold ${badgeColor}`}>
                        {tier.level} • {probPct}%
                      </span>
                    </div>

                    {/* Probability Bar */}
                    <div className="mt-3.5 space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          {selectedHazard === 'break' ? 'Break Risk' : (selectedHazard === 'onset' ? 'Onset Prob' : 'Heavy Rain')}
                        </span>
                        <span className="text-slate-200 font-semibold">{probPct}% probability</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.max(5, probPct)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Micro Topography */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1 font-sans">
                        <Mountain className="w-3 h-3 text-slate-400" /> {feat.elevation_m}m
                      </span>
                      <span className="flex items-center gap-1 font-sans">
                        <Waves className="w-3 h-3 text-slate-400" /> {feat.distance_coast_km}km coast
                      </span>
                      <span>+{selectedHorizon}d lead</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Block Detailed Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sticky top-24 space-y-5">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Block Dossier
                </span>
                <h2 className="text-lg font-bold text-white mt-2">
                  {activeBlock?.block_name}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeBlock?.district_name} District, {activeBlock?.state} ({activeBlock?.block_id})
                </p>
              </div>

              {/* Downscaled Hazard Assessment */}
              <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Assessed Risk Tier:</span>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    activeBlock?.risk_tier.level === 'Very High' ? 'bg-rose-950 text-rose-400' :
                    activeBlock?.risk_tier.level === 'High' ? 'bg-orange-950 text-orange-400' :
                    activeBlock?.risk_tier.level === 'Moderate' ? 'bg-amber-950 text-amber-400' :
                    'bg-emerald-950 text-emerald-400'
                  }`}>
                    {activeBlock?.risk_tier.level} Risk ({Math.round((activeBlock?.calibrated_probability || 0) * 100)}%)
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {selectedHazard === 'break' && (activeBlock?.calibrated_probability || 0) > 0.5 && (
                    'Critical soil moisture stress forecasted. Deep roots vulnerable in rainfed kharif crops.'
                  )}
                  {selectedHazard === 'break' && (activeBlock?.calibrated_probability || 0) <= 0.5 && (
                    'Break risk within manageable seasonal thresholds. Regular monsoon activity expected.'
                  )}
                  {selectedHazard === 'onset' && (
                    `Local agro-meteorological onset probability is ${Math.round((activeBlock?.onset_probability || 0) * 100)}% over +${selectedHorizon} days.`
                  )}
                  {selectedHazard === 'heavy' && (
                    `Heavy rainfall (>=64.5mm/day) probability is ${Math.round((activeBlock?.calibrated_probability || 0) * 100)}% over +${selectedHorizon} days.`
                  )}
                </p>
              </div>

              {/* Geographical Downscaling Predictors */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">
                  Downscaling Topography
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800 p-2.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 block text-[10px]">Coordinates</span>
                    <span className="font-mono text-slate-200">
                      {activeBlock?.coordinates[0].toFixed(2)}°N, {activeBlock?.coordinates[1].toFixed(2)}°E
                    </span>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 block text-[10px]">Elevation</span>
                    <span className="font-mono text-slate-200">{activeBlock?.elevation_m} meters MSL</span>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 block text-[10px]">Bay of Bengal Dist.</span>
                    <span className="font-mono text-slate-200">{activeBlock?.distance_coast_km} km</span>
                  </div>
                  <div className="bg-slate-800 p-2.5 rounded border border-slate-700/50">
                    <span className="text-slate-400 block text-[10px]">CARTO GIS Integration</span>
                    <span className="font-mono text-emerald-400">Connected</span>
                  </div>
                </div>
              </div>

              {/* Fast Action Links */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onSelectBlock(activeBlock.block_id)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2.5 px-4 rounded-lg transition shadow"
                >
                  <span>{lang === 'en' ? 'Open Detailed Forecast & Drivers' : 'विस्तृत पूर्वानुमान व कारक देखें'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
