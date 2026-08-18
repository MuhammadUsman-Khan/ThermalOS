import { useState, useEffect, useRef } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  FileCheck,
  Zap,
  Flame,
  Droplets,
  Sun,
  Moon,
  ChevronDown,
  RefreshCw,
  Clock,
  Thermometer,
  Radio,
  Globe,
  MapPin,
  Check,
  AlertOctagon,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import KPICard from "./components/KPICard";
import RadialGauge from "./components/RadialGauge";
import AgentVisualization from "./components/AgentVisualization";
import SurfaceSegmentationCard from "./components/SurfaceSegmentationCard";
import SpatialHeatmapView, { MONITORED_CITIES } from "./components/SpatialHeatmapView";
import DiurnalTimelineScrubber from "./components/DiurnalTimelineScrubber";
import NationalThermalGridMatrix from "./components/NationalThermalGridMatrix";
import AgentEventLog from "./components/AgentEventLog";
import AgentOneModal from "./components/AgentOneModal";
import AgentTwoModal from "./components/AgentTwoModal";
import AgentThreeModal from "./components/AgentThreeModal";
import Toast from "./components/Toast";

const API_BASE = "http://localhost:8000";

const REGIONS = [
  "Southwest & Desert",
  "Texas & South Central",
  "West Coast & Pacific",
  "Mountain & Midwest",
  "East Coast & Southeast",
];

