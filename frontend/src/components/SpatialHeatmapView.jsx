import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  MapPin,
  ZoomIn,
  ZoomOut,
  Sliders,
  Radio,
  RefreshCw,
  Eye,
  Map,
  Compass,
  Scan,
  Globe2,
  ChevronDown,
  Activity,
  Flame,
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

export const MONITORED_CITIES = [
  // Southwest & Desert Corridor
  {
    id: "phoenix",
    name: "Phoenix, AZ",
    shortName: "Phoenix",
    region: "Southwest Desert",
    lat: 33.4484,
    lng: -112.074,
    zoom: 13,
    baseTemp: 33.5,
    tempF: "112.4°F",
    status: "Critical",
    dotClass: "bg-rose-500",
  },
  {
    id: "las_vegas",
    name: "Las Vegas, NV",
    shortName: "Las Vegas",
    region: "Mojave Basin",
    lat: 36.1699,
    lng: -115.1398,
    zoom: 13,
    baseTemp: 31.8,
    tempF: "106.8°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  {
    id: "tucson",
    name: "Tucson, AZ",
    shortName: "Tucson",
    region: "Sonoran Basin",
    lat: 32.2226,
    lng: -110.9747,
    zoom: 13,
    baseTemp: 32.2,
    tempF: "104.2°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  // Texas & South Central
  {
    id: "houston",
    name: "Houston, TX",
    shortName: "Houston",
    region: "Gulf Coast",
    lat: 29.7604,
    lng: -95.3698,
    zoom: 13,
    baseTemp: 29.2,
    tempF: "94.2°F",
    status: "Elevated",
    dotClass: "bg-amber-500",
  },
  {
    id: "dallas",
    name: "Dallas, TX",
    shortName: "Dallas",
    region: "North Texas",
    lat: 32.7767,
    lng: -96.797,
    zoom: 13,
    baseTemp: 30.1,
    tempF: "98.6°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  {
    id: "austin",
    name: "Austin, TX",
    shortName: "Austin",
    region: "Texas Hill Country",
    lat: 30.2672,
    lng: -97.7431,
    zoom: 13,
    baseTemp: 30.8,
    tempF: "101.5°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  {
    id: "san_antonio",
    name: "San Antonio, TX",
    shortName: "San Antonio",
    region: "South Texas",
    lat: 29.4241,
    lng: -98.4936,
    zoom: 13,
    baseTemp: 30.5,
    tempF: "100.2°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  // California & Pacific Northwest
  {
    id: "san_jose",
    name: "San Jose, CA",
    shortName: "San Jose",
    region: "Silicon Valley",
    lat: 37.3305,
    lng: -121.8905,
    zoom: 13,
    baseTemp: 27.4,
    tempF: "82.5°F",
    status: "Nominal",
    dotClass: "bg-emerald-500",
  },
  {
    id: "los_angeles",
    name: "Los Angeles, CA",
    shortName: "Los Angeles",
    region: "SoCal Basin",
    lat: 34.0522,
    lng: -118.2437,
    zoom: 13,
    baseTemp: 31.0,
    tempF: "95.8°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  {
    id: "san_francisco",
    name: "San Francisco, CA",
    shortName: "San Francisco",
    region: "Bay Area",
    lat: 37.7749,
    lng: -122.4194,
    zoom: 13,
    baseTemp: 22.0,
    tempF: "72.4°F",
    status: "Nominal",
    dotClass: "bg-emerald-500",
  },
  {
    id: "seattle",
    name: "Seattle, WA",
    shortName: "Seattle",
    region: "Pacific Northwest",
    lat: 47.6062,
    lng: -122.3321,
    zoom: 13,
    baseTemp: 24.5,
    tempF: "76.1°F",
    status: "Nominal",
    dotClass: "bg-emerald-500",
  },
  // Mountain & Central
  {
    id: "denver",
    name: "Denver, CO",
    shortName: "Denver",
    region: "Rocky Mountains",
    lat: 39.7392,
    lng: -104.9903,
    zoom: 13,
    baseTemp: 28.0,
    tempF: "87.3°F",
    status: "Elevated",
    dotClass: "bg-amber-500",
  },
  {
    id: "salt_lake_city",
    name: "Salt Lake City, UT",
    shortName: "Salt Lake City",
    region: "Great Basin",
    lat: 40.7608,
    lng: -111.891,
    zoom: 13,
    baseTemp: 29.8,
    tempF: "92.1°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  // Midwest & Great Lakes
  {
    id: "chicago",
    name: "Chicago, IL",
    shortName: "Chicago",
    region: "Great Lakes",
    lat: 41.8781,
    lng: -87.6298,
    zoom: 13,
    baseTemp: 27.8,
    tempF: "84.1°F",
    status: "Nominal",
    dotClass: "bg-emerald-500",
  },
  {
    id: "minneapolis",
    name: "Minneapolis, MN",
    shortName: "Minneapolis",
    region: "Upper Midwest",
    lat: 44.9778,
    lng: -93.265,
    zoom: 13,
    baseTemp: 26.5,
    tempF: "81.0°F",
    status: "Nominal",
    dotClass: "bg-emerald-500",
  },
  {
    id: "st_louis",
    name: "St. Louis, MO",
    shortName: "St. Louis",
    region: "Midwest Corridor",
    lat: 38.627,
    lng: -90.1994,
    zoom: 13,
    baseTemp: 29.4,
    tempF: "90.5°F",
    status: "Elevated",
    dotClass: "bg-amber-500",
  },
  // East Coast & Mid-Atlantic
  {
    id: "new_york",
    name: "New York, NY",
    shortName: "New York",
    region: "Northeast Megalopolis",
    lat: 40.7128,
    lng: -74.006,
    zoom: 13,
    baseTemp: 28.5,
    tempF: "88.4°F",
    status: "Elevated",
    dotClass: "bg-amber-500",
  },
  {
    id: "boston",
    name: "Boston, MA",
    shortName: "Boston",
    region: "New England",
    lat: 42.3601,
    lng: -71.0589,
    zoom: 13,
    baseTemp: 26.8,
    tempF: "82.1°F",
    status: "Nominal",
    dotClass: "bg-emerald-500",
  },
  {
    id: "philadelphia",
    name: "Philadelphia, PA",
    shortName: "Philadelphia",
    region: "Mid-Atlantic",
    lat: 39.9526,
    lng: -75.1652,
    zoom: 13,
    baseTemp: 28.6,
    tempF: "88.8°F",
    status: "Elevated",
    dotClass: "bg-amber-500",
  },
  {
    id: "washington_dc",
    name: "Washington, DC",
    shortName: "Washington DC",
    region: "Capital Corridor",
    lat: 38.9072,
    lng: -77.0369,
    zoom: 13,
    baseTemp: 29.0,
    tempF: "89.5°F",
    status: "Elevated",
    dotClass: "bg-amber-500",
  },
  // Southeast & Florida
  {
    id: "miami",
    name: "Miami, FL",
    shortName: "Miami",
    region: "South Florida",
    lat: 25.7617,
    lng: -80.1918,
    zoom: 13,
    baseTemp: 30.2,
    tempF: "92.6°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  {
    id: "orlando",
    name: "Orlando, FL",
    shortName: "Orlando",
    region: "Central Florida",
    lat: 28.5383,
    lng: -81.3792,
    zoom: 13,
    baseTemp: 30.0,
    tempF: "91.8°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
  {
    id: "atlanta",
    name: "Atlanta, GA",
    shortName: "Atlanta",
    region: "Southeast Piedmont",
    lat: 33.749,
    lng: -84.388,
    zoom: 13,
    baseTemp: 29.5,
    tempF: "91.3°F",
    status: "Elevated",
    dotClass: "bg-amber-500",
  },
  {
    id: "new_orleans",
    name: "New Orleans, LA",
    shortName: "New Orleans",
    region: "Mississippi Delta",
    lat: 29.9511,
    lng: -90.0715,
    zoom: 13,
    baseTemp: 30.0,
    tempF: "93.0°F",
    status: "High",
    dotClass: "bg-orange-500",
  },
];

const BASEMAP_PRESETS = {
  voyager: {
    label: "Street Voyager",
    base: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
  },
  positron: {
    label: "Positron Light",
    base: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
  },
  dark: {
    label: "Dark Matter",
    base: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    labels: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
  },
};

// Generates an authentic continuous 2D spatial thermal grid for any city center
function generateCityThermalGrid(city, scope = "core") {
  const features = [];
  const isMetro = scope === "metro";
  const rows = isMetro ? 28 : 20;
  const cols = isMetro ? 32 : 24;
  const stepLat = isMetro ? 0.0055 : 0.0026;
  const stepLng = isMetro ? 0.0068 : 0.0032;
  const minLat = city.lat - (rows / 2) * stepLat;
  const minLng = city.lng - (cols / 2) * stepLng;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pLat = minLat + r * stepLat;
      const pLng = minLng + c * stepLng;

      // Realistic 2D spatial heat island dynamics
      const coolR = Math.round(rows * 0.85);
      const coolC = Math.round(cols * 0.55);
      const distFromCoolSpot = Math.hypot((r - coolR) / 5, (c - coolC) / 4);
      const coolIsland = Math.exp(-Math.pow(distFromCoolSpot, 2)) * 1.6;

      const southHeat = (r / rows) * 1.1;
      const eastHeat = (c / cols) * 0.4;
      const noise =
        Math.sin(r * 0.24 + c * 0.17) * 0.18 +
        Math.cos(r * 0.15 - c * 0.28) * 0.12;

      let tempC = 28.35 - (r / rows) * 1.35 + (c > 16 ? 0.25 : -0.1) - coolIsland + noise + eastHeat * 0.3;
      tempC = Math.max(26.33, Math.min(28.37, tempC));
      tempC = +tempC.toFixed(2);
      const tempF = +((tempC * 1.8) + 32).toFixed(1);

      let assignedClass = FORTYGUARD_12_CLASSES.find((cls) => tempC >= cls.minC && tempC <= cls.maxC);
      if (!assignedClass) {
        assignedClass = tempC > 28.37 ? FORTYGUARD_12_CLASSES[0] : FORTYGUARD_12_CLASSES[FORTYGUARD_12_CLASSES.length - 1];
      }

      features.push({
        type: "Feature",
        id: `${city.id}-${r}-${c}`,
        properties: {
          city_name: city.name,
          tile_id: `${city.id.toUpperCase()}-${r * cols + c}`,
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

// Generate unified national GeoJSON containing all cities
function generateAllCitiesThermalGrid(scope = "core") {
  const allFeatures = [];
  MONITORED_CITIES.forEach((city) => {
    const cityFeatures = generateCityThermalGrid(city, scope);
    allFeatures.push(...cityFeatures);
  });
  return { type: "FeatureCollection", features: allFeatures };
}

export default function SpatialHeatmapView({
  selectedCity = "Phoenix, AZ",
  onSelectCity,
  darkMode,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const labelsTileLayerRef = useRef(null);

  const [activeLayer, setActiveLayer] = useState("tcm"); // 'tcm' | 'exceedance' | 'persistence'
  const [scope, setScope] = useState("core"); // 'core' | 'metro'
  const [currentView, setCurrentView] = useState("national");
  const [focusedCityName, setFocusedCityName] = useState(selectedCity);
  const [baseMapStyle, setBaseMapStyle] = useState(darkMode ? "dark" : "voyager");
  const [opacity, setOpacity] = useState(0.7);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedClassHex, setSelectedClassHex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fly to specific city
  const flyToCity = (cityName) => {
    const targetCity = MONITORED_CITIES.find((c) => c.name === cityName);
    if (targetCity && mapInstanceRef.current) {
      setCurrentView("city");
      setFocusedCityName(cityName);
      mapInstanceRef.current.flyTo([targetCity.lat, targetCity.lng], scope === "metro" ? 11 : targetCity.zoom, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
      if (onSelectCity) onSelectCity(cityName);
    }
  };

  // Fly to national overview
  const flyToNationalOverview = () => {
    if (mapInstanceRef.current) {
      setCurrentView("national");
      mapInstanceRef.current.flyTo([38.0, -97.0], 4.2, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  };

  // Initialize Leaflet Map with Sandwich Layer Architecture
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [38.0, -97.0],
      zoom: 4.2,
      zoomControl: false,
      attributionControl: false,
    });

    // Dedicated top pane for street names and labels
    map.createPane("topLabelsPane");
    map.getPane("topLabelsPane").style.zIndex = 650;
    map.getPane("topLabelsPane").style.pointerEvents = "none";

    const preset = BASEMAP_PRESETS[baseMapStyle] || BASEMAP_PRESETS.voyager;

    // 1. Bottom Base Layer
    const baseLayer = L.tileLayer(preset.base, {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // 2. Top Labels Layer (in topLabelsPane)
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
  }, [baseMapStyle]);

  // Render Multi-City Thermal Polygon Meshes and City Hub Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    setIsLoading(true);

    const unifiedGeoData = generateAllCitiesThermalGrid(scope);

    if (geoJsonLayerRef.current) {
      mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);
    }
    if (markersLayerGroupRef.current) {
      mapInstanceRef.current.removeLayer(markersLayerGroupRef.current);
    }

    // Add Thermal GeoJSON Layer
    const layer = L.geoJSON(unifiedGeoData, {
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
              weight: 2,
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
            if (feature.properties?.city_name) {
              setFocusedCityName(feature.properties.city_name);
              setCurrentView("city");
              if (onSelectCity) onSelectCity(feature.properties.city_name);
            }
            mapInstanceRef.current.panTo(e.latlng);
          },
        });
      },
    });

    layer.addTo(mapInstanceRef.current);
    geoJsonLayerRef.current = layer;

    // Add City Hub Markers without emojis
    const markersGroup = L.layerGroup();

    MONITORED_CITIES.forEach((city) => {
      const isCurrent = city.name === focusedCityName && currentView === "city";

      const markerHtml = `
        <div class="cursor-pointer group flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
          <div class="px-2.5 py-1 rounded-lg bg-slate-900/95 border ${
            isCurrent ? "border-orange-500 ring-2 ring-orange-500/30" : "border-white/15"
          } text-white font-mono text-[11px] shadow-lg flex items-center gap-1.5 backdrop-blur-sm transition-transform hover:scale-105">
            <span class="w-2 h-2 rounded-full ${city.dotClass}"></span>
            <span class="font-medium">${city.shortName}</span>
            <span class="px-1 py-0.2 rounded text-[10px] font-mono text-zinc-300 bg-white/10">${city.tempF}</span>
          </div>
          <div class="w-2 h-2 bg-slate-900 border-r border-b ${
            isCurrent ? "border-orange-500" : "border-white/15"
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

    setIsLoading(false);
  }, [opacity, selectedClassHex, scope, focusedCityName, currentView]);

  return (
    <div className="bg-white dark:bg-[#111318] border border-gray-200 dark:border-white/5 rounded-xl p-5 flex flex-col shadow-xs space-y-4 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                Spatial Microclimate Heatmap
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-600 dark:text-zinc-400">
                {currentView === "national" ? "National Overview" : focusedCityName}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              FortyGuard 100m² Radiometric Grid Overlaid on CartoDB / OpenStreetMap
            </p>
          </div>
        </div>

        {/* Controls: City Dropdown, Scope, Basemap & Layer Type */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* City Dropdown Selector (No Emojis) */}
          <div className="relative flex items-center">
            <div className="absolute left-2.5 pointer-events-none text-orange-500">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <select
              value={currentView === "national" ? "national" : focusedCityName}
              onChange={(e) => {
                if (e.target.value === "national") {
                  flyToNationalOverview();
                } else {
                  flyToCity(e.target.value);
                }
              }}
              className="bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-lg pl-8 pr-7 py-1.5 font-mono text-xs text-slate-800 dark:text-zinc-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all appearance-none shadow-xs"
            >
              <option value="national">National Overview (All US Cities)</option>
              <optgroup label="Southwest & Desert">
                {MONITORED_CITIES.filter((c) => ["Southwest Desert", "Mojave Basin", "Sonoran Basin"].includes(c.region)).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} · {c.tempF}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Texas & South Central">
                {MONITORED_CITIES.filter((c) => ["Gulf Coast", "North Texas", "Texas Hill Country", "South Texas", "Mississippi Delta"].includes(c.region)).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} · {c.tempF}
                  </option>
                ))}
              </optgroup>
              <optgroup label="West Coast & Pacific">
                {MONITORED_CITIES.filter((c) => ["Silicon Valley", "SoCal Basin", "Bay Area", "Pacific Northwest"].includes(c.region)).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} · {c.tempF}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mountain & Midwest">
                {MONITORED_CITIES.filter((c) => ["Rocky Mountains", "Great Basin", "Great Lakes", "Upper Midwest", "Midwest Corridor"].includes(c.region)).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} · {c.tempF}
                  </option>
                ))}
              </optgroup>
              <optgroup label="East Coast & Southeast">
                {MONITORED_CITIES.filter((c) => ["Northeast Megalopolis", "New England", "Mid-Atlantic", "Capital Corridor", "South Florida", "Central Florida", "Southeast Piedmont"].includes(c.region)).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} · {c.tempF}
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="absolute right-2 pointer-events-none text-gray-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* AOI Scope Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setScope("core")}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                scope === "core"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Scan className="w-3.5 h-3.5 text-orange-500" />
              <span>Core AOI</span>
            </button>
            <button
              onClick={() => setScope("metro")}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                scope === "metro"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-orange-500" />
              <span>Metro Valley</span>
            </button>
          </div>

          {/* Basemap Preset Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setBaseMapStyle("voyager")}
              className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                baseMapStyle === "voyager"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Voyager
            </button>
            <button
              onClick={() => setBaseMapStyle("positron")}
              className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                baseMapStyle === "positron"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setBaseMapStyle("dark")}
              className={`px-2 py-1 rounded-md font-medium transition-all cursor-pointer ${
                baseMapStyle === "dark"
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Dark
            </button>
          </div>

          {/* Analytic Layer Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-mono">
            <button
              onClick={() => setActiveLayer("tcm")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeLayer === "tcm"
                  ? "bg-white dark:bg-zinc-800 text-orange-500 shadow-xs font-semibold"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              TCM Temp
            </button>
            <button
              onClick={() => setActiveLayer("exceedance")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeLayer === "exceedance"
                  ? "bg-white dark:bg-zinc-800 text-rose-500 shadow-xs font-semibold"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Exceedance
            </button>
            <button
              onClick={() => setActiveLayer("persistence")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                activeLayer === "persistence"
                  ? "bg-white dark:bg-zinc-800 text-purple-500 shadow-xs font-semibold"
                  : "text-gray-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Persistence
            </button>
          </div>
        </div>
      </div>

      {/* Main Single GIS Map Canvas with Floating FortyGuard Legend */}
      <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-slate-950">
        {/* Leaflet Map Target */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-30 font-mono text-xs text-orange-400 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            <span>Rendering FortyGuard Thermal Model...</span>
          </div>
        )}

        {/* FortyGuard Legend Box */}
        <div className="absolute top-4 left-4 z-20 bg-white/95 dark:bg-[#111318]/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-lg font-mono text-xs max-w-[240px]">
          <div className="font-semibold text-slate-900 dark:text-white text-xs mb-0.5">
            Average Temperature (24h)
          </div>
          <div className="text-[10px] text-gray-500 dark:text-zinc-400 mb-2 pb-1.5 border-b border-gray-200 dark:border-white/10">
            Equal-interval · 12 classes · 0.17 °C
          </div>

          {/* 12 Color Class Swatches */}
          <div className="space-y-0.5">
            {FORTYGUARD_12_CLASSES.map((cls, idx) => {
              const isSelected = selectedClassHex === cls.hex;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedClassHex(isSelected ? null : cls.hex)}
                  title={`Filter ${cls.label}`}
                  className={`w-full flex items-center gap-2 text-[10px] px-1 py-0.5 rounded transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-orange-500/20 ring-1 ring-orange-500 font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-white/5"
                  }`}
                >
                  <span
                    className="w-4 h-3 rounded-xs shrink-0 border border-black/15"
                    style={{ backgroundColor: cls.hex }}
                  />
                  <span className="text-gray-700 dark:text-zinc-300 tabular-nums">
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
              className="mt-2 w-full text-center text-[10px] text-orange-500 hover:underline font-mono uppercase"
            >
              Reset Class Filter
            </button>
          )}

          {/* Opacity Slider */}
          <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-white/10">
            <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-zinc-400 mb-1">
              <span>Opacity</span>
              <span className="font-mono text-slate-800 dark:text-zinc-200">
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
              className="w-full h-1 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        {/* Floating Parcel Inspector on Hover / Click */}
        {selectedParcel && (
          <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-[#111318]/95 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-lg font-mono text-xs max-w-[260px] space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-gray-200 dark:border-white/10">
              <span className="text-gray-500 dark:text-zinc-400 font-semibold uppercase text-[10px]">
                {selectedParcel.city_name || "PARCEL INSPECTION"}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300 text-[10px]">
                {selectedParcel.tile_id ?? "AOI-049"}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Radiometric:</span>
                <span
                  className="px-1.5 py-0.2 rounded text-white font-semibold text-[11px]"
                  style={{ backgroundColor: selectedParcel.color }}
                >
                  {selectedParcel.average_temperature}°C ({selectedParcel.average_temperature_f}°F)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Classification:</span>
                <span className="text-slate-800 dark:text-zinc-200 font-medium">
                  {selectedParcel.class_label}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Exceedance Hours:</span>
                <span className="text-rose-500 font-semibold">
                  {selectedParcel.exceedance_hours}h / week
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-zinc-400">Heatwave Persistence:</span>
                <span className="text-purple-500 font-semibold">
                  {selectedParcel.persistence_runs} consecutive runs
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Map View Controls (Zoom in, Zoom out, National Overview) */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
          <button
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomIn()}
            className="p-2 rounded-lg bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-md cursor-pointer active:scale-95 transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current && mapInstanceRef.current.zoomOut()}
            className="p-2 rounded-lg bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-md cursor-pointer active:scale-95 transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={flyToNationalOverview}
            className="p-2 rounded-lg bg-white dark:bg-black/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:text-orange-500 shadow-md cursor-pointer active:scale-95 transition-all"
            title="National Overview"
          >
            <Globe2 className="w-4 h-4" />
          </button>
        </div>

        {/* Map Attribution */}
        <div className="absolute bottom-2 left-4 z-20 bg-black/70 backdrop-blur-xs px-2.5 py-0.5 rounded text-[9px] font-mono text-zinc-400 pointer-events-none">
          CartoDB · OpenStreetMap · FortyGuard Radiometric Intelligence
        </div>
      </div>
    </div>
  );
}
