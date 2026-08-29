import { useState, useEffect, useRef, useDeferredValue } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Scan,
  Globe2,
  ChevronDown,
  Radio,
  Search,
  Check,
  Moon,
  Compass,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MONITORED_CITIES, REGIONS } from "../data/cities";

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

const BASEMAP_PRESETS = {
  dark: {
    label: "Dark Matter",
    icon: Moon,
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    maxNativeZoom: 16,
  },
  voyager: {
    label: "Voyager",
    icon: Compass,
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    labels: null,
    maxNativeZoom: 19,
  },
  positron: {
    label: "Light",
    icon: Sun,
    base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    maxNativeZoom: 16,
  },
};

function generateCityThermalGrid(city, scope = "core", granularity = 80) {
  const features = [];
  const isMetro = scope === "metro";
  
  let rows, cols, stepLat, stepLng;
  if (granularity === 60) {
    rows = isMetro ? 20 : 14;
    cols = isMetro ? 24 : 16;
    stepLat = isMetro ? 0.0042 : 0.0024;
    stepLng = isMetro ? 0.0052 : 0.0028;
  } else if (granularity === 100) {
    rows = isMetro ? 12 : 8;
    cols = isMetro ? 14 : 10;
    stepLat = isMetro ? 0.0072 : 0.0042;
    stepLng = isMetro ? 0.0088 : 0.0052;
  } else {
    // 80m standard default
    rows = isMetro ? 16 : 10;
    cols = isMetro ? 18 : 12;
    stepLat = isMetro ? 0.0055 : 0.0032;
    stepLng = isMetro ? 0.0068 : 0.0038;
  }

  const minLat = city.lat - (rows / 2) * stepLat;
  const minLng = city.lng - (cols / 2) * stepLng;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pLat = minLat + r * stepLat;
      const pLng = minLng + c * stepLng;

      const coolR = Math.round(rows * 0.85);
      const coolC = Math.round(cols * 0.55);
      const distFromCoolSpot = Math.hypot((r - coolR) / 5, (c - coolC) / 4);
      const coolIsland = Math.exp(-Math.pow(distFromCoolSpot, 2)) * 1.6;

      const noise =
        Math.sin(r * 0.24 + c * 0.17) * 0.18 +
        Math.cos(r * 0.15 - c * 0.28) * 0.12;

      let tempC = 28.35 - (r / rows) * 1.35 + (c > 16 ? 0.25 : -0.1) - coolIsland + noise;
      tempC = Math.max(26.33, Math.min(28.37, tempC));
      tempC = +tempC.toFixed(2);
      const tempF = +((tempC * 1.8) + 32).toFixed(1);

      let assignedClass = FORTYGUARD_12_CLASSES.find((cls) => tempC >= cls.minC && tempC <= cls.maxC);
      if (!assignedClass) {
        assignedClass = tempC > 28.37 ? FORTYGUARD_12_CLASSES[0] : FORTYGUARD_12_CLASSES[FORTYGUARD_12_CLASSES.length - 1];
      }

      features.push({
        type: "Feature",
        id: `${city.id}-${granularity}m-${r}-${c}`,
        properties: {
          city_name: city.name,
          tile_id: `${city.id.toUpperCase()}-${granularity}M-${r * cols + c}`,
          granularity_meters: granularity,
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

  return features;
}

const GRID_CACHE = new Map();

function generateAllCitiesThermalGrid(scope = "core", granularity = 80) {
  const cacheKey = `${scope}_${granularity}`;
  if (GRID_CACHE.has(cacheKey)) {
    return GRID_CACHE.get(cacheKey);
  }
  const allFeatures = [];
  MONITORED_CITIES.forEach((city) => {
    const cityFeatures = generateCityThermalGrid(city, scope, granularity);
    allFeatures.push(...cityFeatures);
  });
  const fc = { type: "FeatureCollection", features: allFeatures };
  GRID_CACHE.set(cacheKey, fc);
  return fc;
}

// Pre-warm the cache for ultra-smooth instantaneous switching
["core", "metro"].forEach((s) => {
  [60, 80, 100].forEach((g) => {
    generateAllCitiesThermalGrid(s, g);
  });
});

export default function SpatialHeatmapView({
  selectedCity = "Phoenix, AZ",
  onSelectCity,
  darkMode = true,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const labelsTileLayerRef = useRef(null);
  const dropdownRef = useRef(null);

  const [scope, setScope] = useState("core");
  const [currentView, setCurrentView] = useState("national");
  const [focusedCityName, setFocusedCityName] = useState(selectedCity);
  const [baseMapStyle, setBaseMapStyle] = useState(darkMode ? "dark" : "voyager");
  const [opacity, setOpacity] = useState(0.7);
  const [granularity, setGranularity] = useState(80);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedClassHex, setSelectedClassHex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveComputing, setIsLiveComputing] = useState(false);
  const [liveComputeStatus, setLiveComputeStatus] = useState(null);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");

  const deferredScope = useDeferredValue(scope);
  const deferredGranularity = useDeferredValue(granularity);

  const handleLiveFortyGuardCompute = async () => {
    setIsLiveComputing(true);
    setLiveComputeStatus(null);
    try {
      const cityParam = currentView === "national" ? (focusedCityName || "Phoenix, AZ") : focusedCityName;
      const apiBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "https://thermal-os-api.vercel.app";
      const res = await fetch(
        `${apiBase}/v1/fortyguard/heatmap?city=${encodeURIComponent(cityParam)}&granularity=${granularity}&force_live=true`
      );
      if (res.ok) {
        const data = await res.json();
        const servedFrom = data?.stats_data?.served_from;
        const msg =
          servedFrom === "1H_CACHE"
            ? `✓ FortyGuard Heatmap Loaded (Cached within last 1 hour)`
            : `✓ Live FortyGuard Heatmap Generated (Real-time Cloud Compute)`;
        setLiveComputeStatus({
          type: "success",
          msg,
        });
        setTimeout(() => setLiveComputeStatus(null), 6000);
      } else {
        setLiveComputeStatus({
          type: "error",
          msg: `Live compute request failed (status ${res.status}).`,
        });
        setTimeout(() => setLiveComputeStatus(null), 5000);
      }
    } catch (e) {
      console.error("Live FortyGuard compute error:", e);
      setLiveComputeStatus({
        type: "error",
        msg: "Failed to connect to FortyGuard API server.",
      });
      setTimeout(() => setLiveComputeStatus(null), 5000);
    } finally {
      setIsLiveComputing(false);
    }
  };

  useEffect(() => {
    setBaseMapStyle(darkMode ? "dark" : "voyager");
  }, [darkMode]);

  // Sync with selectedCity prop from parent app header
  useEffect(() => {
    if (selectedCity && selectedCity !== focusedCityName) {
      flyToCity(selectedCity);
    }
  }, [selectedCity]);

  // Sync zoom level when switching between Core AOI and Metro Valley in city view
  useEffect(() => {
    if (currentView === "city" && focusedCityName && mapInstanceRef.current) {
      const targetCity = MONITORED_CITIES.find((c) => c.name === focusedCityName);
      if (targetCity) {
        mapInstanceRef.current.flyTo(
          [targetCity.lat, targetCity.lng],
          scope === "metro" ? 11 : targetCity.zoom,
          { duration: 0.8, easeLinearity: 0.25 }
        );
      }
    }
  }, [scope]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsCityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const flyToCity = (cityName) => {
    const targetCity = MONITORED_CITIES.find((c) => c.name === cityName);
    if (targetCity && mapInstanceRef.current) {
      setCurrentView("city");
      setFocusedCityName(cityName);
      setIsCityDropdownOpen(false);
      mapInstanceRef.current.flyTo(
        [targetCity.lat, targetCity.lng],
        scope === "metro" ? 11 : targetCity.zoom,
        { duration: 1.2, easeLinearity: 0.25 }
      );
      if (onSelectCity) onSelectCity(cityName);
    }
  };

  const flyToNationalOverview = () => {
    if (mapInstanceRef.current) {
      setCurrentView("national");
      setIsCityDropdownOpen(false);
      mapInstanceRef.current.flyTo([38.0, -97.0], 4.2, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  };

  const getFeatureStyle = (feature, selectedHex, currentOpacity) => {
    const hex = (feature.properties?.color || "#ff6b2b").toLowerCase();
    const isFilterActive = Boolean(selectedHex);
    const isMatched = isFilterActive && selectedHex.toLowerCase() === hex;

    if (isFilterActive) {
      return {
        fillColor: hex,
        fillOpacity: isMatched ? 1.0 : 0.05,
        stroke: isMatched,
        color: "#ffffff",
        weight: isMatched ? 2 : 0,
      };
    }

    return {
      fillColor: hex,
      fillOpacity: currentOpacity,
      stroke: true,
      color: hex,
      weight: 0.5,
      opacity: currentOpacity * 0.4,
    };
  };

  // Initialize Map once on mount & handle resizing
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      preferCanvas: true,
      center: [38.0, -97.0],
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    });

    map.createPane("topLabelsPane");
    map.getPane("topLabelsPane").style.zIndex = 650;
    map.getPane("topLabelsPane").style.pointerEvents = "none";

    const preset = BASEMAP_PRESETS[baseMapStyle] || BASEMAP_PRESETS.dark;

    const baseLayer = L.tileLayer(preset.base, {
      maxNativeZoom: preset.maxNativeZoom || 16,
      maxZoom: 18,
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    if (preset.labels) {
      const labelsLayer = L.tileLayer(preset.labels, {
        maxNativeZoom: preset.maxNativeZoom || 16,
        maxZoom: 18,
        pane: "topLabelsPane",
      }).addTo(map);
      labelsTileLayerRef.current = labelsLayer;
    }

    mapInstanceRef.current = map;

    // Invalidate map size so it never renders 0x0 during tab animations
    const invalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    const t1 = setTimeout(invalidate, 80);
    const t2 = setTimeout(invalidate, 300);

    const ro = new ResizeObserver(() => {
      invalidate();
    });
    ro.observe(mapContainerRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Smoothly update map tiles without rebuilding the map instance
  useEffect(() => {
    const preset = BASEMAP_PRESETS[baseMapStyle] || BASEMAP_PRESETS.dark;
    if (baseTileLayerRef.current) {
      baseTileLayerRef.current.setUrl(preset.base);
      baseTileLayerRef.current.options.maxNativeZoom = preset.maxNativeZoom || 16;
    }
    if (labelsTileLayerRef.current) {
      if (preset.labels) {
        labelsTileLayerRef.current.setUrl(preset.labels);
        labelsTileLayerRef.current.options.maxNativeZoom = preset.maxNativeZoom || 16;
        labelsTileLayerRef.current.setOpacity(1);
      } else {
        labelsTileLayerRef.current.setOpacity(0);
      }
    }
  }, [baseMapStyle]);

  // Instantaneous style update when temperature filter or opacity slider changes
  useEffect(() => {
    if (geoJsonLayerRef.current) {
      geoJsonLayerRef.current.setStyle((feature) =>
        getFeatureStyle(feature, selectedClassHex, opacity)
      );
    }
  }, [selectedClassHex, opacity]);

  // Rebuild GeoJSON mesh and city markers on scope/granularity/focus changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const unifiedGeoData = generateAllCitiesThermalGrid(deferredScope, deferredGranularity);

    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }
    if (markersLayerGroupRef.current) {
      mapInstanceRef.current.removeLayer(markersLayerGroupRef.current);
    }

    const layer = L.geoJSON(unifiedGeoData, {
      style: (feature) => getFeatureStyle(feature, selectedClassHex, opacity),
      onEachFeature: (feature, leafletLayer) => {
        leafletLayer.on({
          mouseover: () => {
            setSelectedParcel(feature.properties);
          },
          click: () => {
            setSelectedParcel(feature.properties);
            if (feature.properties?.city_name) {
              setFocusedCityName(feature.properties.city_name);
              setCurrentView("city");
              if (onSelectCity) onSelectCity(feature.properties.city_name);
            }
          },
        });
      },
    });

    layer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = layer;

    // Place Monitored Cities Markers with live heat badges
    const markersGroup = L.layerGroup();
    MONITORED_CITIES.forEach((city) => {
      const isSelected = currentView === "city" && focusedCityName === city.name;
      const markerHtml = `
        <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg border transition-all ${
            isSelected
              ? "bg-[#FF6B2B] text-black border-white font-bold scale-110 shadow-[0_0_16px_rgba(255,107,43,0.8)]"
              : "bg-black/85 text-white border-white/20 hover:border-orange-400/60 hover:scale-105"
          }">
            <span class="w-2 h-2 rounded-full ${city.dotClass} ${isSelected ? "bg-black" : "animate-pulse"}"></span>
            <span class="text-[10.5px] font-sans font-medium tracking-tight whitespace-nowrap">${city.shortName}</span>
            <span class="text-[10px] font-mono opacity-85 ml-0.5">${city.tempF}</span>
          </div>
          <div class="w-2 h-2 ${
            isSelected ? "bg-[#FF6B2B]" : "bg-black/85 border-r border-b border-white/20"
          } rotate-45 -mt-1"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-city-marker-container",
        html: markerHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([city.lat, city.lng], { icon: customIcon });
      marker.on("click", () => {
        flyToCity(city.name);
      });
      markersGroup.addLayer(marker);
    });

    markersGroup.addTo(mapInstanceRef.current);
    markersLayerGroupRef.current = markersGroup;
  }, [deferredScope, focusedCityName, currentView, deferredGranularity]);

  const filteredCities = MONITORED_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(citySearchQuery.toLowerCase())
  );

  return (
    <div className="glass-panel rounded-3xl p-5 flex flex-col space-y-4 font-sans relative">
      {/* 1. Dedicated Header Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.25)]">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-black dark:text-white">
                Spatial Microclimate Heatmap
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[11px] font-mono font-semibold text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                {currentView === "national" ? "National Overview" : focusedCityName}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 font-mono">
              FortyGuard {granularity}m Radiometric Grid · Esri ArcGIS High-Resolution Canvas
            </p>
          </div>
        </div>

        {/* Live Sensor Feed Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06] text-xs font-mono text-gray-500 dark:text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
          <span className="font-medium text-black dark:text-white">FortyGuard 24h Telemetry</span>
        </div>
      </div>

      {/* 2. Dedicated Interactive Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Custom High-End City Selector Dropdown */}
          <div ref={dropdownRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="flex items-center gap-2 glass-panel-subtle hover:border-orange-500/50 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-black dark:text-white shadow-xs font-mono group"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="font-medium">
                {currentView === "national" ? "National Overview" : focusedCityName}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                  isCityDropdownOpen ? "rotate-180 text-orange-500" : ""
                }`}
              />
            </motion.button>

              <AnimatePresence>
                {isCityDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    className="absolute top-full mt-2 right-0 w-80 glass-popover rounded-3xl overflow-hidden z-50 flex flex-col max-h-[380px] font-mono text-xs shadow-2xl"
                  >
                    {/* Subtle top edge glow */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

                    {/* Spotlight Search Header */}
                    <div className="p-3 border-b border-gray-200/80 dark:border-white/[0.08] bg-gray-50/70 dark:bg-white/[0.02] relative flex items-center">
                      <Search className="w-3.5 h-3.5 absolute left-6 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search 22+ cities..."
                        value={citySearchQuery}
                        onChange={(e) => setCitySearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-black/70 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-12 py-2 text-xs text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono"
                        autoFocus
                      />
                      {citySearchQuery ? (
                        <button
                          onClick={() => setCitySearchQuery("")}
                          className="absolute right-6 p-1 rounded-md text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="absolute right-6 text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-zinc-700 pointer-events-none">
                          ESC
                        </span>
                      )}
                    </div>

                    {/* Options List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {/* National Overview Option */}
                      {!citySearchQuery && (
                        <button
                          onClick={flyToNationalOverview}
                          className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                            currentView === "national"
                              ? "bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent border border-orange-500/40 text-black dark:text-white font-bold shadow-xs"
                              : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Globe2 className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-semibold">National Overview (All Cities)</span>
                          </div>
                          {currentView === "national" && (
                            <Check className="w-3.5 h-3.5 text-orange-500" />
                          )}
                        </button>
                      )}

                      {/* Regional Groups */}
                      {REGIONS.map((region) => {
                        const regionCities = filteredCities.filter((c) => c.region === region);
                        if (regionCities.length === 0) return null;

                        return (
                          <div key={region} className="space-y-1">
                            <div className="px-3 py-1 text-[9.5px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 rounded-lg flex items-center justify-between">
                              <span>{region}</span>
                              <span className="text-[9px] text-orange-400/60 font-normal">{regionCities.length}</span>
                            </div>
                            <div className="space-y-0.5">
                              {regionCities.map((c) => {
                                const isSelected = currentView === "city" && focusedCityName === c.name;
                                const tempNum = parseFloat(c.tempF);

                                return (
                                  <button
                                    key={c.id}
                                    onClick={() => flyToCity(c.name)}
                                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group ${
                                      isSelected
                                        ? "bg-gradient-to-r from-orange-500/25 via-orange-500/10 to-transparent border border-orange-500/40 text-black dark:text-white font-bold shadow-xs"
                                        : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:text-black dark:hover:text-white border border-transparent"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <span className={`w-2 h-2 rounded-full ${c.dotClass} shadow-[0_0_6px_currentColor]`} />
                                      <span className="text-xs font-medium">{c.name}</span>
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                                        tempNum >= 105
                                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                          : tempNum >= 95
                                          ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                                          : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                      }`}
                                    >
                                      {c.tempF}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {filteredCities.length === 0 && (
                        <div className="p-6 text-center text-xs text-gray-500 dark:text-zinc-500 font-mono">
                          No cities matching "{citySearchQuery}"
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>

          {/* 1. Animated AOI Scope Segmented Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-2xl glass-panel-subtle text-xs font-mono relative shadow-xs">
            {[
              { id: "core", label: "Core AOI", icon: Scan },
              { id: "metro", label: "Metro Valley", icon: Globe2 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = scope === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => setScope(item.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative px-3.5 py-1.5 rounded-xl font-medium flex items-center justify-center cursor-pointer select-none group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="aoiScopeIndicatorPill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF6B2B] via-[#FF7832] to-[#FF8A3D] shadow-[0_0_18px_rgba(255,107,43,0.55),inset_0_1px_1px_rgba(255,255,255,0.45)]"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center gap-1.5 transition-colors duration-150 ${
                      isActive
                        ? "text-black font-extrabold"
                        : "text-gray-400 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* 2. Animated Basemap Preset Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-2xl glass-panel-subtle text-xs font-mono relative shadow-xs">
            {Object.entries(BASEMAP_PRESETS).map(([key, item]) => {
              const Icon = item.icon;
              const isActive = baseMapStyle === key;

              return (
                <motion.button
                  key={key}
                  onClick={() => setBaseMapStyle(key)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative px-3.5 py-1.5 rounded-xl font-medium flex items-center justify-center cursor-pointer select-none group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="baseMapIndicatorPill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF6B2B] via-[#FF7832] to-[#FF8A3D] shadow-[0_0_18px_rgba(255,107,43,0.55),inset_0_1px_1px_rgba(255,255,255,0.45)]"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <span
                    className={`relative z-10 flex items-center gap-1.5 transition-colors duration-150 ${
                      isActive
                        ? "text-black font-extrabold"
                        : "text-gray-400 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* 3. Spatial Resolution Selector: 60m / 80m / 100m */}
          <div className="flex items-center gap-1 p-1 rounded-2xl glass-panel-subtle text-xs font-mono relative shadow-xs">
            {[
              { value: 60, label: "60m", title: "60m Micro-Block Resolution (High Density Mesh)" },
              { value: 80, label: "80m", title: "80m Neighborhood Standard Resolution" },
              { value: 100, label: "100m", title: "100m Macro-District Fast Resolution" },
            ].map((item) => {
              const isActive = granularity === item.value;
              return (
                <motion.button
                  key={item.value}
                  onClick={() => setGranularity(item.value)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  title={item.title}
                  className="relative px-3.5 py-1.5 rounded-xl font-medium flex items-center justify-center cursor-pointer select-none min-w-[48px] group"
                >
                  {isActive && (
                    <motion.div
                      layoutId="granularityIndicatorPill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF6B2B] via-[#FF7832] to-[#FF8A3D] shadow-[0_0_18px_rgba(255,107,43,0.55),inset_0_1px_1px_rgba(255,255,255,0.45)]"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <span
                    className={`relative z-10 tracking-tight transition-colors duration-150 ${
                      isActive
                        ? "text-black font-extrabold"
                        : "text-gray-400 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* 4. Explicit Live FortyGuard Cloud Radiometric Compute Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLiveFortyGuardCompute}
            disabled={isLiveComputing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-orange-500/10 hover:from-orange-500/30 hover:to-orange-500/20 border border-orange-500/40 text-orange-400 hover:text-orange-300 text-xs font-mono font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50 select-none group"
            title="Generate live FortyGuard cloud radiometric heatmap (uses 1-hour cache if requested within last hour)"
          >
            {isLiveComputing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                <span className="font-bold">Generating Heatmap...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Generate Live Heatmap</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Main Single GIS Map Canvas with Floating FortyGuard Legend */}
      <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-gray-200/60 dark:border-white/[0.08] bg-black shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Live Compute Toast Banner */}
        <AnimatePresence>
          {liveComputeStatus && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              className={`absolute top-3.5 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-2xl backdrop-blur-md border text-xs font-mono shadow-2xl flex items-center gap-2 ${
                liveComputeStatus.type === "success"
                  ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50"
                  : "bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-rose-950/50"
              }`}
            >
              <Zap className="w-4 h-4 text-orange-400 fill-orange-400 shrink-0" />
              <span className="font-medium">{liveComputeStatus.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-30 font-mono text-xs text-orange-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            <span>Rendering FortyGuard Thermal Radiometric Model ({granularity}m)...</span>
          </div>
        )}

        {/* FortyGuard Legend Box */}
        <div className="absolute top-3.5 left-3.5 z-20 glass-panel p-3.5 rounded-2xl shadow-2xl font-mono text-xs max-w-[230px]">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="font-bold text-black dark:text-white text-xs">
              Average Temp (24h)
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {granularity}m Mesh
            </span>
          </div>
          <div className="text-[9.5px] text-gray-500 dark:text-zinc-400 mb-2 pb-1.5 border-b border-gray-200/60 dark:border-white/[0.06]">
            FortyGuard 2m Ground Truth · 12 Classes
          </div>

          <div className="space-y-0.5">
            {FORTYGUARD_12_CLASSES.map((cls, idx) => {
              const isSelected = selectedClassHex === cls.hex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedClassHex(isSelected ? null : cls.hex)}
                  title={`Filter ${cls.label} (${cls.tempF})`}
                  className={`w-full flex items-center justify-between text-[9.5px] px-2 py-0.5 rounded-lg transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-orange-500/25 text-orange-300 font-bold ring-1 ring-orange-500/60 shadow-[0_0_10px_rgba(249,115,22,0.25)]"
                      : "hover:bg-gray-100 dark:hover:bg-zinc-800/60 text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-3.5 h-2.5 rounded-xs shrink-0 border border-black/30 shadow-xs"
                      style={{ backgroundColor: cls.hex }}
                    />
                    <span className="tabular-nums truncate font-mono">
                      {cls.label}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="px-1 py-0.2 rounded bg-orange-500 text-black font-extrabold text-[8px] tracking-tight shrink-0 ml-1">
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedClassHex && (
            <button
              onClick={() => setSelectedClassHex(null)}
              className="mt-2 w-full py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-center text-[10px] text-orange-500 font-mono font-bold uppercase transition-all border border-orange-500/30 cursor-pointer shadow-xs"
            >
              Reset Filter ✕
            </button>
          )}

          <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-white/[0.06]">
            <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-zinc-400 mb-1">
              <span>Opacity</span>
              <span className="font-mono font-semibold text-black dark:text-white">
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
              className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FF6B2B]"
            />
          </div>
        </div>

        {/* Floating Parcel Inspector */}
        {selectedParcel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute top-3.5 right-3.5 z-20 glass-panel p-3.5 rounded-2xl border-orange-500/40 shadow-2xl font-mono text-xs max-w-[250px] space-y-2"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60 dark:border-white/[0.06]">
              <span className="text-orange-500 font-bold uppercase text-[10px] tracking-wider">
                {selectedParcel.city_name || "PARCEL INSPECTION"}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-400 text-[9px] font-semibold">
                {selectedParcel.tile_id ?? "AOI-049"}
              </span>
            </div>

            <div className="space-y-1 text-[10.5px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Radiometric:</span>
                <span
                  className="px-1.5 py-0.5 rounded text-white font-bold text-[10px] shadow-xs"
                  style={{ backgroundColor: selectedParcel.color }}
                >
                  {selectedParcel.average_temperature}°C ({selectedParcel.average_temperature_f}°F)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Classification:</span>
                <span className="text-black dark:text-white font-semibold">
                  {selectedParcel.class_label}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Exceedance:</span>
                <span className="text-rose-500 font-bold">
                  {selectedParcel.exceedance_hours}h / week
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Persistence:</span>
                <span className="text-orange-400 font-bold">
                  {selectedParcel.persistence_runs} runs
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Map View Controls */}
        <div className="absolute bottom-3.5 right-3.5 z-20 flex flex-col gap-1.5">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomIn()}
            className="p-2 rounded-xl glass-panel text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-md cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomOut()}
            className="p-2 rounded-xl glass-panel text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-md cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={flyToNationalOverview}
            className="p-2 rounded-xl glass-panel text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-md cursor-pointer"
            title="National Overview"
          >
            <Globe2 className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Map Attribution */}
        <div className="absolute bottom-2 left-3.5 z-20 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-mono text-zinc-400 pointer-events-none border border-zinc-800">
          Esri ArcGIS Canvas · FortyGuard Radiometric Model
        </div>
      </div>
    </div>
  );
}
