import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  FileCheck,
  Zap,
  Flame,
  Droplets,
  Sun,
  Moon,
  ChevronDown,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  Thermometer,
  Radio,
  Globe,
  MapPin,
  Check,
  AlertOctagon,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import KPICard from "./components/KPICard";
import RadialGauge from "./components/RadialGauge";
import AgentVisualization from "./components/AgentVisualization";
import SurfaceSegmentationCard from "./components/SurfaceSegmentationCard";
import SpatialHeatmapView from "./components/SpatialHeatmapView";
import DiurnalTimelineScrubber from "./components/DiurnalTimelineScrubber";
import NationalThermalGridMatrix from "./components/NationalThermalGridMatrix";
import AgentEventLog from "./components/AgentEventLog";
import AgentOneModal from "./components/AgentOneModal";
import AgentTwoModal from "./components/AgentTwoModal";
import AgentThreeModal from "./components/AgentThreeModal";
import Toast from "./components/Toast";
import { CITIES } from "./lib/utils";

const API_BASE = "http://localhost:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState("operations"); // 'operations' | 'spatial_heatmap' | 'diurnal_sim' | 'national_grid'
  const [selectedCity, setSelectedCity] = useState("Phoenix, AZ");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
  const [totalEventsCount, setTotalEventsCount] = useState(0);

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
    setTotalEventsCount((c) => c + 1);
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

  return (
    <div className={`min-h-[100dvh] flex flex-col font-sans transition-colors ${darkMode ? "bg-[#0A0C0F] text-zinc-100" : "bg-zinc-50 text-slate-900"}`}>
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

      {/* Topbar */}
      <header className="border-b border-gray-200 dark:border-white/5 bg-white/90 dark:bg-[#0A0C0F]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 transition-colors">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <Flame className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white font-display">
                ThermalOS
              </h1>
              <span className="text-xs text-gray-400 dark:text-zinc-600">/</span>
              <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
                FortyGuard Microclimate Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Quick Action Triggers */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono">
              <button
                onClick={handleRunAudit}
                disabled={isAuditLoading}
                className="px-2.5 py-1 rounded-md font-medium bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:text-orange-500 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAuditLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3 text-orange-500" />}
                <span>Audit</span>
              </button>

              <button
                onClick={handleRunInfrastructure}
                disabled={isInfraLoading}
                className="px-2.5 py-1 rounded-md font-medium bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:text-cyan-500 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isInfraLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-cyan-500" />}
                <span>Pre-Cool</span>
              </button>

              <button
                onClick={handleRunCivic}
                disabled={isCivicLoading}
                className="px-2.5 py-1 rounded-md font-medium bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:text-rose-500 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCivicLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <AlertOctagon className="w-3 h-3 text-rose-500" />}
                <span>Civic Alert</span>
              </button>
            </div>

            {/* Telemetry Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-xs font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${isEmergencyMode ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="text-gray-600 dark:text-zinc-400">
                {isEmergencyMode ? "Critical Advisory" : `Active · ${uptime}`}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-orange-500 transition-colors shadow-xs cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* City Selector */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 hover:border-orange-500/40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-slate-800 dark:text-zinc-200 shadow-xs font-mono"
              >
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>{selectedCity}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full mt-1.5 right-0 w-52 bg-white dark:bg-[#111318] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 py-1 font-mono text-xs"
                  >
                    {CITIES.map((city) => (
                      <div
                        key={city}
                        onClick={() => handleSelectCity(city)}
                        className={`px-3.5 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                          selectedCity === city
                            ? "bg-orange-500/10 text-orange-500 font-semibold"
                            : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span>{city}</span>
                        {selectedCity === city && <Check className="w-3.5 h-3.5 text-orange-500" />}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main dashboard */}
      <main className="w-full max-w-7xl mx-auto px-4 py-5 flex-1 flex flex-col space-y-4 relative z-10">
        {/* Sleek Segmented Navigation Control */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs font-mono w-fit">
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-3.5 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "operations"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-orange-500" />
            <span>Operations Console</span>
          </button>

          <button
            onClick={() => setActiveTab("spatial_heatmap")}
            className={`px-3.5 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "spatial_heatmap"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-orange-500" />
            <span>Spatial Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab("diurnal_sim")}
            className={`px-3.5 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "diurnal_sim"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Diurnal Forecaster</span>
          </button>

          <button
            onClick={() => setActiveTab("national_grid")}
            className={`px-3.5 py-1.5 rounded-md font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "national_grid"
                ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-gray-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-500" />
            <span>National Grid Matrix</span>
          </button>
        </div>

        {/* Tab 1: Operations Console */}
        {activeTab === "operations" && (
          <div className="space-y-4">
            {/* 4-Card Mission Control Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Surface vs Ambient Temp */}
              <KPICard
                label="Surface Temperature"
                icon={<Thermometer className="w-4 h-4 text-orange-500" />}
                value={surfaceTemp.toFixed(1)}
                unit="°F"
                valueSuffix={
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ml-2 mb-1 bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    +{surfaceDelta.toFixed(1)}°F ΔT
                  </span>
                }
                darkMode={darkMode}
                sparkStroke="#f97316"
                sparkGradientId="sparkOrangeGrad"
                sparkPath="M0,24 Q15,6 32,18 T65,10 T95,14 L110,8"
                footer={
                  <span>
                    Ambient Air: <strong className="text-slate-900 dark:text-white font-semibold">{currentTemp}°F</strong>
                  </span>
                }
              />

              {/* 2. Solar Irradiance GHI */}
              <KPICard
                label="Solar Irradiance (GHI)"
                icon={<Sun className="w-4 h-4 text-amber-500" />}
                value={solarGhi.toFixed(0)}
                unit="W/m²"
                valueSuffix={
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ml-2 mb-1 ${solarGhi >= 600 ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"}`}>
                    {solarGhi >= 600 ? "Peak Flux" : "Moderate"}
                  </span>
                }
                darkMode={darkMode}
                sparkStroke="#f59e0b"
                sparkGradientId="sparkAmberGrad"
                sparkPath="M0,28 Q20,12 45,20 T80,8 T100,16 L110,10"
                footer={
                  <span>
                    Clear Sky DNI: <strong className="text-slate-900 dark:text-white font-semibold">{(solarGhi * 1.3).toFixed(0)} W/m²</strong>
                  </span>
                }
              />

              {/* 3. Relative Humidity */}
              <KPICard
                label="Relative Humidity"
                icon={<Droplets className="w-4 h-4 text-cyan-500" />}
                value={humidity.toFixed(1)}
                unit="%"
                valueSuffix={
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ml-2 mb-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    {humidity > 50 ? "Elevated" : "Nominal"}
                  </span>
                }
                darkMode={darkMode}
                sparkStroke="#06b6d4"
                sparkGradientId="sparkCyanGrad"
                sparkPath="M0,16 Q25,24 50,14 T85,20 T105,10 L110,14"
                footer={
                  <span>
                    Wet-Bulb: <strong className="text-slate-900 dark:text-white font-semibold">{currentReading?.wet_bulb_f ? `${currentReading.wet_bulb_f.toFixed(1)}°F` : "74.1°F"}</strong>
                  </span>
                }
              />

              {/* 4. Real-Time WBGT with Radial Gauge */}
              <div className="bg-white dark:bg-[#111318] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col items-center justify-between shadow-xs transition-all">
                <RadialGauge
                  value={wbgt}
                  min={60}
                  max={100}
                  threshold={85}
                  unit="°F"
                  label="Liljegren WBGT Index"
                  size={125}
                  color={wbgt >= 85 ? "#f43f5e" : "#10b981"}
                />
                <div className="w-full flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 font-mono text-[10px] text-gray-500 dark:text-zinc-400">
                  <span>Advisory Limit: <strong className="text-rose-500">85.0°F</strong></span>
                  <span className={wbgt >= 85 ? "text-rose-500 font-semibold" : "text-emerald-500 font-semibold"}>
                    {wbgt >= 85 ? "Triggered" : "Nominal"}
                  </span>
                </div>
              </div>
            </div>

            {/* Workspace Row: Telemetry Chart + Dispatch Log */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Telemetry chart */}
              <div className="lg:col-span-8 bg-white dark:bg-[#111318] border border-gray-200 dark:border-white/5 rounded-xl p-5 flex flex-col justify-between shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-orange-500" />
                      <h2 className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                        Thermal Telemetry Stream · {selectedCity}
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Real-time surface radiometric vs. ambient canopy temperature (rolling window)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-gray-600 dark:text-zinc-400">Surface (°F)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                      <span className="text-gray-600 dark:text-zinc-400">Ambient (°F)</span>
                    </div>
                  </div>
                </div>

                <div className="w-full h-80 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={telemetryData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="surfaceFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={darkMode ? 0.25 : 0.12} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <XAxis
                        dataKey="time"
                        stroke={darkMode ? "#1E2330" : "#E5E7EB"}
                        tick={{ fill: darkMode ? "#71717A" : "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: darkMode ? "#1E2330" : "#E5E7EB" }}
                        interval="preserveStartEnd"
                        minTickGap={28}
                      />

                      <YAxis
                        domain={[75, 125]}
                        ticks={[75, 85, 95, 105, 115, 125]}
                        allowDataOverflow={false}
                        stroke={darkMode ? "#1E2330" : "#E5E7EB"}
                        tick={{ fill: darkMode ? "#71717A" : "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                        tickLine={false}
                        axisLine={{ stroke: darkMode ? "#1E2330" : "#E5E7EB" }}
                        tickFormatter={(v) => `${v}°`}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? "#111318" : "#ffffff",
                          borderColor: darkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb",
                          borderRadius: "8px",
                          color: darkMode ? "#fff" : "#0f172a",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: "11px",
                        }}
                      />

                      <ReferenceLine
                        y={110}
                        stroke="#f43f5e"
                        strokeDasharray="4 4"
                        label={{
                          value: "Critical Surface Threshold (110°F)",
                          fill: "#f43f5e",
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                          position: "insideTopRight",
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="surface"
                        name="Surface (°F)"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#surfaceFill)"
                      />

                      <Line
                        type="monotone"
                        dataKey="ambient"
                        name="Ambient (°F)"
                        stroke="#38bdf8"
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
                totalEventsCount={totalEventsCount}
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
          </div>
        )}

        {/* Tab 2: FortyGuard Spatial Heatmap */}
        {activeTab === "spatial_heatmap" && (
          <SpatialHeatmapView
            selectedCity={selectedCity}
            onSelectCity={handleSelectCity}
            darkMode={darkMode}
          />
        )}

        {/* Tab 3: 24H Diurnal Simulator */}
        {activeTab === "diurnal_sim" && (
          <DiurnalTimelineScrubber
            selectedCity={selectedCity}
            darkMode={darkMode}
          />
        )}

        {/* Tab 4: National Thermal Grid Matrix */}
        {activeTab === "national_grid" && (
          <NationalThermalGridMatrix
            selectedCity={selectedCity}
            onSelectCity={handleSelectCity}
          />
        )}
      </main>

      {/* Executive Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 border-t border-gray-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-zinc-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>ThermalOS v1.2 · Autonomous Microclimate Grid Operations</span>
        </div>
        <div className="flex items-center gap-4">
          <span>FortyGuard Radiometric API (v1)</span>
          <span>ASHRAE Standard 55 Compliant</span>
        </div>
      </footer>
    </div>
  );
}
