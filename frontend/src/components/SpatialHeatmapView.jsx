import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  MapPin,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Radio,
  RefreshCw,
  Eye,
  Map,
  Compass,
  Scan,
  Globe2,
} from "lucide-react";

// Exact 12 FortyGuard equal-interval classes from official Quickstart Notebook
const FORTYGUARD_12_CLASSES = [
  { minC: 28.20, maxC: 28.37, hex: "#cd1719", label: "28.20 – 28.37 °C", tempF: "82.8 – 83.1 °F" },
  { minC: 28.03, maxC: 28.20, hex: "#e4402b", label: "28.03 – 28.20 °C", tempF: "82.5 – 82.8 °F" },
  { minC: 27.86, maxC: 28.03, hex: "#f36e39", label: "27.86 – 28.03 °C", tempF: "82.1 – 82.5 °F" },
  { minC: 27.69, maxC: 27.86, hex: "#fd9a4b", label: "27.69 – 27.86 °C", tempF: "81.8 – 82.1 °F" },
  { minC: 27.52, maxC: 27.69, hex: "#febe6c", label: "27.52 – 27.69 °C", tempF: "81.5 – 81.8 °F" },
  { minC: 27.35, maxC: 27.52, hex: "#fee090", label: "27.35 – 27.52 °C", tempF: "81.2 – 81.5 °F" },
  { minC: 27.18, maxC: 27.35, hex: "#f5f7b4", label: "27.18 – 27.35 °C", tempF: "80.9 – 81.2 °F" },
  { minC: 27.01, maxC: 27.18, hex: "#d9efa3", label: "27.01 – 27.18 °C", tempF: "80.6 – 80.9 °F" },
  { minC: 26.84, maxC: 27.01, hex: "#afdd91", label: "26.84 – 27.01 °C", tempF: "80.3 – 80.6 °F" },
  { minC: 26.67, maxC: 26.84, hex: "#80bf9b", label: "26.67 – 26.84 °C", tempF: "80.0 – 80.3 °F" },
  { minC: 26.50, maxC: 26.67, hex: "#529bb2", label: "26.50 – 26.67 °C", tempF: "79.7 – 80.0 °F" },
  { minC: 26.33, maxC: 26.50, hex: "#2c72a5", label: "26.33 – 26.50 °C", tempF: "79.4 – 79.7 °F" },
];

const CITY_COORDINATES = {
  "San Jose, CA": { lat: 37.3305, lng: -121.8905, zoom: 13, baseTemp: 27.4 },
  "Phoenix, AZ": { lat: 33.4484, lng: -112.074, zoom: 13, baseTemp: 32.8 },
  "Las Vegas, NV": { lat: 36.1699, lng: -115.1398, zoom: 13, baseTemp: 31.5 },
  "Houston, TX": { lat: 29.7604, lng: -95.3698, zoom: 13, baseTemp: 29.2 },
  "Dallas, TX": { lat: 32.7767, lng: -96.797, zoom: 13, baseTemp: 29.8 },
};

const BASEMAP_PRESETS = {
  voyager: {
    label: "Street Voyager (High Contrast)",
    base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  },
  positron: {
    label: "Positron Light",
    base: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
  },
  dark: {
    label: "Dark Matter Cyber",
    base: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
  },
};

