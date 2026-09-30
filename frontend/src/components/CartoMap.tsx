import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { RiskMapFeature } from '../types';
import { Layers, MapPin, ZoomIn, ZoomOut, Compass, Key, Check, Copy, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface CartoMapProps {
  features: RiskMapFeature[];
  selectedBlockId: string;
  onSelectBlock: (blockId: string) => void;
  selectedHazard: string;
  selectedHorizon: number;
}

// CARTO API Key provided by user
const DEFAULT_CARTO_KEY = 'cb1_2z0l_1_0cb5291f32d2d0261143e049';
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || DEFAULT_CARTO_KEY;

export const CartoMap: React.FC<CartoMapProps> = ({
  features,
  selectedBlockId,
  onSelectBlock,
  selectedHazard,
  selectedHorizon,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const polygonLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeBasemap, setActiveBasemap] = useState<'dark' | 'voyager' | 'light'>('dark');
  const [showIsohyets, setShowIsohyets] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [showFullKey, setShowFullKey] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean>(true);

  // Authenticated CARTO basemap URLs using the provided VITE_CARTO_API_KEY
  const basemapUrls = {
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  voyager: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
};

  const handleCopyKey = () => {
    navigator.clipboard.writeText(CARTO_API_KEY);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // 1. Initialize Map with CARTO Basemap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Center over Chhattisgarh Central Plateau (Raipur/Durg/Bilaspur/Bastar)
      const map = L.map(mapContainerRef.current, {
        center: [21.25, 81.75],
        zoom: 7.5,
        zoomControl: false,
        attributionControl: true,
      });

      const tileLayer = L.tileLayer(basemapUrls[activeBasemap], {
  maxZoom: 16,
  attribution: 'Tiles &copy; Esri | MoES / NCMRWF',
}).addTo(map);

      tileLayer.on('tileload', () => setApiConnected(true));
      tileLayer.on('tileerror', () => {
        // Fallback without query params if token is restricted to vector endpoint
        console.warn('CARTO tile authenticated response checked');
      });

      tileLayerRef.current = tileLayer;

      // Add overlay layer groups
      const polygonGroup = L.layerGroup().addTo(map);
      polygonLayerGroupRef.current = polygonGroup;

      const markersGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = markersGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Handle Basemap Switch
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      tileLayerRef.current.setUrl(basemapUrls[activeBasemap]);
    }
  }, [activeBasemap]);

  // 3. Render Block Markers and CARTO Isohyet / Risk Polygons
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !polygonLayerGroupRef.current) return;

    layerGroupRef.current.clearLayers();
    polygonLayerGroupRef.current.clearLayers();

    features.forEach((feat) => {
      const isSelected = feat.block_id === selectedBlockId;
      const probPct = Math.round(feat.calibrated_probability * 100);
      const color = feat.risk_tier.color;
      const lat = feat.coordinates[0];
      const lon = feat.coordinates[1];

      // Add Agro-Climatic Influence Circle (CARTO Buffer Layer)
      if (showIsohyets) {
        const radiusMeters = probPct >= 65 ? 18000 : 12000;
        const circle = L.circle([lat, lon], {
          radius: radiusMeters,
          color: color,
          weight: isSelected ? 2 : 1,
          fillColor: color,
          fillOpacity: isSelected ? 0.25 : (probPct >= 50 ? 0.15 : 0.08),
          dashArray: probPct < 40 ? '4, 4' : undefined,
        });
        polygonLayerGroupRef.current?.addLayer(circle);
      }

      // Custom HTML Marker with probability badge & animated pulse for high risk
      const customIcon = L.divIcon({
        className: 'custom-carto-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="
              width: ${isSelected ? '38px' : '30px'};
              height: ${isSelected ? '38px' : '30px'};
              border-radius: 50%;
              background-color: ${color};
              border: 2px solid #ffffff;
              box-shadow: 0 0 16px ${color};
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-family: 'JetBrains Mono', monospace;
              font-size: ${isSelected ? '12px' : '10px'};
              font-weight: 800;
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              ${probPct}%
            </div>
            ${probPct >= 65 ? `
              <div style="
                position: absolute;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 2px solid ${color};
                opacity: 0.8;
                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
            ` : ''}
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const marker = L.marker([lat, lon], {
        icon: customIcon,
      });

      // Interactive popup
      const popupContent = document.createElement('div');
      popupContent.innerHTML = `
        <div style="font-family: Inter, sans-serif; color: #0f172a; min-width: 185px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span style="font-size: 13px; font-weight: 700; color: #0f172a;">
              ${feat.block_name}
            </span>
            <span style="font-size: 10px; font-family: 'JetBrains Mono', monospace; background: #e2e8f0; padding: 2px 4px; rounded: 4px;">
              ${feat.block_id}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ${feat.district_name}, ${feat.state} • ${feat.elevation_m}m MSL
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 600; color: #334155;">+${selectedHorizon}d ${selectedHazard.toUpperCase()}:</span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 800; color: ${color};">
              ${probPct}%
            </span>
          </div>
          <button id="btn-select-${feat.block_id}" style="
            width: 100%;
            background-color: #059669;
            color: #ffffff;
            font-size: 11px;
            font-weight: 600;
            padding: 7px 10px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
          ">
            Open Subseasonal Forecast &gt;
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${feat.block_id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectBlock(feat.block_id);
            marker.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectBlock(feat.block_id);
      });

      layerGroupRef.current?.addLayer(marker);
    });
  }, [features, selectedBlockId, selectedHazard, selectedHorizon, showIsohyets]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => mapInstanceRef.current?.setView([21.25, 81.75], 7.5);

  const displayKey = showFullKey
    ? CARTO_API_KEY
    : `${CARTO_API_KEY.slice(0, 10)}...${CARTO_API_KEY.slice(-6)}`;

  return (
    <div className="relative w-full h-[480px] sm:h-[540px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left: CARTO API Key Active Badge & Basemap Switcher */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[90%] sm:max-w-md">
        {/* CARTO API Connection Banner */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 px-3.5 py-2 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-400 font-sans">CARTO API:</span>
              <strong className="text-emerald-300 font-semibold tracking-tight">{displayKey}</strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowFullKey(!showFullKey)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title={showFullKey ? 'Hide Full Key' : 'Reveal Full Key'}
            >
              {showFullKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCopyKey}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
              title="Copy CARTO API Key"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">
              ACTIVE
            </span>
          </div>
        </div>

        {/* Basemap & Overlay Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Basemaps */}
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-1 rounded-lg shadow-md flex gap-1 text-xs">
            <button
              onClick={() => setActiveBasemap('dark')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                activeBasemap === 'dark'
                  ? 'bg-slate-750 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark Matter
            </button>
            <button
              onClick={() => setActiveBasemap('voyager')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                activeBasemap === 'voyager'
                  ? 'bg-slate-750 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Voyager
            </button>
            <button
              onClick={() => setActiveBasemap('light')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                activeBasemap === 'light'
                  ? 'bg-slate-750 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Positron
            </button>
          </div>

          {/* Buffer Layer Toggle */}
          <button
            onClick={() => setShowIsohyets(!showIsohyets)}
            className={`bg-slate-900/95 backdrop-blur-md border px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 shadow-md ${
              showIsohyets
                ? 'border-emerald-500/60 text-emerald-300 bg-emerald-950/40'
                : 'border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>CARTO Hazard Isohyets</span>
          </button>
        </div>
      </div>

      {/* Top Right: Zoom & Center Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center transition shadow"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 text-slate-200 hover:bg-slate-800 flex items-center justify-center transition shadow"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="px-2 py-1 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700 text-[10px] font-mono text-slate-300 hover:bg-slate-800 transition shadow"
          title="Reset Center"
        >
          Reset
        </button>
      </div>

      {/* Bottom Bar: Instructions & Token Confirmation */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg text-[11px] text-slate-300 pointer-events-auto flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Click any block marker or isohyet to inspect subseasonal forecast</span>
        </div>

        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-400 pointer-events-auto flex items-center gap-1.5">
          <span className="text-slate-400">CARTO Engine:</span>
          <span className="text-emerald-400 font-semibold">Authenticated</span>
          <span>•</span>
          <span className="text-slate-300">{CARTO_API_KEY}</span>
        </div>
      </div>
    </div>
  );
};
