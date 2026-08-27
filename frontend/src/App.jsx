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
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Database,
  Gauge,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import RadialGauge from "./components/RadialGauge";
import AgentVisualization from "./components/AgentVisualization";
import SurfaceSegmentationCard from "./components/SurfaceSegmentationCard";
import SpatialHeatmapView from "./components/SpatialHeatmapView";
import { MONITORED_CITIES } from "./data/cities";
import DiurnalTimelineScrubber from "./components/DiurnalTimelineScrubber";
import NationalThermalGridMatrix from "./components/NationalThermalGridMatrix";
import AgentEventLog from "./components/AgentEventLog";
import FortyGuardQuotaBar from "./components/FortyGuardQuotaBar";
import AgentOneModal from "./components/AgentOneModal";
import AgentTwoModal from "./components/AgentTwoModal";
import AgentThreeModal from "./components/AgentThreeModal";
import ExecutiveSynthesisModal from "./components/ExecutiveSynthesisModal";
import Toast from "./components/Toast";

const API_BASE = "http://localhost:8000";

const NAV_TABS = [
  { id: "operations", label: "Operations Console", icon: Activity, badge: "LIVE" },
  { id: "spatial_heatmap", label: "Spatial GIS Heatmap", icon: Radio, badge: "24 CITIES" },
  { id: "diurnal_sim", label: "Diurnal Forecaster", icon: Clock, badge: "24H" },
  { id: "national_grid", label: "National Grid Matrix", icon: Globe, badge: "AOI" },
];

const REGIONS = [
  "Southwest & Desert",
  "Texas & South Central",
  "West Coast & Pacific",
  "Mountain & Midwest",
  "East Coast & Southeast",
];