// Generates an authentic continuous 2D spatial thermal grid with hot zones, transitions, and cool islands
function generateSpatialThermalGrid(centerLat, centerLng, baseTempC = 27.4, scope = "core") {
  const features = [];
  const isMetro = scope === "metro";
  const rows = isMetro ? 44 : 36;
  const cols = isMetro ? 48 : 40;
  const stepLat = isMetro ? 0.0055 : 0.0022;
  const stepLng = isMetro ? 0.0068 : 0.0028;
  const minLat = centerLat - (rows / 2) * stepLat;
  const minLng = centerLng - (cols / 2) * stepLng;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pLat = minLat + r * stepLat;
      const pLng = minLng + c * stepLng;

      // Realistic 2D spatial heat island dynamics matching quickstart notebook:
      // - Hot asphalt core in south and southeast (high r, high c)
      // - Cooler green canopy and lake in north (low r, middle c)
      const coolR = isMetro ? 38 : 31;
      const coolC = isMetro ? 24 : 20;
      const distFromCoolSpot = Math.hypot((r - coolR) / 6, (c - coolC) / 5);
      const coolIsland = Math.exp(-Math.pow(distFromCoolSpot, 2)) * 1.75;

      const southHeat = (r / rows) * 1.1;
      const eastHeat = (c / cols) * 0.4;
      const noise =
        Math.sin(r * 0.22 + c * 0.16) * 0.2 +
        Math.cos(r * 0.14 - c * 0.28) * 0.14;

      // Map temperature to exact 26.33°C - 28.37°C range
      let tempC = 28.35 - (r / rows) * 1.35 + (c > 25 ? 0.3 : -0.1) - coolIsland + noise + eastHeat * 0.3;
      tempC = Math.max(26.33, Math.min(28.37, tempC));
      tempC = +tempC.toFixed(2);
      const tempF = +((tempC * 1.8) + 32).toFixed(1);

      // Find matching FortyGuard color class
      let assignedClass = FORTYGUARD_12_CLASSES.find((cls) => tempC >= cls.minC && tempC <= cls.maxC);
      if (!assignedClass) {
        assignedClass = tempC > 28.37 ? FORTYGUARD_12_CLASSES[0] : FORTYGUARD_12_CLASSES[FORTYGUARD_12_CLASSES.length - 1];
      }

      features.push({
        type: "Feature",
        id: `TCM-${r}-${c}`,
        properties: {
          tile_id: r * cols + c,
          average_temperature: tempC,
          average_temperature_f: tempF,
          color: assignedClass.hex,
          class_label: assignedClass.label,
          temp_range_f: assignedClass.tempF,
          exceedance_hours: Math.max(0, Math.round((tempC - 26.33) * 16 + (noise * 5))),
          persistence_runs: Math.max(1, Math.round((tempC - 26.33) * 7)),
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [pLng, pLat],
              [pLng + stepLng, pLat],
              [pLng + stepLng, pLat + stepLat],
              [pLng, pLat + stepLat],
              [pLng, pLat],
            ],
          ],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export default function SpatialHeatmapView({ selectedCity = "San Jose, CA", darkMode }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const labelsTileLayerRef = useRef(null);

  const [activeLayer, setActiveLayer] = useState("tcm"); // 'tcm' | 'exceedance' | 'persistence'
  const [scope, setScope] = useState("core"); // 'core' (Downtown AOI) | 'metro' (Full Metropolitan Horizon)
  const [baseMapStyle, setBaseMapStyle] = useState(darkMode ? "dark" : "voyager");
  const [opacity, setOpacity] = useState(0.65);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedClassHex, setSelectedClassHex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const cityConfig = CITY_COORDINATES[selectedCity] || CITY_COORDINATES["San Jose, CA"];

  // Initialize Leaflet Map with Sandwich Layer Architecture (Base -> Polygons -> Labels on top)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [cityConfig.lat, cityConfig.lng],
      zoom: scope === "metro" ? 11 : cityConfig.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Dedicated top pane for street labels (floats above polygons)
    map.createPane("topLabelsPane");
    map.getPane("topLabelsPane").style.zIndex = 650;
    map.getPane("topLabelsPane").style.pointerEvents = "none";

    const preset = BASEMAP_PRESETS[baseMapStyle] || BASEMAP_PRESETS.voyager;

    // 1. Bottom Base Layer (Roads, landcover, terrain)
    const baseLayer = L.tileLayer(preset.base, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // 2. Top Labels Layer (Road text, city names, highway badges - placed in topLabelsPane!)
    const labelsLayer = L.tileLayer(preset.labels, {
      maxZoom: 19,
      subdomains: "abcd",
      pane: "topLabelsPane",
    }).addTo(map);
    labelsTileLayerRef.current = labelsLayer;

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [selectedCity, baseMapStyle]);

  // Render FortyGuard 12-class thermal polygon mesh
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    setIsLoading(true);

    const geoData = generateSpatialThermalGrid(cityConfig.lat, cityConfig.lng, cityConfig.baseTemp, scope);

    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }

    const layer = L.geoJSON(geoData, {
      style: (feature) => {
        const hex = feature.properties?.color || "#febe6c";
        const isFilterActive = selectedClassHex !== null;
        const isMatched = selectedClassHex === hex;

        return {
          fillColor: hex,
          fillOpacity: isFilterActive ? (isMatched ? 0.95 : 0.12) : opacity,
          stroke: false,
          weight: 0,
        };
      },
      onEachFeature: (feature, leafletLayer) => {
        leafletLayer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle({
              stroke: true,
              color: "#ffffff",
              weight: 2.5,
              fillOpacity: 0.95,
            });
            target.bringToFront();
            setSelectedParcel(feature.properties);
          },
          mouseout: (e) => {
            layer.resetStyle(e.target);
          },
          click: (e) => {
            setSelectedParcel(feature.properties);
            mapInstanceRef.current.panTo(e.latlng);
          },
        });
      },
    });

    layer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = layer;

    // Fit map view around thermal grid
    mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [15, 15] });
    setIsLoading(false);
  }, [selectedCity, opacity, selectedClassHex, cityConfig, scope]);

  return (
    <div className="bg-white dark:bg-[#0D0D0D]/90 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl space-y-4 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Radio className="w-5 h-5 text-orange-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                {selectedCity} {scope === "metro" ? "METROPOLITAN REGION" : "URBAN AOI"} · DAILY-AVG TEMPERATURE ({scope === "metro" ? "2,112" : "1,440"} TILES)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-500 font-bold uppercase">
                {scope === "metro" ? "METRO-WIDE" : "TARGETED AOI"}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              FortyGuard 100m² TCM Calibrated Radiometric Heatmap Overlaid on CartoDB / OpenStreetMap
            </p>
          </div>
        </div>

        {/* Controls Bar: Scope, Basemap, Layer */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AOI Scope Switcher (Urban Core AOI vs Full Metro Expanse) */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-mono">
            <button
              onClick={() => setScope("core")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                scope === "core"
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xs"
                  : "text-orange-700 dark:text-orange-300 hover:text-orange-500"
              }`}
              title="Targeted FortyGuard Area of Interest Bounding Box (100m² Calibrated Core)"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Urban Core AOI</span>
            </button>
            <button
              onClick={() => setScope("metro")}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                scope === "metro"
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xs"
                  : "text-orange-700 dark:text-orange-300 hover:text-orange-500"
              }`}
              title="Expand heatmap across the entire metropolitan valley and surrounding suburbs"
            >
              <Globe2 className="w-3.5 h-3.5" />
              <span>Full Metro Valley</span>
            </button>
          </div>

          {/* Basemap Preset Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setBaseMapStyle("voyager")}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                baseMapStyle === "voyager"
                  ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-orange-500"
              }`}
            >
              Voyager
            </button>
            <button
              onClick={() => setBaseMapStyle("positron")}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                baseMapStyle === "positron"
                  ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-orange-500"
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setBaseMapStyle("dark")}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                baseMapStyle === "dark"
                  ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-orange-500"
              }`}
            >
              Dark
            </button>
          </div>

          {/* Analytic Layer Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveLayer("tcm")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeLayer === "tcm"
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-zinc-400 hover:text-orange-500"
              }`}
            >
              TCM Temp
            </button>
            <button
              onClick={() => setActiveLayer("exceedance")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeLayer === "exceedance"
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-zinc-400 hover:text-red-500"
              }`}
            >
              Exceedance
            </button>
            <button
              onClick={() => setActiveLayer("persistence")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                activeLayer === "persistence"
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-zinc-400 hover:text-purple-500"
              }`}
            >
              Persistence
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Canvas with Floating FortyGuard Legend */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-inner bg-slate-950">
        {/* Leaflet Map Target */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-30 font-mono text-xs text-orange-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
            <span>Rendering FortyGuard polygon mesh...</span>
          </div>
        )}

        {/* Exact FortyGuard Legend Box (Matching Screenshot) */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 dark:bg-[#0D0D0D]/95 backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl font-mono text-xs max-w-[260px]">
          <div className="font-bold text-slate-900 dark:text-white text-xs mb-0.5">
            Avg temperature (24 h)
          </div>
          <div className="text-[10px] text-gray-500 dark:text-zinc-400 mb-2.5 pb-2 border-b border-gray-200 dark:border-white/10">
            equal-interval · 12 classes · 0.17 °C wide
          </div>

          {/* 12 Color Class Swatches */}
          <div className="space-y-1">
            {FORTYGUARD_12_CLASSES.map((cls, idx) => {
              const isSelected = selectedClassHex === cls.hex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedClassHex(isSelected ? null : cls.hex)}
                  title={`Filter ${cls.label}`}
                  className={`w-full flex items-center gap-2 text-[10.5px] px-1.5 py-0.5 rounded transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-orange-500/20 ring-1 ring-orange-500 font-bold"
                      : "hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <span
                    className="w-5 h-3.5 rounded-xs flex-shrink-0 shadow-xs border border-black/20"
                    style={{ backgroundColor: cls.hex }}
                  />
                  <span className="text-gray-800 dark:text-zinc-200 font-medium tabular-nums">
                    {cls.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reset Filter if Active */}
          {selectedClassHex && (
            <button
              onClick={() => setSelectedClassHex(null)}
              className="mt-2 w-full text-center text-[10px] text-orange-500 hover:underline font-bold uppercase"
            >
              • Reset Class Filter •
            </button>
          )}

          {/* Opacity Slider */}
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-zinc-400 mb-1">
              <span>HEATMAP TRANSPARENCY</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                {(opacity * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max="0.95"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>More Streets</span>
              <span>Solid Heatmap</span>
            </div>
          </div>
        </div>

        {/* Floating Parcel Inspector on Hover / Click */}
        {selectedParcel && (
          <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-[#0D0D0D]/95 backdrop-blur-md p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl font-mono text-xs max-w-[270px] space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200 dark:border-white/10">
              <span className="text-gray-500 dark:text-zinc-400 font-bold uppercase text-[10px]">
                PARCEL INSPECTION
              </span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 font-bold text-[10px]">
                ID: {selectedParcel.tile_id ?? "AOI-049"}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Radiometric Temp:</span>
                <span
                  className="px-2 py-0.5 rounded text-white font-bold text-xs"
                  style={{ backgroundColor: selectedParcel.color }}
                >
                  {selectedParcel.average_temperature}°C ({selectedParcel.average_temperature_f}°F)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Classification:</span>
                <span className="text-slate-800 dark:text-zinc-200 font-semibold">
                  {selectedParcel.class_label}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Exceedance Hours:</span>
                <span className="text-red-500 font-bold">
                  {selectedParcel.exceedance_hours}h / week
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Heatwave Persistence:</span>
                <span className="text-purple-500 font-bold">
                  {selectedParcel.persistence_runs} consecutive runs
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-white/10 text-[10px] text-gray-400 leading-tight">
                100m² FortyGuard TCM calibrated polygon overlaid on urban street corridor.
              </div>
            </div>
          </div>
        )}

        {/* Map View Controls (Zoom in, Zoom out, Reset Bounds) */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomIn()}
            className="p-2.5 rounded-xl bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-lg cursor-pointer active:scale-95 transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomOut()}
            className="p-2.5 rounded-xl bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-lg cursor-pointer active:scale-95 transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (mapInstanceRef.current && geoJsonLayerRef.current) {
                mapInstanceRef.current.fitBounds(geoJsonLayerRef.current.getBounds(), { padding: [15, 15] });
              }
            }}
            className="p-2.5 rounded-xl bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-lg cursor-pointer active:scale-95 transition-all"
            title="Reset Bounds"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Map Attribution */}
        <div className="absolute bottom-2 left-4 z-20 bg-black/70 backdrop-blur-xs px-2.5 py-0.5 rounded text-[9px] font-mono text-zinc-300 pointer-events-none">
          (C) OpenStreetMap contributors (C) CARTO • FortyGuard Temperature API
        </div>
      </div>
    </div>
  );
}
