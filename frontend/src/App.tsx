import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RiskMapScreen } from './components/RiskMapScreen';
import { ForecastScreen } from './components/ForecastScreen';
import { FarmerScreen } from './components/FarmerScreen';
import { OfficerScreen } from './components/OfficerScreen';
import { HindcastScreen } from './components/HindcastScreen';
import { ModelVerificationScreen } from './components/ModelVerificationScreen';
import { WhatsAppScreen } from './components/WhatsAppScreen';
import { TeleconnectionData, RiskMapFeature, BlockForecast, CropAdvisoryData } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('map');
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // Shared state
  const [selectedBlockId, setSelectedBlockId] = useState<string>('CG_RAI_01');
  const [selectedHorizon, setSelectedHorizon] = useState<number>(14);
  const [selectedHazard, setSelectedHazard] = useState<string>('break');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');

  // Farmer specific state
  const [selectedCrop, setSelectedCrop] = useState<string>('paddy');
  const [isIrrigated, setIsIrrigated] = useState<boolean>(false);
  const [cropStage, setCropStage] = useState<string>('sowing');

  // Data state
  const [climateState, setClimateState] = useState<TeleconnectionData | null>(null);
  const [riskMapFeatures, setRiskMapFeatures] = useState<RiskMapFeature[]>([]);
  const [activeForecast, setActiveForecast] = useState<BlockForecast | null>(null);
  const [activeAdvisory, setActiveAdvisory] = useState<CropAdvisoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const allBlocks = [
    { id: 'CG_RAI_01', name: 'Dharsiwa', district: 'Raipur' },
    { id: 'CG_RAI_02', name: 'Arang', district: 'Raipur' },
    { id: 'CG_RAI_03', name: 'Abhanpur', district: 'Raipur' },
    { id: 'CG_RAI_04', name: 'Tilda', district: 'Raipur' },
    { id: 'CG_DUR_01', name: 'Durg', district: 'Durg' },
    { id: 'CG_DUR_02', name: 'Patan', district: 'Durg' },
    { id: 'CG_DUR_03', name: 'Dhamdha', district: 'Durg' },
    { id: 'CG_BIL_01', name: 'Bilha', district: 'Bilaspur' },
    { id: 'CG_BIL_02', name: 'Kota', district: 'Bilaspur' },
    { id: 'CG_BIL_03', name: 'Masturi', district: 'Bilaspur' },
    { id: 'CG_BIL_04', name: 'Takhatpur', district: 'Bilaspur' },
    { id: 'CG_BAS_01', name: 'Jagdalpur', district: 'Bastar' },
    { id: 'CG_BAS_02', name: 'Bastanar', district: 'Bastar' },
    { id: 'CG_BAS_03', name: 'Tokapal', district: 'Bastar' },
  ];

  // 1. Fetch Climate Teleconnection State
  useEffect(() => {
    fetch('/api/climate-state')
      .then((res) => res.json())
      .then((data) => setClimateState(data))
      .catch((err) => console.error('Error fetching climate state:', err));
  }, []);

  // 2. Fetch Risk Map Data
  useEffect(() => {
    fetch(`/api/risk-map?horizon=${selectedHorizon}&hazard=${selectedHazard}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.features) setRiskMapFeatures(data.features);
      })
      .catch((err) => console.error('Error fetching risk map:', err));
  }, [selectedHorizon, selectedHazard]);

  // 3. Fetch Forecast for selected block
  useEffect(() => {
    fetch(`/api/forecast/block/${selectedBlockId}?horizon=${selectedHorizon}`)
      .then((res) => res.json())
      .then((data) => {
        setActiveForecast(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching forecast:', err);
        setLoading(false);
      });
  }, [selectedBlockId, selectedHorizon]);

  // 4. Fetch Crop Advisory
  useEffect(() => {
    fetch(
      `/api/crop-advisory?block_id=${selectedBlockId}&crop=${selectedCrop}&irrigated=${isIrrigated}&stage=${cropStage}&horizon=${selectedHorizon}`
    )
      .then((res) => res.json())
      .then((data) => setActiveAdvisory(data))
      .catch((err) => console.error('Error fetching advisory:', err));
  }, [selectedBlockId, selectedCrop, isIrrigated, cropStage, selectedHorizon]);

  const handleSelectBlockFromMap = (blockId: string) => {
    setSelectedBlockId(blockId);
    setActiveTab('forecast');
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        climateState={climateState}
        lang={lang}
        setLang={setLang}
      />

      {/* Screen Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'map' && (
          <RiskMapScreen
            features={riskMapFeatures}
            selectedHorizon={selectedHorizon}
            setSelectedHorizon={setSelectedHorizon}
            selectedHazard={selectedHazard}
            setSelectedHazard={setSelectedHazard}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            onSelectBlock={handleSelectBlockFromMap}
            lang={lang}
          />
        )}

        {activeTab === 'forecast' && (
          <ForecastScreen
            forecast={activeForecast}
            selectedBlockId={selectedBlockId}
            setSelectedBlockId={setSelectedBlockId}
            selectedHorizon={selectedHorizon}
            setSelectedHorizon={setSelectedHorizon}
            allBlocks={allBlocks}
            lang={lang}
          />
        )}

        {activeTab === 'farmer' && (
          <FarmerScreen
            advisory={activeAdvisory}
            selectedCrop={selectedCrop}
            setSelectedCrop={setSelectedCrop}
            isIrrigated={isIrrigated}
            setIsIrrigated={setIsIrrigated}
            cropStage={cropStage}
            setCropStage={setCropStage}
            lang={lang}
          />
        )}

        {activeTab === 'officer' && (
          <OfficerScreen features={riskMapFeatures} lang={lang} />
        )}

        {activeTab === 'hindcast' && <HindcastScreen lang={lang} />}

        {activeTab === 'verification' && <ModelVerificationScreen lang={lang} />}

        {activeTab === 'whatsapp' && <WhatsAppScreen />}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-400">
              MONSOON-GUARD • Ministry of Earth Sciences (MoES) / NCMRWF
            </p>
            <p className="text-[11px] text-slate-400">
              National Centre for Medium Range Weather Forecasting • Operational Prototype v1.0
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>ERA5 / IMERG Resolution ~10km</span>
            <span>•</span>
            <span>Isotonic Probability Calibrated</span>
            <span>•</span>
            <span className="text-amber-400/80">Synthetic Data Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
