import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Flame,
  Radio,
  MapPin,
  Compass,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  ShieldAlert,
  Sun,
  Eye,
  Check,
} from "lucide-react";

// Procedural grid generator calibrated to FortyGuard 100m² TCM polygons
function generateTcmPolygons(city, activeLayer) {
  const baseLat = city.includes("Phoenix") ? 33.4484 : city.includes("Las Vegas") ? 36.1699 : 37.3382;
  const baseLng = city.includes("Phoenix") ? -112.074 : city.includes("Las Vegas") ? -115.1398 : -121.8863;
  const baseTemp = city.includes("Phoenix") ? 112 : city.includes("Las Vegas") ? 109 : 98;

  const tiles = [];
  const rows = 8;
  const cols = 12;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Deterministic pseudo-random variation based on r and c
      const noise = Math.sin(r * 1.5 + c * 2.1) * 0.5 + Math.cos(r * 0.8 - c * 1.2) * 0.5;
      const tcmTempF = Math.round(baseTemp + noise * 14 + (r % 3 === 0 ? 6 : -3));
      const exceedanceHrs = Math.max(2, Math.round(18 + noise * 16));
      const persistenceHrs = Math.max(1, Math.round(8 + noise * 7));
      const albedo = +(0.12 + Math.abs(noise) * 0.15).toFixed(2);
      const isBuilding = (r + c) % 3 !== 0;

      tiles.push({
        id: `TCM-${city.slice(0, 3).toUpperCase()}-${r.toString().padStart(2, "0")}${c.toString().padStart(2, "0")}`,
        row: r,
        col: c,
        lat: +(baseLat + (r - rows / 2) * 0.0012).toFixed(5),
        lng: +(baseLng + (c - cols / 2) * 0.0016).toFixed(5),
        tcmTempF,
        exceedanceHrs,
        persistenceHrs,
        albedo,
        surfaceType: isBuilding ? "Impervious Concrete / Roof" : "Urban Tree Canopy / Greenery",
        ghi: Math.round(560 + noise * 60),
      });
    }
  }
  return tiles;
}

