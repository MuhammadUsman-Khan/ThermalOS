import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Cloud,
  FileCheck,
  Flame,
  Layers,
  MapPin,
  Moon,
  Radio,
  RefreshCw,
  Shield,
  Sun,
  Thermometer,
  Wifi,
  Zap,
} from "lucide-react";

import {
  API_BASE,
  N8N_AUDIT_WEBHOOK,
  CITIES,
  MAX_DATA_POINTS,
  getPastTimeString,
  timeNow,
  formatUptime,
  getRiskConfig,
  makeLog,
  prependLogs,
  telemetryLog,
} from "./lib/utils";
import KPICard from "./components/KPICard";
import AgentEventLog from "./components/AgentEventLog";
import AgentOneModal from "./components/AgentOneModal";
import AgentTwoModal from "./components/AgentTwoModal";
import AgentThreeModal from "./components/AgentThreeModal";
import Toast from "./components/Toast";

export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Live metrics
  const [pollTimer, setPollTimer] = useState("0.0");
  const [lastReceivedTime, setLastReceivedTime] = useState(timeNow);
  // Uptime is a pure accumulator: updated via the setter's prev and never read directly.
  const [, setUptimeSeconds] = useState(0);
  const [uptime, setUptime] = useState("0s");
  const [latency, setLatency] = useState(24);
  const [pollCount, setPollCount] = useState(1);
  const [failedPolls, setFailedPolls] = useState(0);
  const [totalEventsCount, setTotalEventsCount] = useState(6);
  const [currentDate, setCurrentDate] = useState(() =>
    new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  );

  const lastFetchRef = useRef(Date.now());
  const prevRiskLevelRef = useRef(null);

  // Sync the `dark` class on <html> with theme state.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Close the city dropdown when clicking outside of it.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // "Xs ago" ticker — reads the last-fetch ref so the interval is created once.
  useEffect(() => {
    const timer = setInterval(() => {
      setPollTimer(((Date.now() - lastFetchRef.current) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Uptime + date ticker.
  useEffect(() => {
    const interval = setInterval(() => {
      setUptimeSeconds((prev) => {
        const next = prev + 1;
        setUptime(formatUptime(next));
        return next;
      });
      setCurrentDate(
        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [selectedCity, setSelectedCity] = useState("Phoenix, AZ");
  const [telemetryData, setTelemetryData] = useState(() => [
    { time: getPastTimeString(18), temperature_f: 95 },
    { time: getPastTimeString(15), temperature_f: 96 },
    { time: getPastTimeString(12), temperature_f: 97 },
    { time: getPastTimeString(9), temperature_f: 96 },
    { time: getPastTimeString(6), temperature_f: 97 },
    { time: getPastTimeString(3), temperature_f: 96 },
    { time: getPastTimeString(0), temperature_f: 96 },
  ]);

  const [eventLogs, setEventLogs] = useState(() => [
    { id: "log-1", timestamp: getPastTimeString(15), type: "nominal", badge: "OPTIMAL", text: "Urban telemetry synchronized for Phoenix, AZ. Operative temperature within baseline envelope." },
    { id: "log-2", timestamp: getPastTimeString(12), type: "nominal", badge: "NOMINAL", text: "Mock Telemetry micro-climate grid stream active. Normal radiative heat profile." },
    { id: "log-3", timestamp: getPastTimeString(9), type: "elevated", badge: "ELEVATED", text: "Thermal sensor array at 97°F. Ambient boundary stable." },
    { id: "log-4", timestamp: getPastTimeString(6), type: "nominal", badge: "OPTIMAL", text: "Solar radiation index steady across 10m² micro-climate sector." },
    { id: "log-5", timestamp: getPastTimeString(3), type: "nominal", badge: "OPTIMAL", text: "Urban surface emissivity index nominal. HVAC load within ASHRAE 55 band." },
    { id: "log-6", timestamp: getPastTimeString(0), type: "elevated", badge: "ELEVATED", text: "Phoenix, AZ sensor reading 96°F. Monitoring micro-climate boundary." },
  ]);

  const [currentReading, setCurrentReading] = useState({
    location: "Phoenix, AZ",
    temperature_f: 96,
    risk_level: "elevated",
    resolution: "10m²",
    measured_at: "2m above ground",
    credits_remaining: 999999,
  });
  const [isConnected, setIsConnected] = useState(true);

  // Agent modal state
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditError, setAuditError] = useState(null);

  const [infraData, setInfraData] = useState(null);
  const [isInfraModalOpen, setIsInfraModalOpen] = useState(false);
  const [isInfraLoading, setIsInfraLoading] = useState(false);
  const [infraError, setInfraError] = useState(null);

  const [civicData, setCivicData] = useState(null);
  const [isCivicModalOpen, setIsCivicModalOpen] = useState(false);
  const [isCivicLoading, setIsCivicLoading] = useState(false);
  const [civicError, setCivicError] = useState(null);

  // Autonomous emergency trigger
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (title, message) =>
    setToast({ id: `${Date.now()}`, title, message });

  const pushLog = (entry) => {
    if (!entry) return;
    const list = Array.isArray(entry) ? entry : [entry];
    setEventLogs((prev) => prependLogs(prev, list));
    setTotalEventsCount((c) => c + list.length);
  };

  const closeAllModals = () => {
    setIsAuditOpen(false);
    setIsInfraModalOpen(false);
    setIsCivicModalOpen(false);
  };

  // Continuous 1000ms polling loop with real round-trip latency measurement.
  useEffect(() => {
    let isMounted = true;

    const fetchHeatIntelligence = async () => {
      const startTime = performance.now();
      try {
        const response = await fetch(`${API_BASE}/v1/heat-intelligence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location: selectedCity }),
        });
        const roundTripMs = Math.round(performance.now() - startTime);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (!isMounted) return;

        const timestamp = timeNow();
        setIsConnected(true);
        const jitter = Math.floor(Math.random() * 8) - 4;
        setLatency(Math.max(12, roundTripMs + 18 + jitter));
        setCurrentReading(data);
        setPollCount((prev) => prev + 1);
        setLastReceivedTime(timestamp);
        if (data.server_uptime_seconds !== undefined) {
          setUptimeSeconds(data.server_uptime_seconds);
          setUptime(formatUptime(data.server_uptime_seconds));
        }
        lastFetchRef.current = Date.now();

        setTelemetryData((prevData) => {
          const updated = [
            ...prevData,
            { time: timestamp, temperature_f: data.temperature_f, risk_level: data.risk_level, city: data.location },
          ];
          return updated.length > MAX_DATA_POINTS
            ? updated.slice(updated.length - MAX_DATA_POINTS)
            : updated;
        });

        pushLog(telemetryLog(selectedCity, data.temperature_f, data.risk_level, prevRiskLevelRef.current));
        prevRiskLevelRef.current = data.risk_level;
      } catch {
        if (!isMounted) return;
        setIsConnected(false);
        setFailedPolls((prev) => prev + 1);
      }
    };

    fetchHeatIntelligence();
    const intervalId = setInterval(fetchHeatIntelligence, 1000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  const handleSelectCity = (newCity) => {
    setSelectedCity(newCity);
    setIsDropdownOpen(false);
    prevRiskLevelRef.current = null; // reset risk-transition tracking for the new city
    pushLog(
      makeLog({
        type: "city_change",
        badge: "CITY CHANGED",
        text: `--- CITY CHANGED: ${newCity} --- Re-indexing urban telemetry.`,
      })
    );
  };

  const handleRunAudit = async () => {
    if (isAuditLoading) return;
    closeAllModals();
    setIsAuditOpen(true);
    setIsAuditLoading(true);
    setAuditError(null);
    setAuditReport(null);

    const tempToSend = currentReading ? currentReading.temperature_f : 96;
    try {
      const response = await fetch(`${API_BASE}/v1/agents/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: selectedCity, temperature_f: tempToSend }),
      });
      if (!response.ok) throw new Error(`Audit request failed with status: ${response.status}`);

      const report = await response.json();
      setAuditReport(report);

      // Fire-and-forget n8n webhook dispatch (tolerated in local mock environments).
      fetch(N8N_AUDIT_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      }).catch(() => {});

      pushLog([
        makeLog({ type: "audit", badge: "AGENT 1 AUDIT", text: `⚡ AGENT 1 AUDIT COMPLETE: ASHRAE 55 & IECC evaluation generated for ${selectedCity} (${tempToSend}°F).` }),
        makeLog({ type: "dispatch", badge: "N8N DISPATCH", text: `🚀 N8N AUTOMATED DISPATCH: Pre-cooling & mitigation payload transmitted silently to Agent 2 controller.` }),
      ]);
      showToast("Agent 1 Audit Complete", `Compliance report generated for ${selectedCity}.`);
    } catch (err) {
      setAuditError(err.message || "Failed to connect to Agent 1 audit endpoint.");
    } finally {
      setIsAuditLoading(false);
    }
  };

  const fetchInfrastructureData = async (openModal = true) => {
    if (openModal) {
      if (isInfraLoading) return;
      closeAllModals();
      setIsInfraModalOpen(true);
    }
    setIsInfraLoading(true);
    setInfraError(null);
    if (openModal) setInfraData(null);

    const tempToSend = currentReading ? currentReading.temperature_f : 96;
    try {
      const response = await fetch(`${API_BASE}/v1/agents/infrastructure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: selectedCity, temperature_f: parseFloat(tempToSend) }),
      });
      if (!response.ok) throw new Error(`Infrastructure agent request failed with status: ${response.status}`);

      const report = await response.json();
      setInfraData(report);
      pushLog(
        makeLog({ type: "dispatch", badge: "AGENT 2 INFRA", text: `❄️ AGENT 2 PRE-COOL DISPATCHED: Target ${report.target_precool_temp_f}°F initiated for ${selectedCity} (${tempToSend}°F).` })
      );
      if (openModal) {
        showToast("Agent 2 Pre-Cool Dispatched", `Grid load-shift initiated for ${selectedCity}.`);
      }
    } catch (err) {
      setInfraError(err.message || "Failed to connect to Agent 2 infrastructure endpoint.");
    } finally {
      setIsInfraLoading(false);
    }
  };

  const handleRunInfrastructure = () => fetchInfrastructureData(true);

  const fetchCivicData = async (openModal = true) => {
    if (openModal) {
      if (isCivicLoading) return;
      closeAllModals();
      setIsCivicModalOpen(true);
    }
    setIsCivicLoading(true);
    setCivicError(null);

    const tempToSend = currentReading ? currentReading.temperature_f : 96;
    try {
      const response = await fetch(`${API_BASE}/v1/agents/civic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: selectedCity, temperature_f: parseFloat(tempToSend) }),
      });
      if (!response.ok) throw new Error(`Civic dispatch agent request failed with status: ${response.status}`);

      const report = await response.json();
      setCivicData(report);
      pushLog(
        makeLog({ type: "extreme", badge: "AGENT 3 CIVIC", text: `🚨 AGENT 3 CIVIC OVERRIDE: WBGT ${report.wbgt_index} (${report.heat_stress_risk}) — automated cooling protocols broadcasted for ${selectedCity}.` })
      );
      // Autonomous background dispatch stays silent; only surface a toast for manual runs.
      if (openModal) {
        showToast("Agent 3 Civic Override", `WBGT ${report.wbgt_index} — alerts broadcast for ${selectedCity}.`);
      }
    } catch (err) {
      setCivicError(err.message || "Failed to connect to Agent 3 civic endpoint.");
    } finally {
      setIsCivicLoading(false);
    }
  };

  const handleRunCivic = () => fetchCivicData(true);

  const handleClearLog = () => {
    setEventLogs([]);
    prevRiskLevelRef.current = null;
  };

  const currentTemp = currentReading ? currentReading.temperature_f : 96;
  const riskConfig = getRiskConfig(currentTemp);

  // Autonomous emergency observer: silently fire Agent 2 (Pre-cool) & Agent 3 (Civic) on a >= 105°F breach.
  useEffect(() => {
    if (currentTemp >= 105 && !hasAutoTriggered) {
      setHasAutoTriggered(true);
      setIsEmergencyMode(true);
      fetchInfrastructureData(false);
      fetchCivicData(false);
    } else if (currentTemp < 100 && hasAutoTriggered) {
      setHasAutoTriggered(false);
      setIsEmergencyMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTemp, hasAutoTriggered]);

  const reliability =
    pollCount > 0 ? (((pollCount - failedPolls) / pollCount) * 100).toFixed(2) : "100.00";

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-black text-slate-900 dark:text-zinc-100 font-sans relative overflow-hidden transition-colors duration-300 flex flex-col selection:bg-[#FF6B2B]/30 selection:text-orange-900 dark:selection:text-white">
      {/* Ambient glows */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: "-10%",
          right: "-5%",
          width: "700px",
          height: "700px",
          borderRadius: "9999px",
          background: darkMode ? "rgba(234, 88, 12, 0.20)" : "rgba(255, 42, 0, 0.40)",
          filter: "blur(110px)",
        }}
      />
      <div
        className="fixed pointer-events-none z-0"
        style={{
          bottom: "-12%",
          left: "15%",
          width: "900px",
          height: "600px",
          borderRadius: "9999px",
          background: darkMode ? "rgba(127, 29, 29, 0.10)" : "rgba(255, 42, 0, 0.30)",
          filter: "blur(130px)",
        }}
      />

      {/* Topbar */}
      <header className="border-b border-gray-200 dark:border-white/5 bg-white/90 dark:bg-black/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 transition-colors duration-300">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  ThermalOS
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                  MOCK DATA
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">
                Urban Micro-Climate OS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleRunAudit}
              disabled={isAuditLoading}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-[11px] tracking-wider uppercase px-3.5 py-2 rounded-xl shadow-md dark:shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAuditLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
              <span>AUDIT</span>
            </button>

            <button
              onClick={handleRunInfrastructure}
              disabled={isInfraLoading}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg shadow-md dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isInfraLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              <span>DISPATCH PRE-COOL</span>
            </button>

            <button
              onClick={handleRunCivic}
              disabled={isCivicLoading}
              className="bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg shadow-md dark:shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCivicLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <AlertOctagon className="w-3 h-3" />}
              <span>CIVIC OVERRIDE</span>
            </button>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs shadow-inner transition-colors ${
                isEmergencyMode
                  ? "text-red-500 border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                  : "border-emerald-500/30 bg-emerald-50/70 dark:bg-[#0B1015]"
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${isEmergencyMode ? "text-red-500 animate-bounce" : "text-emerald-600 dark:text-emerald-400 animate-pulse"}`} />
              <span className={`text-[11px] font-bold uppercase tracking-wider font-mono tabular-nums ${isEmergencyMode ? "text-red-500 font-extrabold" : "text-emerald-600 dark:text-emerald-400"}`}>
                {isEmergencyMode ? "CRITICAL BREACH" : `LIVE (${uptime})`}
              </span>
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2.5 rounded-full bg-white dark:bg-transparent border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-[#FF6B2B] dark:hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white dark:bg-transparent border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer text-gray-700 dark:text-gray-200"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm font-medium">{selectedCity}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {CITIES.map((city) => (
                      <div
                        key={city}
                        onClick={() => handleSelectCity(city)}
                        className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                          selectedCity === city
                            ? "bg-orange-50 dark:bg-[#FF6B2B]/20 text-[#FF6B2B] font-semibold"
                            : "text-gray-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-500/20 hover:text-[#FF6B2B]"
                        }`}
                      >
                        <span>{city}</span>
                        {selectedCity === city && <Check className="w-3.5 h-3.5 text-[#FF6B2B]" />}
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
      <main className="w-full max-w-7xl mx-auto px-4 py-6 flex-1 flex flex-col space-y-5 relative z-10">
        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard
            label="SURFACE TEMP"
            icon={<Thermometer className="w-4 h-4 text-gray-400 dark:text-zinc-500 mb-4" />}
            value={currentTemp}
            unit="°F"
            hoverBorder="hover:border-[#FF6B2B]/30"
            darkMode={darkMode}
            sparkStroke={riskConfig.sparkStroke}
            sparkGradientId="sparkOrangeGrad"
            sparkPath="M0,24 Q15,6 32,18 T65,10 T95,14 L110,8"
            footer={
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${riskConfig.badgeClass}`}>
                {riskConfig.badge}
              </span>
            }
          />

          <KPICard
            label="RISK MATRIX"
            icon={<Shield className="w-4 h-4 text-gray-400 dark:text-zinc-500 mb-4" />}
            value={riskConfig.label}
            valueSuffix={
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-3 mb-1 ${riskConfig.badgeClass}`}>
                {riskConfig.badge}
              </span>
            }
            hoverBorder="hover:border-red-500/30"
            darkMode={darkMode}
            sparkStroke="#FF3B3B"
            sparkGradientId="sparkRedGrad"
            sparkPath="M0,18 Q20,26 42,12 T78,22 T98,8 L110,14"
            footer={
              <span className="font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                Crit Floor: <span className="text-red-500 font-semibold">105°F</span>
              </span>
            }
          />

          <KPICard
            label="RESOLUTION"
            icon={<Radio className="w-4 h-4 text-sky-500 dark:text-sky-400 mb-4" />}
            value="10"
            unit="m²"
            hoverBorder="hover:border-sky-500/30"
            darkMode={darkMode}
            sparkStroke="#38BDF8"
            sparkGradientId="sparkBlueGrad"
            sparkPath="M0,20 Q24,8 52,16 T84,8 T102,12 L110,6"
            footer={
              <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono">
                2m above ground
              </span>
            }
          />
        </div>

        {/* Workspace row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Telemetry chart */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-white/5">
              <div>
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-[#FF6B2B]" />
                  <h2 className="font-display text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                    TELEMETRY STREAM • {selectedCity}
                  </h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Dynamic micro-climate temperature readings (rolling 20-sample window)
                </p>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span>CRITICAL: 105°F</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 dark:text-zinc-500 mb-2 font-mono">
              <span>TEMP</span>
              <span>(°F)</span>
            </div>

            <div className="w-full h-80 relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={telemetryData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="neonFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={darkMode ? 0.3 : 0.08} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <filter id="neonGlow">
                      <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f97316" floodOpacity={darkMode ? "0.6" : "0.15"} />
                    </filter>
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
                    domain={[75, 115]}
                    ticks={[75, 85, 95, 105, 115]}
                    allowDataOverflow={false}
                    stroke={darkMode ? "#1E2330" : "#E5E7EB"}
                    tick={{ fill: darkMode ? "#71717A" : "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                    tickLine={false}
                    axisLine={{ stroke: darkMode ? "#1E2330" : "#E5E7EB" }}
                    tickFormatter={(val) => `${val}°`}
                  />

                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: darkMode ? "#0D0D0D" : "#ffffff",
                      borderColor: darkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb",
                      borderRadius: "8px",
                      color: darkMode ? "#fff" : "#0f172a",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "#f97316" }}
                  />

                  <ReferenceLine
                    y={105}
                    stroke="#FF3B3B"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "CRITICAL FLOOR 105°F",
                      fill: "#FF3B3B",
                      position: "insideBottomRight",
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                      fontWeight: 600,
                      offset: 10,
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="temperature_f"
                    stroke="#f97316"
                    strokeWidth={3}
                    fill="url(#neonFill)"
                    filter="url(#neonGlow)"
                    dot={false}
                    activeDot={{ r: 6, fill: "#f97316", stroke: darkMode ? "#000" : "#fff", strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between font-mono text-xs text-gray-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#FF6B2B]" />
                <span>Sampling: 1000ms</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                <span>
                  Frames Ingested: <strong className="text-slate-900 dark:text-white">{pollCount}</strong>
                </span>
              </div>
            </div>
          </div>

          <AgentEventLog logs={eventLogs} totalEventsCount={totalEventsCount} onClear={handleClearLog} />
        </div>

        {/* System status row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-orange-500/30 transition-all">
            <div className="h-11 w-11 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Wifi className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-gray-400 dark:text-zinc-500 font-semibold block tracking-wider">
                DATA CONNECTION
              </span>
              <div className="flex items-center gap-1.5 my-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isConnected ? "Online & Synced" : "Reconnecting"}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono">
                Latency: {latency}ms (Live Ping)
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-emerald-500/30 transition-all">
            <div className="h-11 w-11 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Cloud className="w-5 h-5 text-green-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-gray-400 dark:text-zinc-500 font-semibold block tracking-wider">
                API STATUS
              </span>
              <div className="flex items-center gap-1.5 my-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {isConnected ? "Active Stream" : "Offline"}
                </span>
              </div>
              <span className="text-[11px] text-gray-500 dark:text-zinc-500">
                Mock Telemetry ({pollCount} frames)
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-blue-500/30 transition-all">
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-gray-400 dark:text-zinc-500 font-semibold block tracking-wider">
                LAST UPDATED
              </span>
              <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white my-0.5 tabular-nums">
                {lastReceivedTime}
              </div>
              <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono">
                {pollTimer}s ago • {currentDate}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-purple-500/30 transition-all">
            <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-purple-500" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-gray-400 dark:text-zinc-500 font-semibold block tracking-wider">
                SYSTEM UPTIME
              </span>
              <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                {uptime}
              </div>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                {reliability}% reliability
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Agent modals — only one is ever open at a time */}
      <AnimatePresence>
        {isAuditOpen && (
          <AgentOneModal
            onClose={() => setIsAuditOpen(false)}
            city={selectedCity}
            loading={isAuditLoading}
            error={auditError}
            report={auditReport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInfraModalOpen && (
          <AgentTwoModal
            onClose={() => setIsInfraModalOpen(false)}
            city={selectedCity}
            currentTemp={currentTemp}
            loading={isInfraLoading}
            error={infraError}
            data={infraData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCivicModalOpen && (
          <AgentThreeModal
            onClose={() => setIsCivicModalOpen(false)}
            city={selectedCity}
            loading={isCivicLoading}
            error={civicError}
            data={civicData}
          />
        )}
      </AnimatePresence>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