export default function App() {
  const [activeTab, setActiveTab] = useState("operations"); // 'operations' | 'spatial_heatmap' | 'diurnal_sim' | 'national_grid'
  const [selectedCity, setSelectedCity] = useState("Phoenix, AZ");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [telemetryData, setTelemetryData] = useState([]);
  const [currentReading, setCurrentReading] = useState(null);
  const [surfaceTemp, setSurfaceTemp] = useState(117.3);
  const [currentTemp, setCurrentTemp] = useState(104);
  const [solarGhi, setSolarGhi] = useState(604.5);
  const [humidity, setHumidity] = useState(13.0);
  const [wbgt, setWbgt] = useState(86.7);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditError, setAuditError] = useState(null);

  const [isInfraModalOpen, setIsInfraModalOpen] = useState(false);
  const [isInfraLoading, setIsInfraLoading] = useState(false);
  const [infraData, setInfraData] = useState(null);
  const [infraError, setInfraError] = useState(null);

  const [isCivicModalOpen, setIsCivicModalOpen] = useState(false);
  const [isCivicLoading, setIsCivicLoading] = useState(false);
  const [civicData, setCivicData] = useState(null);
  const [civicError, setCivicError] = useState(null);

  const [uptimeSeconds, setUptimeSeconds] = useState(5040);
  const [logs, setLogs] = useState([]);

  const [agentStates, setAgentStates] = useState({
    agent1: "idle",
    agent2: "idle",
    agent3: "idle",
  });

  const dropdownRef = useRef(null);

  // Sync dark mode class on html tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // System uptime counter
  useEffect(() => {
    const timer = setInterval(() => setUptimeSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };
  const uptime = formatUptime(uptimeSeconds);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const addLog = (message, type = "normal", source = "Telemetry") => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [{ id: Date.now() + Math.random(), time, message, type, source }, ...prev]);
  };

  // Switch City Handler
  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setIsDropdownOpen(false);
    showToast(`Switched telemetry focus to ${city}`, "info");
    addLog(`Target AOI updated to ${city}`, "city_change", "Grid Focus");
    fetchTelemetry(city);
  };

  // Fetch telemetry for city
  const fetchTelemetry = async (city) => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry?city=${encodeURIComponent(city)}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentReading(data);
        if (data.temperature_f) setCurrentTemp(data.temperature_f);
        if (data.surface_temp_f) setSurfaceTemp(data.surface_temp_f);
        if (data.ghi_w_m2) setSolarGhi(data.ghi_w_m2);
        if (data.humidity_pct) setHumidity(data.humidity_pct);
        if (data.wbgt_f) setWbgt(data.wbgt_f);
        if (data.alert_level === "CRITICAL" || data.alert_level === "EXTREME") {
          setIsEmergencyMode(true);
        } else {
          setIsEmergencyMode(false);
        }
      }
    } catch (e) {
      console.warn("Using offline microclimate model for", city);
    }
  };

  // Seed initial rolling chart telemetry
  useEffect(() => {
    const initialPoints = [];
    const baseTime = Date.now() - 30 * 4000;
    for (let i = 0; i < 30; i++) {
      const t = new Date(baseTime + i * 4000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const ambient = 104 + Math.sin(i * 0.2) * 2;
      const surface = 117 + Math.sin(i * 0.25) * 3.5;
      initialPoints.push({
        time: t,
        ambient: +ambient.toFixed(1),
        surface: +surface.toFixed(1),
      });
    }
    setTelemetryData(initialPoints);
    fetchTelemetry(selectedCity);
  }, []);

  // Rolling Telemetry Interval (Every 3.5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setTelemetryData((prev) => {
        const last = prev[prev.length - 1] || { ambient: 104, surface: 117 };
        const ambientNoise = (Math.random() - 0.5) * 0.8;
        const surfaceNoise = (Math.random() - 0.5) * 1.4;

        const nextAmbient = +(last.ambient + ambientNoise).toFixed(1);
        const nextSurface = +(last.surface + surfaceNoise).toFixed(1);

        setCurrentTemp(nextAmbient);
        setSurfaceTemp(nextSurface);

        const newPoint = {
          time: timeStr,
          ambient: nextAmbient,
          surface: nextSurface,
        };

        const updated = [...prev.slice(1), newPoint];
        return updated;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedCity]);

  // Agent 1: Thermal Audit Action
  const handleRunAudit = async () => {
    setIsAuditModalOpen(true);
    setIsAuditLoading(true);
    setAuditError(null);
    setAgentStates((prev) => ({ ...prev, agent1: "working" }));
    addLog(`Agent 1: ASHRAE 55 & Building Envelope Audit initiated for ${selectedCity}`, "audit", "Agent 1");

    try {
      const res = await fetch(`${API_BASE}/api/audit?city=${encodeURIComponent(selectedCity)}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAuditData(data);
      setAgentStates((prev) => ({ ...prev, agent1: "success" }));
      addLog(`Agent 1: Audit report generated with ${data.mitigation_options?.length || 3} actionable strategies`, "audit", "Agent 1");
      showToast("Thermal audit completed successfully", "success");
    } catch (err) {
      setAuditError(err.message);
      setAgentStates((prev) => ({ ...prev, agent1: "idle" }));
    } finally {
      setIsAuditLoading(false);
    }
  };

  // Agent 2: HVAC Pre-Cool Action
  const handleRunInfrastructure = async () => {
    setIsInfraModalOpen(true);
    setIsInfraLoading(true);
    setInfraError(null);
    setAgentStates((prev) => ({ ...prev, agent2: "working" }));
    addLog(`Agent 2: HVAC Chiller Plant Pre-Cool load shift dispatched for ${selectedCity}`, "dispatch", "Agent 2");

    try {
      const res = await fetch(`${API_BASE}/api/infrastructure/precool?city=${encodeURIComponent(selectedCity)}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInfraData(data);
      setAgentStates((prev) => ({ ...prev, agent2: "success" }));
      addLog(`Agent 2: Thermal storage charged. Peak power shaved by ${data.estimated_peak_kw_reduction || 420} kW`, "dispatch", "Agent 2");
      showToast("HVAC Pre-Cool dispatch active", "success");
    } catch (err) {
      setInfraError(err.message);
      setAgentStates((prev) => ({ ...prev, agent2: "idle" }));
    } finally {
      setIsInfraLoading(false);
    }
  };

  // Agent 3: Civic & Public Health Override Action
  const handleRunCivic = async () => {
    setIsCivicModalOpen(true);
    setIsCivicLoading(true);
    setCivicError(null);
    setAgentStates((prev) => ({ ...prev, agent3: "working" }));
    addLog(`Agent 3: WBGT Thermodynamic Public Health Override triggered for ${selectedCity}`, "extreme", "Agent 3");

    try {
      const res = await fetch(`${API_BASE}/api/civic/override?city=${encodeURIComponent(selectedCity)}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCivicData(data);
      setAgentStates((prev) => ({ ...prev, agent3: "alert" }));
      setIsEmergencyMode(true);
      addLog(`Agent 3: OSHA/ACGIH Extreme Heat warning broadcasted to municipal grid`, "extreme", "Agent 3");
      showToast("Civic Heat Advisory dispatched", "warning");
    } catch (err) {
      setCivicError(err.message);
      setAgentStates((prev) => ({ ...prev, agent3: "idle" }));
    } finally {
      setIsCivicLoading(false);
    }
  };

  const surfaceDelta = Math.max(0, surfaceTemp - currentTemp);

  const filteredDropdownCities = MONITORED_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
      c.region.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  return (
    <div className={`min-h-[100dvh] flex flex-col font-sans transition-colors ${darkMode ? "bg-[#090A0D] text-zinc-100" : "bg-[#F9FAFB] text-black"}`}>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Agent Modals */}
      <AgentOneModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setAgentStates((prev) => ({ ...prev, agent1: "idle" }));
        }}
        city={selectedCity}
        loading={isAuditLoading}
        error={auditError}
        data={auditData}
      />

      <AgentTwoModal
        isOpen={isInfraModalOpen}
        onClose={() => {
          setIsInfraModalOpen(false);
          setAgentStates((prev) => ({ ...prev, agent2: "idle" }));
        }}
        city={selectedCity}
        loading={isInfraLoading}
        error={infraError}
        data={infraData}
      />

      <AgentThreeModal
        isOpen={isCivicModalOpen}
        onClose={() => {
          setIsCivicModalOpen(false);
          setAgentStates((prev) => ({ ...prev, agent3: "idle" }));
        }}
        city={selectedCity}
        loading={isCivicLoading}
        error={civicError}
        data={civicData}
      />

      {/* Executive Topbar */}
      <header className="border-b border-gray-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#090A0D]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-2.5 transition-colors">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 12, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)] cursor-pointer"
            >
              <Flame className="w-4 h-4" />
            </motion.div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-black dark:text-white font-display">
                ThermalOS
              </h1>
              <span className="text-xs text-gray-300 dark:text-zinc-700 font-mono">/</span>
              <span className="text-xs font-mono text-orange-500 font-medium tracking-tight">
                FortyGuard Radiometric Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Eye-Catching Autonomous Agent Dispatch Triggers */}
            <div className="flex items-center gap-2">
              {/* Agent 1: Audit */}
              <motion.button
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleRunAudit}
                disabled={isAuditLoading}
                className="group relative px-3 py-1.5 rounded-xl font-medium bg-gradient-to-b from-gray-50 to-white dark:from-[#131720] dark:to-[#0D1016] border border-amber-500/30 hover:border-amber-500/70 hover:shadow-[0_0_14px_rgba(245,158,11,0.25)] text-gray-800 dark:text-zinc-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/15 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                  {isAuditLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-xs font-bold font-sans tracking-tight text-black dark:text-white group-hover:text-amber-400 transition-colors">
                    Audit
                  </span>
                  <span className="text-[8.5px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    Agent 1
                  </span>
                </div>
              </motion.button>

              {/* Agent 2: Pre-Cool */}
              <motion.button
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleRunInfrastructure}
                disabled={isInfraLoading}
                className="group relative px-3 py-1.5 rounded-xl font-medium bg-gradient-to-b from-gray-50 to-white dark:from-[#131720] dark:to-[#0D1016] border border-cyan-500/30 hover:border-cyan-500/70 hover:shadow-[0_0_14px_rgba(6,182,212,0.25)] text-gray-800 dark:text-zinc-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                  {isInfraLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-xs font-bold font-sans tracking-tight text-black dark:text-white group-hover:text-cyan-400 transition-colors">
                    Pre-Cool
                  </span>
                  <span className="text-[8.5px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    Agent 2
                  </span>
                </div>
              </motion.button>

              {/* Agent 3: Civic Alert */}
              <motion.button
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleRunCivic}
                disabled={isCivicLoading}
                className="group relative px-3 py-1.5 rounded-xl font-medium bg-gradient-to-b from-gray-50 to-white dark:from-[#131720] dark:to-[#0D1016] border border-rose-500/30 hover:border-rose-500/70 hover:shadow-[0_0_14px_rgba(244,63,94,0.3)] text-gray-800 dark:text-zinc-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-rose-500/15 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  {isCivicLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <AlertOctagon className="w-3 h-3" />}
                </div>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-xs font-bold font-sans tracking-tight text-black dark:text-white group-hover:text-rose-400 transition-colors">
                    Civic Alert
                  </span>
                  <span className="text-[8.5px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    Agent 3
                  </span>
                </div>
              </motion.button>
            </div>

            {/* Live Telemetry Radar Pulse */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isEmergencyMode ? "bg-rose-500 animate-ping" : "bg-emerald-500 animate-radar-ping"}`} />
              <span className={isEmergencyMode ? "text-rose-500 font-semibold" : "text-emerald-500 font-medium"}>
                {isEmergencyMode ? "Advisory Active" : `Live · ${uptime}`}
              </span>
            </div>

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-orange-500 hover:border-orange-500/30 transition-colors shadow-xs cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </motion.button>

            {/* High-End Searchable City Dropdown */}
            <div ref={dropdownRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700/80 hover:border-orange-500/50 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-black dark:text-white shadow-xs font-mono group"
              >
                <MapPin className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">{selectedCity}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180 text-orange-500" : ""}`}
                />
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    className="absolute top-full mt-2 right-0 w-72 bg-white/95 dark:bg-[#0E1015]/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-80 font-mono text-xs"
                  >
                    {/* Top edge gradient glow */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100 dark:border-zinc-800/80 relative">
                      <Search className="w-3.5 h-3.5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search city..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg pl-7 pr-6 py-1 text-xs text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/50"
                        autoFocus
                      />
                      {dropdownSearch && (
                        <button
                          onClick={() => setDropdownSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Options List */}
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                      {REGIONS.map((region) => {
                        const regionCities = filteredDropdownCities.filter((c) => c.region === region);
                        if (regionCities.length === 0) return null;

                        return (
                          <div key={region} className="pt-1">
                            <div className="px-3 py-0.5 text-[9.5px] font-semibold text-orange-500/80 uppercase tracking-wider">
                              {region}
                            </div>
                            {regionCities.map((c) => {
                              const isSelected = selectedCity === c.name;

                              return (
                                <button
                                  key={c.id}
                                  onClick={() => handleSelectCity(c.name)}
                                  className={`w-full px-3 py-1.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-orange-500/15 text-orange-400 font-semibold border-l-2 border-orange-500"
                                      : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60 hover:text-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${c.dotClass}`} />
                                    <span>{c.name}</span>
                                  </div>
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-mono">
                                    {c.tempF}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Canvas */}
      <main className="w-full max-w-7xl mx-auto px-4 py-4 flex-1 flex flex-col space-y-4 relative z-10">
        {/* Segmented Navigation Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-mono w-fit">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("operations")}
            className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "operations"
                ? "bg-orange-500 text-black font-bold shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                : "text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Operations Console</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("spatial_heatmap")}
            className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "spatial_heatmap"
                ? "bg-orange-500 text-black font-bold shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                : "text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Spatial Heatmap</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("diurnal_sim")}
            className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "diurnal_sim"
                ? "bg-orange-500 text-black font-bold shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                : "text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Diurnal Forecaster</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("national_grid")}
            className={`px-3.5 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "national_grid"
                ? "bg-orange-500 text-black font-bold shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                : "text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>National Grid Matrix</span>
          </motion.button>
        </div>

        {/* Dynamic Animated Tab View Routing */}
        <AnimatePresence mode="wait">
          {/* Tab 1: Operations Console */}
          {activeTab === "operations" && (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="space-y-4"
            >
              {/* 4-Card Mission Control Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Surface vs Ambient Temp */}
                <KPICard
                  label="Surface Temperature"
                  icon={<Thermometer className="w-4 h-4" />}
                  accentColor="text-orange-500"
                  borderHover="hover:border-orange-500/40"
                  value={surfaceTemp.toFixed(1)}
                  unit="°F"
                  valueSuffix={
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ml-1.5 mb-1 bg-orange-500/15 text-orange-500 border border-orange-500/30">
                      +{surfaceDelta.toFixed(1)}°F ΔT
                    </span>
                  }
                  darkMode={darkMode}
                  sparkStroke="#FF6B2B"
                  sparkGradientId="sparkOrangeGrad"
                  sparkPath="M0,24 Q15,6 32,18 T65,10 T95,14 L110,8"
                  delay={0}
                  footer={
                    <span>
                      Ambient Air: <strong className="text-black dark:text-white font-medium">{currentTemp}°F</strong>
                    </span>
                  }
                />

                {/* 2. Solar Irradiance GHI */}
                <KPICard
                  label="Solar Irradiance (GHI)"
                  icon={<Sun className="w-4 h-4" />}
                  accentColor="text-amber-500"
                  borderHover="hover:border-amber-500/40"
                  value={solarGhi.toFixed(0)}
                  unit="W/m²"
                  valueSuffix={
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ml-1.5 mb-1 bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {solarGhi >= 600 ? "Peak Flux" : "Nominal"}
                    </span>
                  }
                  darkMode={darkMode}
                  sparkStroke="#F59E0B"
                  sparkGradientId="sparkAmberGrad"
                  sparkPath="M0,28 Q20,12 45,20 T80,8 T100,16 L110,10"
                  delay={0.06}
                  footer={
                    <span>
                      Clear Sky DNI: <strong className="text-black dark:text-white font-medium">{(solarGhi * 1.3).toFixed(0)} W/m²</strong>
                    </span>
                  }
                />

                {/* 3. Relative Humidity */}
                <KPICard
                  label="Relative Humidity"
                  icon={<Droplets className="w-4 h-4" />}
                  accentColor="text-cyan-500"
                  borderHover="hover:border-cyan-500/40"
                  value={humidity.toFixed(1)}
                  unit="%"
                  valueSuffix={
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ml-1.5 mb-1 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      {humidity > 50 ? "Elevated" : "Nominal"}
                    </span>
                  }
                  darkMode={darkMode}
                  sparkStroke="#06B6D4"
                  sparkGradientId="sparkCyanGrad"
                  sparkPath="M0,16 Q25,24 50,14 T85,20 T105,10 L110,14"
                  delay={0.12}
                  footer={
                    <span>
                      Wet-Bulb: <strong className="text-cyan-400 font-medium">{currentReading?.wet_bulb_f ? `${currentReading.wet_bulb_f.toFixed(1)}°F` : "74.1°F"}</strong>
                    </span>
                  }
                />

                {/* 4. Real-Time WBGT with Radial Gauge */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.18, ease: [0.25, 1, 0.5, 1] }}
                  whileHover={{ y: -2.5, transition: { duration: 0.15 } }}
                  className="bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-between shadow-xs transition-all hover:border-orange-500/40"
                >
                  <RadialGauge
                    value={wbgt}
                    min={60}
                    max={100}
                    threshold={85}
                    unit="°F"
                    label="Liljegren WBGT Index"
                    size={120}
                  />
                  <div className="w-full flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800/80 font-mono text-[10px] text-gray-500 dark:text-zinc-400">
                    <span>Advisory Limit: <strong className="text-rose-500 font-semibold">85.0°F</strong></span>
                    <span className={wbgt >= 85 ? "text-rose-500 font-semibold" : "text-emerald-500 font-medium"}>
                      {wbgt >= 85 ? "Triggered" : "Nominal"}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Workspace Row: Telemetry Chart + Dispatch Log */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                {/* Telemetry chart */}
                <div className="lg:col-span-8 bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-zinc-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-orange-500" />
                        <h2 className="font-display text-sm font-bold tracking-tight text-black dark:text-white">
                          Thermal Telemetry Stream · {selectedCity}
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Real-time surface radiometric vs. ambient canopy temperature (rolling window)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-gray-600 dark:text-zinc-400">Surface (°F)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-gray-600 dark:text-zinc-400">Ambient (°F)</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-72 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={telemetryData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="surfaceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6B2B" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#FF6B2B" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <XAxis
                          dataKey="time"
                          stroke={darkMode ? "#27272a" : "#e2e8f0"}
                          tick={{ fill: darkMode ? "#71717a" : "#64748b", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                          tickLine={false}
                          axisLine={{ stroke: darkMode ? "#27272a" : "#e2e8f0" }}
                          interval="preserveStartEnd"
                          minTickGap={28}
                        />

                        <YAxis
                          domain={[75, 125]}
                          ticks={[75, 85, 95, 105, 115, 125]}
                          allowDataOverflow={false}
                          stroke={darkMode ? "#27272a" : "#e2e8f0"}
                          tick={{ fill: darkMode ? "#71717a" : "#64748b", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                          tickLine={false}
                          axisLine={{ stroke: darkMode ? "#27272a" : "#e2e8f0" }}
                          tickFormatter={(v) => `${v}°`}
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: darkMode ? "#0E1015" : "#ffffff",
                            borderColor: "#FF6B2B",
                            borderRadius: "8px",
                            color: darkMode ? "#ffffff" : "#000000",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "11px",
                          }}
                        />

                        <ReferenceLine
                          y={110}
                          stroke="#F43F5E"
                          strokeDasharray="4 4"
                          strokeWidth={1.25}
                          label={{
                            value: "Critical Limit (110°F)",
                            fill: "#F43F5E",
                            fontSize: 10,
                            fontFamily: "JetBrains Mono, monospace",
                            position: "insideTopRight",
                          }}
                        />

                        <Area
                          type="monotone"
                          dataKey="surface"
                          name="Surface (°F)"
                          stroke="#FF6B2B"
                          strokeWidth={2.25}
                          fill="url(#surfaceFill)"
                        />

                        <Line
                          type="monotone"
                          dataKey="ambient"
                          name="Ambient (°F)"
                          stroke="#38BDF8"
                          strokeWidth={1.5}
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Event Log */}
                <AgentEventLog
                  logs={logs}
                  onClear={() => setLogs([])}
                />
              </div>

              {/* Dedicated Surface Segmentation Card */}
              <SurfaceSegmentationCard
                segmentation={currentReading?.surface_segmentation}
                city={selectedCity}
                darkMode={darkMode}
              />

              {/* Autonomous Agents Simulation */}
              <AgentVisualization agentStates={agentStates} darkMode={darkMode} />
            </motion.div>
          )}

          {/* Tab 2: FortyGuard Spatial Heatmap */}
          {activeTab === "spatial_heatmap" && (
            <motion.div
              key="spatial_heatmap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <SpatialHeatmapView
                selectedCity={selectedCity}
                onSelectCity={handleSelectCity}
                darkMode={darkMode}
              />
            </motion.div>
          )}

          {/* Tab 3: 24H Diurnal Simulator */}
          {activeTab === "diurnal_sim" && (
            <motion.div
              key="diurnal_sim"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <DiurnalTimelineScrubber
                selectedCity={selectedCity}
                darkMode={darkMode}
              />
            </motion.div>
          )}

          {/* Tab 4: National Thermal Grid Matrix */}
          {activeTab === "national_grid" && (
            <motion.div
              key="national_grid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <NationalThermalGridMatrix
                selectedCity={selectedCity}
                onSelectCity={handleSelectCity}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Executive Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-3 border-t border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-zinc-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>ThermalOS v1.2 · Autonomous Microclimate Grid Operations</span>
        </div>
        <div className="flex items-center gap-4">
          <span>FortyGuard Radiometric API (v1)</span>
          <span>ASHRAE Standard 55</span>
        </div>
      </footer>
    </div>
  );
}