export default function SpatialHeatmapView({ selectedCity, darkMode }) {
  const [activeLayer, setActiveLayer] = useState("tcm"); // 'tcm' | 'exceedance' | 'persistence' | 'satellite'
  const [selectedTile, setSelectedTile] = useState(null);
  const [hoveredTile, setHoveredTile] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showRadarSweep, setShowRadarSweep] = useState(true);

  const tiles = useMemo(() => generateTcmPolygons(selectedCity, activeLayer), [selectedCity, activeLayer]);

  // Color ramp function based on active layer
  const getTileColor = (tile) => {
    if (activeLayer === "tcm") {
      const t = tile.tcmTempF;
      if (t >= 118) return { fill: "rgba(225, 29, 72, 0.85)", stroke: "#fda4af", label: "Extreme Critical" };
      if (t >= 110) return { fill: "rgba(249, 115, 22, 0.80)", stroke: "#fdba74", label: "High Thermal Peak" };
      if (t >= 102) return { fill: "rgba(234, 179, 8, 0.75)", stroke: "#fef08a", label: "Elevated" };
      if (t >= 94) return { fill: "rgba(16, 185, 129, 0.65)", stroke: "#86efac", label: "Moderate" };
      return { fill: "rgba(56, 189, 248, 0.60)", stroke: "#7dd3fc", label: "Cool Island" };
    }
    if (activeLayer === "exceedance") {
      const e = tile.exceedanceHrs;
      if (e >= 26) return { fill: "rgba(239, 68, 68, 0.85)", stroke: "#fca5a5", label: "Severe Exceedance (>25h)" };
      if (e >= 16) return { fill: "rgba(249, 115, 22, 0.75)", stroke: "#fdba74", label: "Moderate (15-25h)" };
      return { fill: "rgba(59, 130, 246, 0.65)", stroke: "#93c5fd", label: "Low (<15h)" };
    }
    if (activeLayer === "persistence") {
      const p = tile.persistenceHrs;
      if (p >= 12) return { fill: "rgba(168, 85, 247, 0.85)", stroke: "#d8b4fe", label: "Persistent (>12h)" };
      if (p >= 6) return { fill: "rgba(236, 72, 153, 0.75)", stroke: "#f472b6", label: "Moderate (6-12h)" };
      return { fill: "rgba(6, 182, 212, 0.65)", stroke: "#67e8f9", label: "Transient (<6h)" };
    }
    // Satellite layer
    if (tile.surfaceType.includes("Impervious")) {
      return { fill: "rgba(245, 158, 11, 0.75)", stroke: "#fde68a", label: "Impervious Roof/Road" };
    }
    return { fill: "rgba(16, 185, 129, 0.75)", stroke: "#86efac", label: "Tree Canopy / Greenery" };
  };

  const currentInspector = selectedTile || hoveredTile || tiles[18];

  return (
    <div className="bg-white dark:bg-[#0D0D0D]/90 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl space-y-4">
      {/* Header & Layer Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Radio className="w-5 h-5 text-orange-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                FORTYGUARD 100M² TCM RADIOMETRIC MESH • {selectedCity}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-500 font-bold uppercase">
                GEOJSON POLYGONS
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              High-resolution thermal surface polygon layer with radiometric infrared calibration
            </p>
          </div>
        </div>

        {/* Layer Toggle Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-200 dark:border-white/10 text-xs font-mono">
          <button
            onClick={() => setActiveLayer("tcm")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeLayer === "tcm"
                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm"
                : "text-gray-600 dark:text-zinc-400 hover:text-orange-500"
            }`}
          >
            TCM Surface (°F)
          </button>
          <button
            onClick={() => setActiveLayer("exceedance")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeLayer === "exceedance"
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm"
                : "text-gray-600 dark:text-zinc-400 hover:text-red-500"
            }`}
          >
            Exceedance (Hrs)
          </button>
          <button
            onClick={() => setActiveLayer("persistence")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeLayer === "persistence"
                ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-sm"
                : "text-gray-600 dark:text-zinc-400 hover:text-purple-500"
            }`}
          >
            Persistence (Runs)
          </button>
          <button
            onClick={() => setActiveLayer("satellite")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeLayer === "satellite"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm"
                : "text-gray-600 dark:text-zinc-400 hover:text-emerald-500"
            }`}
          >
            Land Cover Mask
          </button>
        </div>
      </div>

      {/* Main Grid Canvas + Parcel Inspector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Heatmap Polygon Canvas */}
        <div className="lg:col-span-8 bg-gray-900 rounded-xl border border-gray-200 dark:border-white/10 p-3 relative overflow-hidden flex flex-col items-center justify-center min-h-[360px] shadow-inner">
          {/* Radar sweep animation */}
          {showRadarSweep && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: "conic-gradient(from 0deg at 50% 50%, rgba(249, 115, 22, 0.4) 0deg, transparent 60deg, transparent 360deg)",
                animation: "spin 6s linear infinite",
              }}
            />
          )}

          {/* Grid View Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 rounded-lg bg-black/70 border border-white/10 text-zinc-300 hover:text-white hover:bg-black/90 transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              className="p-1.5 rounded-lg bg-black/70 border border-white/10 text-zinc-300 hover:text-white hover:bg-black/90 transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowRadarSweep(!showRadarSweep)}
              className={`p-1.5 rounded-lg border text-xs font-mono transition-all ${
                showRadarSweep ? "bg-orange-500/20 border-orange-500/40 text-orange-400" : "bg-black/70 border-white/10 text-zinc-400"
              }`}
              title="Toggle Radar Sweep"
            >
              RADAR
            </button>
          </div>

          {/* SVG TCM Polygon Map */}
          <div
            className="w-full flex items-center justify-center transition-transform duration-300"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <svg viewBox="0 0 740 460" className="w-full max-h-[340px] select-none">
              <defs>
                <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#gridPattern)" />

              {/* Render Polygon Cells */}
              {tiles.map((tile) => {
                const colorInfo = getTileColor(tile);
                const isSelected = selectedTile?.id === tile.id;
                const isHovered = hoveredTile?.id === tile.id;
                const x = 30 + tile.col * 56;
                const y = 30 + tile.row * 50;

                return (
                  <g
                    key={tile.id}
                    onClick={() => setSelectedTile(tile)}
                    onMouseEnter={() => setHoveredTile(tile)}
                    onMouseLeave={() => setHoveredTile(null)}
                    className="cursor-pointer transition-all duration-200"
                  >
                    <polygon
                      points={`${x},${y} ${x + 50},${y} ${x + 54},${y + 44} ${x + 4},${y + 44}`}
                      fill={colorInfo.fill}
                      stroke={isSelected ? "#ffffff" : isHovered ? "#f97316" : colorInfo.stroke}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 0.8}
                      className="transition-all duration-200 hover:brightness-125"
                      style={{
                        filter: isSelected ? "drop-shadow(0 0 10px rgba(249, 115, 22, 0.8))" : "none",
                      }}
                    />
                    <text
                      x={x + 27}
                      y={y + 26}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                      className="pointer-events-none opacity-80"
                    >
                      {activeLayer === "tcm"
                        ? `${tile.tcmTempF}°`
                        : activeLayer === "exceedance"
                        ? `${tile.exceedanceHrs}h`
                        : activeLayer === "persistence"
                        ? `${tile.persistenceHrs}r`
                        : `${(tile.albedo * 100).toFixed(0)}%`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Color Scale Legend */}
          <div className="w-full flex items-center justify-between mt-2 pt-2 border-t border-white/5 font-mono text-[10px] text-zinc-400">
            <span>LOW HEAT RISK</span>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-2.5 rounded-sm bg-sky-400" />
              <span className="w-4 h-2.5 rounded-sm bg-emerald-400" />
              <span className="w-4 h-2.5 rounded-sm bg-amber-400" />
              <span className="w-4 h-2.5 rounded-sm bg-orange-500" />
              <span className="w-4 h-2.5 rounded-sm bg-rose-600" />
            </div>
            <span>CRITICAL THERMAL ANOMALY</span>
          </div>
        </div>

        {/* Selected Parcel Telemetry Inspector */}
        <div className="lg:col-span-4 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3 font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/10">
              <span className="text-gray-500 dark:text-zinc-400 font-bold">PARCEL INSPECTOR</span>
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-500 font-bold text-[10px]">
                {currentInspector.id}
              </span>
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Coordinates:</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  {currentInspector.lat}°N, {currentInspector.lng}°W
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">TCM Surface Temp:</span>
                <span className="text-orange-500 text-sm font-bold">
                  {currentInspector.tcmTempF}°F
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Exceedance Hours:</span>
                <span className="text-red-500 font-bold">{currentInspector.exceedanceHrs} hrs/week</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Persistence Runs:</span>
                <span className="text-purple-400 font-bold">{currentInspector.persistenceHrs} consecutive hrs</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Solar Irradiance:</span>
                <span className="text-amber-500 font-bold">{currentInspector.ghi} W/m²</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Albedo Index:</span>
                <span className="text-slate-900 dark:text-white font-bold">α = {currentInspector.albedo}</span>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-white/10">
                <span className="text-[10px] text-gray-500 dark:text-zinc-500 block mb-1">SURFACE CLASSIFICATION:</span>
                <span className="text-[11px] text-slate-800 dark:text-zinc-200 font-semibold">
                  {currentInspector.surfaceType}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5 text-[11px] text-slate-700 dark:text-zinc-300">
            <div className="flex items-center gap-1.5 font-bold text-orange-500 mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Microclimate Directive</span>
            </div>
            <p className="leading-relaxed">
              {currentInspector.tcmTempF >= 110
                ? "Extreme surface heat anomaly: Deploy reflective coatings (cool roofs) & target pre-cooling."
                : "Within baseline operative boundaries: Routine thermal monitoring active."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
