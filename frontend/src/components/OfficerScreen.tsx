import React, { useState } from 'react';
import { Send, Users, ShieldAlert, CheckSquare, Square, Check, RefreshCw } from 'lucide-react';
import { RiskMapFeature } from '../types';

interface OfficerScreenProps {
  features: RiskMapFeature[];
  lang: 'en' | 'hi';
}

export const OfficerScreen: React.FC<OfficerScreenProps> = ({ features, lang }) => {
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<any | null>(null);

  // Sort blocks by Break risk (highest to lowest)
  const rankedBlocks = [...features].sort(
    (a, b) => b.calibrated_probability - a.calibrated_probability
  );

  const toggleSelectBlock = (blockId: string) => {
    setSelectedBlocks((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId]
    );
  };

  const selectAllHighRisk = () => {
    const highRisk = rankedBlocks
      .filter((b) => b.calibrated_probability >= 0.40)
      .map((b) => b.block_id);
    setSelectedBlocks(highRisk);
  };

  const handleDispatch = async () => {
    if (selectedBlocks.length === 0) return;
    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/farmer/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_ids: selectedBlocks,
          hazard_type: 'break',
          message_en: 'CRITICAL AGROMET ALERT: Extended dry break forecasted over next 14 days. Delay rainfed sowing.',
          message_hi: 'महत्वपूर्ण मौसम चेतावनी: आगामी 14 दिनों में सूखे का गंभीर जोखिम है। वर्षा आधारित फसलों की बुवाई स्थगित करें।',
        }),
      });
      const data = await res.json();
      setBroadcastResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Officer Command Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            {lang === 'en' ? 'District Extension Command' : 'जिला कृषि विस्तार कमान'}
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            {lang === 'en' ? 'Sub-District Vulnerability & Advisory Dispatch' : 'उप-जिला संवेदनशीलता व सलाह प्रेषण'}
          </h2>
          <p className="text-xs text-slate-400">
            {lang === 'en'
              ? 'Blocks ranked by subseasonal dry spell & break hazard. Multi-select to dispatch targeted bulletins.'
              : 'सूखे के जोखिम अनुसार क्रमबद्ध ब्लॉक। लक्षित बुलेटिन भेजने हेतु चयन करें।'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={selectAllHighRisk}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            {lang === 'en' ? 'Select All Vulnerable (>40%)' : 'सभी संवेदनशील ब्लॉक चुनें (>40%)'}
          </button>

          <button
            disabled={selectedBlocks.length === 0 || isBroadcasting}
            onClick={handleDispatch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-semibold text-white transition shadow"
          >
            {isBroadcasting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {lang === 'en'
                ? `Send Advisory Broadcast (${selectedBlocks.length})`
                : `कृषि बुलेटिन प्रेषित करें (${selectedBlocks.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Broadcast Result Toast */}
      {broadcastResult && (
        <div className="bg-emerald-950/80 border border-emerald-700 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <Check className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold">
                Broadcast Queued Successfully!
              </span>
              <p className="text-slate-300">
                Dispatched to {broadcastResult.total_sms_whatsapp_queued} farmers across {broadcastResult.blocks_covered} blocks via WhatsApp & SMS gateway mock.
              </p>
            </div>
          </div>
          <button
            onClick={() => setBroadcastResult(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ranked Blocks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                <th className="py-3 px-3 w-10">Select</th>
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Block Name</th>
                <th className="py-3 px-3">District</th>
                <th className="py-3 px-3">Break Risk (14d)</th>
                <th className="py-3 px-3">Risk Tier</th>
                <th className="py-3 px-3">Key Vulnerable Crops</th>
                <th className="py-3 px-3">Elevation / Coast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {rankedBlocks.map((b, idx) => {
                const isChecked = selectedBlocks.includes(b.block_id);
                const probPct = Math.round(b.calibrated_probability * 100);

                let badge = 'bg-emerald-950 text-emerald-400 border-emerald-800';
                if (probPct >= 70) badge = 'bg-rose-950 text-rose-400 border-rose-800';
                else if (probPct >= 50) badge = 'bg-orange-950 text-orange-400 border-orange-800';
                else if (probPct >= 30) badge = 'bg-amber-950 text-amber-400 border-amber-800';

                return (
                  <tr
                    key={b.block_id}
                    className={`hover:bg-slate-800/40 transition cursor-pointer ${
                      isChecked ? 'bg-slate-800/60' : ''
                    }`}
                    onClick={() => toggleSelectBlock(b.block_id)}
                  >
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelectBlock(b.block_id)}
                        className="text-slate-400 hover:text-emerald-400"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200 font-sans">
                      {b.block_name}
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans">
                      {b.district_name}
                    </td>
                    <td className="py-3 px-3 font-bold text-orange-400">
                      {probPct}% prob
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${badge}`}>
                        {b.risk_tier.level}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-300">
                      Paddy, Soybean, Arhar
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {b.elevation_m}m | {b.distance_coast_km}km
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