export default function App() {
  const [activeTab, setActiveTab] = useState("operations");
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

  const [isSynthesisModalOpen, setIsSynthesisModalOpen] = useState(false);
  const [isSynthesisLoading, setIsSynthesisLoading] = useState(false);
  const [synthesisData, setSynthesisData] = useState(null);
  const [synthesisError, setSynthesisError] = useState(null);

  const [backendStatus, setBackendStatus] = useState("checking"); // 'connected' | 'disconnected' | 'checking'
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [logs, setLogs] = useState([]);

  const [agentStates, setAgentStates] = useState({
    agent1: "idle",
    agent2: "idle",
    agent3: "idle",
  });

  const dropdownRef = useRef(null);

  // Live Backend Health & Quota Polling
  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/fortyguard/quota`, { method: "GET" });
        if (res.ok && isMounted) {
          setBackendStatus("connected");
        } else if (isMounted) {
          setBackendStatus("disconnected");
        }
      } catch {
        if (isMounted) setBackendStatus("disconnected");
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
      const res = await fetch(`${API_BASE}/v1/agents/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: selectedCity,
          temperature_f: currentTemp,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAuditData(data);
      setAgentStates((prev) => ({ ...prev, agent1: "success" }));
      addLog(
        `Agent 1: Audit completed (Effective U: ${data.effective_u_factor?.toFixed(3) || "0.068"}, R-Loss: +${data.r_value_degradation_pct?.toFixed(1) || "24.5"}%)`,
        "audit",
        "Agent 1"
      );
      showToast("Thermal compliance audit completed successfully", "success");
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
      const res = await fetch(`${API_BASE}/v1/agents/infrastructure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: selectedCity,
          temperature_f: currentTemp,
          risk_level: currentTemp >= 105 ? "extreme" : currentTemp >= 95 ? "high" : "nominal",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInfraData(data);
      setAgentStates((prev) => ({ ...prev, agent2: "success" }));
      addLog(
        `Agent 2: Thermal storage charged. Peak power shaved by ${data.estimated_power_shift_kw || 480} kW ($${data.projected_cost_savings_usd || 1420} saved)`,
        "dispatch",
        "Agent 2"
      );
      showToast("HVAC Pre-Cool dispatch active", "success");
    } catch (err) {
      setInfraError(err.message);
      setAgentStates((prev) => ({ ...prev, agent2: "idle" }));
    } finally {
      setIsInfraLoading(false);
    }
  };
  const handleRunInfra = handleRunInfrastructure;

  // Agent 3: Civic & Public Health Override Action
  const handleRunCivic = async () => {
    setIsCivicModalOpen(true);
    setIsCivicLoading(true);
    setCivicError(null);
    setAgentStates((prev) => ({ ...prev, agent3: "working" }));
    addLog(`Agent 3: WBGT Thermodynamic Public Health Override triggered for ${selectedCity}`, "extreme", "Agent 3");

    try {
      const res = await fetch(`${API_BASE}/v1/agents/civic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: selectedCity,
          temperature_f: currentTemp,
          risk_level: currentTemp >= 105 ? "extreme" : currentTemp >= 95 ? "high" : "nominal",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCivicData(data);
      setAgentStates((prev) => ({ ...prev, agent3: "alert" }));
      setIsEmergencyMode(true);
      addLog(`Agent 3: OSHA/ACGIH Extreme Heat warning broadcasted (WBGT ${data.wbgt_index || "86.7"}°F)`, "extreme", "Agent 3");
      showToast("Civic Heat Advisory dispatched", "warning");
    } catch (err) {
      setCivicError(err.message);
      setAgentStates((prev) => ({ ...prev, agent3: "idle" }));
    } finally {
      setIsCivicLoading(false);
    }
  };

  // Executive Municipal Brief Synthesis Action
  const handleGenerateSynthesis = async () => {
    setIsSynthesisModalOpen(true);
    setIsSynthesisLoading(true);
    setSynthesisError(null);
    addLog(`Executive Brief: Tri-Agent Consensus Synthesis initiated for ${selectedCity}`, "info", "ThermalOS Core");

    try {
      const res = await fetch(`${API_BASE}/v1/agents/synthesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: selectedCity,
          temperature_f: currentTemp,
          risk_level: currentTemp >= 105 ? "extreme" : currentTemp >= 95 ? "high" : "nominal",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSynthesisData(data);
      showToast("Executive Municipal Brief Generated", "success");
    } catch (err) {
      setSynthesisError(err.message);
    } finally {
      setIsSynthesisLoading(false);
    }
  };

  const surfaceDelta = Math.max(0, surfaceTemp - currentTemp);

  const filteredDropdownCities = MONITORED_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
      c.region.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  return (
    <div className={`min-h-[100dvh] flex flex-col font-sans transition-colors relative ${darkMode ? "bg-[#07080C] text-zinc-100" : "bg-[#F4F6FB] text-black"}`}>
      {/* Apple iOS-Style Ambient Luminous Mesh Backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-36 -left-36 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent blur-[110px] animate-ambient-1" />
        <div className="absolute top-[28%] -right-36 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-cyan-500/15 via-sky-500/8 to-transparent blur-[125px] animate-ambient-2" />
        <div className="absolute -bottom-48 left-[15%] w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-rose-500/12 via-orange-500/6 to-transparent blur-[140px] animate-ambient-1" />
      </div>

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

      <ExecutiveSynthesisModal
        isOpen={isSynthesisModalOpen}
        onClose={() => setIsSynthesisModalOpen(false)}
        city={selectedCity}
        data={synthesisData}
        loading={isSynthesisLoading}
        error={synthesisError}
      />

      {/* Executive Command Header Bar */}
      <header className="border-b border-black/10 dark:border-white/[0.08] bg-white/90 dark:bg-[#090B10]/80 backdrop-blur-2xl sticky top-0 z-40 px-5 sm:px-8 py-3 transition-colors shadow-xs">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Telemetry Indicator */}
          <div className="flex items-center gap-3.5">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FF6B2B] to-[#FF8533] text-black shadow-[0_0_20px_rgba(255,107,43,0.4)] cursor-pointer"
            >
              <Flame className="w-5 h-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-black dark:text-white font-display">
                  ThermalOS
                </h1>
              </div>
              <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 tracking-tight hidden sm:block">
                Autonomous Radiometric Microclimate Grid Intelligence
              </p>
            </div>
          </div>

          {/* Right Toolbar: Agent Actions + City Spotlight + Theme Toggle */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Unified 3-Agent Quick Trigger Bar */}
            <div className="flex items-center gap-1 p-1 rounded-2xl glass-panel-subtle shadow-xs">
              {/* Agent 1: Audit */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRunAudit}
                disabled={isAuditLoading}
                title="Agent 1: Energy & Thermal Compliance Audit"
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-gray-700 dark:text-zinc-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-white/80 dark:hover:bg-white/10 border border-transparent hover:border-amber-500/30"
              >
                {isAuditLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                ) : (
                  <FileCheck className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="font-semibold">Audit</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                  A1
                </span>
              </motion.button>

              {/* Agent 2: Pre-Cool */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRunInfrastructure}
                disabled={isInfraLoading}
                title="Agent 2: Infrastructure & Pre-Cooling Controller"
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-gray-700 dark:text-zinc-300 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-white/80 dark:hover:bg-white/10 border border-transparent hover:border-cyan-500/30"
              >
                {isInfraLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-cyan-500" />
                )}
                <span className="font-semibold">Pre-Cool</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  A2
                </span>
              </motion.button>

              {/* Agent 3: Civic Alert */}
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRunCivic}
                disabled={isCivicLoading}
                title="Agent 3: Civic & Public Health Override"
                className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-gray-700 dark:text-zinc-300 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white/80 dark:hover:bg-white/10 border border-transparent hover:border-rose-500/30"
              >
                {isCivicLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                ) : (
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span className="font-semibold">Civic Alert</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                  A3
                </span>
              </motion.button>
            </div>

            {/* Real-Time Backend & Telemetry Connection Status Badge */}
            <div
              title={
                backendStatus === "connected"
                  ? "ThermalOS FastAPI Engine & FortyGuard Live API Connected (Port 8000)"
                  : backendStatus === "checking"
                  ? "Checking Backend connection on Port 8000..."
                  : "Backend disconnected. Run 'python mock_api.py' in d:\\ThermalOS\\backend"
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-xs font-mono h-9 transition-colors select-none ${
                isEmergencyMode
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-500"
                  : backendStatus === "connected"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : backendStatus === "checking"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isEmergencyMode
                    ? "bg-rose-500 animate-ping"
                    : backendStatus === "connected"
                    ? "bg-emerald-500 animate-radar-ping"
                    : backendStatus === "checking"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-rose-500 animate-ping"
                }`}
              />
              <span className="font-semibold tracking-tight">
                {isEmergencyMode
                  ? "Thermal Advisory"
                  : backendStatus === "connected"
                  ? "Live · 40G Online"
                  : backendStatus === "checking"
                  ? "Syncing..."
                  : "Backend Offline"}
              </span>
            </div>

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-2xl glass-panel-subtle text-gray-600 dark:text-zinc-400 hover:text-orange-500 hover:border-orange-500/30 transition-colors shadow-xs cursor-pointer h-9 w-9 flex items-center justify-center"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            {/* High-Contrast Searchable City Dropdown */}
            <div ref={dropdownRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 glass-panel-subtle hover:border-orange-500/50 px-3.5 py-1.5 rounded-2xl text-xs font-medium transition-all cursor-pointer text-black dark:text-white shadow-xs font-mono group h-9"
              >
                <MapPin className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold">{selectedCity}</span>
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
                    className="absolute top-full mt-2 right-0 w-80 glass-popover rounded-3xl overflow-hidden z-50 flex flex-col max-h-[380px] font-mono text-xs shadow-2xl"
                  >
                    {/* Top edge gradient glow */}
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

                    {/* Spotlight Search Header */}
                    <div className="p-3 border-b border-gray-200/80 dark:border-white/[0.08] bg-gray-50/70 dark:bg-white/[0.02] relative flex items-center">
                      <Search className="w-3.5 h-3.5 absolute left-6 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search 24+ cities..."
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        className="w-full bg-white dark:bg-black/70 border border-gray-200 dark:border-zinc-800 rounded-xl pl-9 pr-12 py-2 text-xs text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono"
                        autoFocus
                      />
                      {dropdownSearch ? (
                        <button
                          onClick={() => setDropdownSearch("")}
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
                      {REGIONS.map((region) => {
                        const regionCities = filteredDropdownCities.filter((c) => c.region === region);
                        if (regionCities.length === 0) return null;

                        return (
                          <div key={region} className="space-y-1">
                            <div className="px-3 py-1 text-[9.5px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 rounded-lg flex items-center justify-between">
                              <span>{region}</span>
                              <span className="text-[9px] text-orange-400/60 font-normal">{regionCities.length}</span>
                            </div>
                            <div className="space-y-0.5">
                              {regionCities.map((c) => {
                                const isSelected = selectedCity === c.name;
                                const tempNum = parseFloat(c.tempF);

                                return (
                                  <button
                                    key={c.id}
                                    onClick={() => handleSelectCity(c.name)}
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

                      {filteredDropdownCities.length === 0 && (
                        <div className="p-6 text-center text-xs text-gray-500 dark:text-zinc-500 font-mono">
                          No cities matching "{dropdownSearch}"
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Mission Control Canvas */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col space-y-5 relative z-10">
        {/* Next-Gen Continuous Sliding Segmented Navigation Control */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-panel-subtle text-xs font-mono w-fit relative shadow-sm">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="relative px-4 py-2 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-2 select-none group"
              >
                {/* Continuous Spring Gliding Indicator Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF6B2B] via-[#FF7832] to-[#FF8A3D] shadow-[0_0_24px_rgba(255,107,43,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)]"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                      mass: 0.8,
                    }}
                  />
                )}

                <span
                  className={`relative z-10 flex items-center gap-2 transition-colors duration-200 ${
                    isActive
                      ? "text-black font-extrabold"
                      : "text-gray-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                        isActive
                          ? "bg-black/20 text-black border border-black/10"
                          : "bg-gray-200 dark:bg-white/[0.08] text-gray-500 dark:text-zinc-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Dynamic Animated Tab View Routing */}
        <AnimatePresence mode="wait">
          {/* Tab 1: Operations Console */}
          {activeTab === "operations" && (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 10, scale: 0.992 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.992 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Mission Control 4-Card Hero Telemetry Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Surface Radiometric vs Ambient Delta */}
                <motion.div
                  whileHover={{ y: -2.5, transition: { duration: 0.15 } }}
                  className="glass-panel rounded-3xl p-5 flex flex-col justify-between transition-all hover:border-orange-500/40 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-orange-500/60 group-hover:to-transparent transition-all duration-300" />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">
                      Surface Temperature
                    </span>
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 group-hover:scale-110 transition-transform">
                      <Thermometer className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl lg:text-[34px] font-extrabold font-mono tracking-tight tabular-nums text-black dark:text-white leading-none">
                        {surfaceTemp.toFixed(1)}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-400">°F</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ml-1.5 bg-orange-500/15 text-orange-500 border border-orange-500/30 shadow-xs">
                        +{surfaceDelta.toFixed(1)}°F ΔT
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                    <span>Canopy Air: <strong className="text-black dark:text-white font-medium">{currentTemp}°F</strong></span>
                    <span className="text-orange-500 font-semibold">Urban Heat Peak</span>
                  </div>
                </motion.div>

                {/* 2. Solar Irradiance GHI */}
                <motion.div
                  whileHover={{ y: -2.5, transition: { duration: 0.15 } }}
                  className="glass-panel rounded-3xl p-5 flex flex-col justify-between transition-all hover:border-amber-500/40 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-amber-500/60 group-hover:to-transparent transition-all duration-300" />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">
                      Solar Irradiance (GHI)
                    </span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 transition-transform">
                      <Sun className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl lg:text-[34px] font-extrabold font-mono tracking-tight tabular-nums text-black dark:text-white leading-none">
                        {solarGhi.toFixed(0)}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-400">W/m²</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ml-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {solarGhi >= 600 ? "Peak Flux" : "Nominal"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                    <span>Direct DNI: <strong className="text-black dark:text-white font-medium">{(solarGhi * 1.3).toFixed(0)} W/m²</strong></span>
                    <span className="text-amber-400 font-semibold">Solar Zenith</span>
                  </div>
                </motion.div>

                {/* 3. Relative Humidity & Wet-Bulb */}
                <motion.div
                  whileHover={{ y: -2.5, transition: { duration: 0.15 } }}
                  className="glass-panel rounded-3xl p-5 flex flex-col justify-between transition-all hover:border-cyan-500/40 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-cyan-500/60 group-hover:to-transparent transition-all duration-300" />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">
                      Relative Humidity
                    </span>
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                      <Droplets className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="my-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl lg:text-[34px] font-extrabold font-mono tracking-tight tabular-nums text-black dark:text-white leading-none">
                        {humidity.toFixed(1)}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-400">%</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ml-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        {humidity > 50 ? "Elevated" : "Nominal"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200/60 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                    <span>Wet-Bulb: <strong className="text-cyan-600 dark:text-cyan-400 font-medium">{currentReading?.wet_bulb_f ? `${currentReading.wet_bulb_f.toFixed(1)}°F` : "74.1°F"}</strong></span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Chiller Shifting</span>
                  </div>
                </motion.div>

                {/* 4. Real-Time WBGT Radial Dial Gauge */}
                <motion.div
                  whileHover={{ y: -2.5, transition: { duration: 0.15 } }}
                  className="glass-panel rounded-3xl p-5 flex flex-col items-center justify-between transition-all hover:border-orange-500/40 relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-orange-500/60 group-hover:to-transparent transition-all duration-300" />
                  <RadialGauge
                    value={wbgt}
                    min={60}
                    max={100}
                    threshold={85}
                    unit="°F"
                    label="Liljegren WBGT Index"
                    size={120}
                  />
                  <div className="w-full flex items-center justify-between pt-2.5 border-t border-gray-200/60 dark:border-white/[0.06] font-mono text-[10.5px] text-gray-500 dark:text-zinc-400">
                    <span>Advisory Limit: <strong className="text-rose-500 font-semibold">85.0°F</strong></span>
                    <span className={wbgt >= 85 ? "text-rose-500 font-semibold" : "text-emerald-500 font-medium"}>
                      {wbgt >= 85 ? "Triggered" : "Nominal"}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Workspace Row: Telemetry Stream Chart + Dispatch Event Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Telemetry Stream Chart Canvas */}
                <div className="lg:col-span-8 glass-panel rounded-3xl p-5 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3.5 border-b border-gray-200/60 dark:border-white/[0.06]">
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
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                        <span className="text-gray-700 dark:text-zinc-300 font-medium">Surface (°F)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                        <span className="text-gray-700 dark:text-zinc-300 font-medium">Ambient (°F)</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-72 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={telemetryData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="surfaceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6B2B" stopOpacity={0.25} />
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
                            borderRadius: "12px",
                            color: darkMode ? "#ffffff" : "#000000",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "11px",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                          }}
                        />

                        <ReferenceLine
                          y={110}
                          stroke="#F43F5E"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
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
                          strokeWidth={2.5}
                          fill="url(#surfaceFill)"
                        />

                        <Line
                          type="monotone"
                          dataKey="ambient"
                          name="Ambient (°F)"
                          stroke="#38BDF8"
                          strokeWidth={1.75}
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Event Dispatch Log */}
                <AgentEventLog
                  logs={logs}
                  onClear={() => setLogs([])}
                />
              </div>

              {/* Dedicated Land-Cover Albedo & Composition Card */}
              <SurfaceSegmentationCard
                segmentation={currentReading?.surface_segmentation}
                city={selectedCity}
                darkMode={darkMode}
              />

              {/* Autonomous Tri-Agent Tactical Simulation Workspace */}
              <AgentVisualization
                agentStates={agentStates}
                darkMode={darkMode}
                onRunAudit={handleRunAudit}
                onRunInfra={handleRunInfrastructure}
                onRunCivic={handleRunCivic}
                onGenerateBrief={handleGenerateSynthesis}
                isAuditLoading={isAuditLoading}
                isInfraLoading={isInfraLoading}
                isCivicLoading={isCivicLoading}
                isSynthesisLoading={isSynthesisLoading}
              />
            </motion.div>
          )}

          {/* Tab 2: FortyGuard Spatial Heatmap */}
          {activeTab === "spatial_heatmap" && (
            <motion.div
              key="spatial_heatmap"
              initial={{ opacity: 0, y: 10, scale: 0.992 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.992 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
              initial={{ opacity: 0, y: 10, scale: 0.992 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.992 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
              initial={{ opacity: 0, y: 10, scale: 0.992 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.992 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <NationalThermalGridMatrix
                selectedCity={selectedCity}
                onSelectCity={handleSelectCity}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dedicated FortyGuard API Quota, Credits & Allowance Bar */}
        <div className="pt-2">
          <FortyGuardQuotaBar darkMode={darkMode} />
        </div>
      </main>

      {/* Executive Mission Control Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 border-t border-black/10 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 dark:text-zinc-400 font-mono gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          <span className="font-semibold text-black dark:text-white">ThermalOS Executive Grid Intelligence</span>
          <span className="text-gray-400 dark:text-zinc-600">·</span>
          <span>FortyGuard Real-Time Microclimate Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <span>ASHRAE Standard 55</span>
          <span>IECC 2021 Envelope Protocol</span>
          <span className="text-orange-500 font-bold">Liljegren WBGT</span>
        </div>
      </footer>
    </div>
  );
}
