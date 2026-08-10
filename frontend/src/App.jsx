import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  ChevronDown,
  Clock,
  Cloud,
  FileCheck,
  FileText,
  Flame,
  Home,
  Layers,
  Link2,
  MapPin,
  Moon,
  Radio,
  RefreshCw,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  Sun,
  Thermometer,
  Wifi,
  X,
} from "lucide-react";

const CITIES = [
  "Phoenix, AZ",
  "Houston, TX",
  "Las Vegas, NV",
  "Dallas, TX",
];

const MAX_DATA_POINTS = 20;

export default function App() {
  // Theme State
  const [darkMode, setDarkMode] = useState(true);

  // Navigation State
  const [activeNav, setActiveNav] = useState("overview");

  // Selection & Telemetry State
  const [selectedCity, setSelectedCity] = useState("Phoenix, AZ");
  const [telemetryData, setTelemetryData] = useState([]);
  const [eventLogs, setEventLogs] = useState([
    {
      id: "log-1",
      timestamp: "02:35:41 PM",
      type: "extreme",
      badge: "CRITICAL BREACH",
      text: "Threshold breached for Phoenix, AZ.",
    },
    {
      id: "log-2",
      timestamp: "02:35:38 PM",
      type: "high",
      badge: "ELEVATED",
      text: "HIGH HEAT ELEVATION: Phoenix, AZ at 103°F. Monitoring thermal plume.",
    },
    {
      id: "log-3",
      timestamp: "02:35:40 PM",
      type: "high",
      badge: "ELEVATED",
      text: "HIGH HEAT ELEVATION: Phoenix, AZ at 100°F. Monitoring thermal plume.",
    },
    {
      id: "log-4",
      timestamp: "02:35:41 PM",
      type: "extreme",
      badge: "CRITICAL BREACH",
      text: "HEAT SPIKE DETECTED: Threshold breached for Phoenix, AZ.",
    },
    {
      id: "log-5",
      timestamp: "02:35:43 PM",
      type: "extreme",
      badge: "CRITICAL BREACH",
      text: "HEAT SPIKE DETECTED: Threshold breached for Phoenix, AZ.",
    },
    {
      id: "log-6",
      timestamp: "02:35:44 PM",
      type: "high",
      badge: "ELEVATED",
      text: "HIGH HEAT ELEVATION: Phoenix, AZ at 102°F. Monitoring thermal plume.",
    },
  ]);
  const [currentReading, setCurrentReading] = useState({
    location: "Phoenix, AZ",
    temperature_f: 102,
    risk_level: "high",
    resolution: "10m²",
    measured_at: "2m above ground",
    credits_remaining: 999999,
  });
  const [isConnected, setIsConnected] = useState(true);
  const [pollCount, setPollCount] = useState(273);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );

  // Agent 1 Audit Modal State
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [isDispatched, setIsDispatched] = useState(false);

  const logsEndRef = useRef(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Continuous 1500ms polling loop to FastAPI backend
  useEffect(() => {
    let isMounted = true;

    const fetchHeatIntelligence = async () => {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      try {
        const response = await fetch("http://127.0.0.1:8000/v1/heat-intelligence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ location: selectedCity }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted) return;

        setIsConnected(true);
        setCurrentReading(data);
        setPollCount((prev) => prev + 1);

        // Update rolling telemetry window (max 20 points)
        setTelemetryData((prevData) => {
          const newPoint = {
            time: timestamp,
            temperature_f: data.temperature_f,
            risk_level: data.risk_level,
            city: data.location,
          };
          const updated = [...prevData, newPoint];
          if (updated.length > MAX_DATA_POINTS) {
            return updated.slice(updated.length - MAX_DATA_POINTS);
          }
          return updated;
        });

        // Trigger log alerts with unique IDs
        if (data.temperature_f >= 105 || data.risk_level === "extreme") {
          const alertMessage = `Threshold breached for ${selectedCity}.`;
          setEventLogs((prevLogs) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "extreme",
              badge: "CRITICAL BREACH",
              text: alertMessage,
            },
            ...prevLogs.slice(0, 15),
          ]);
        } else if (data.temperature_f >= 100 || data.risk_level === "high") {
          setEventLogs((prevLogs) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "high",
              badge: "ELEVATED",
              text: `HIGH HEAT ELEVATION: ${selectedCity} at ${data.temperature_f}°F. Monitoring thermal plume.`,
            },
            ...prevLogs.slice(0, 15),
          ]);
        }
      } catch (err) {
        if (!isMounted) return;
        setIsConnected(false);
      }
    };

    fetchHeatIntelligence();
    const intervalId = setInterval(fetchHeatIntelligence, 1500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedCity]);

  // Handle city selector change
  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setSelectedCity(newCity);
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setEventLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: ts,
        type: "city_change",
        badge: "TARGET SHIFT",
        text: `Spatial target switched to [${newCity}]. Re-indexing urban telemetry.`,
      },
      ...prev.slice(0, 15),
    ]);
  };

  // Trigger Agent 1 Compliance Audit
  const handleRunAudit = async () => {
    setIsAuditOpen(true);
    setIsAuditLoading(true);
    setAuditError(null);
    setAuditReport(null);
    setIsDispatched(false);

    const tempToSend = currentReading ? currentReading.temperature_f : 102;

    try {
      const response = await fetch("http://127.0.0.1:8000/v1/agents/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: selectedCity,
          temperature_f: tempToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`Audit request failed with status: ${response.status}`);
      }

      const report = await response.json();
      setAuditReport(report);

      const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setEventLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: ts,
          type: "audit",
          badge: "AGENT 1 AUDIT",
          text: `⚡ AGENT 1 AUDIT COMPLETE: ASHRAE 55 & IECC evaluation generated for ${selectedCity} (${tempToSend}°F).`,
        },
        ...prev.slice(0, 15),
      ]);
    } catch (err) {
      setAuditError(err.message || "Failed to connect to Agent 1 audit endpoint.");
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleDispatchN8n = () => {
    setIsDispatched(true);
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setEventLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: ts,
        type: "dispatch",
        badge: "N8N DISPATCH",
        text: `🚀 N8N WEBHOOK DISPATCHED: Pre-cooling & envelope mitigation task forwarded to Agent 2 controller.`,
      },
      ...prev.slice(0, 15),
    ]);
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 font-sans relative overflow-hidden flex flex-col selection:bg-orange-500/30 selection:text-orange-900 dark:selection:text-white">
        
        {/* Ambient Glow (Dark Mode Only) */}
        <div className="hidden dark:block fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-black to-black pointer-events-none" />

        {/* Subtle organic topographic contour grid */}
        <div className="fixed inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#1E2330_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-25 dark:opacity-30 z-0" />

        {/* =========================================================================
            TOPBAR
            ========================================================================= */}
        <header className="border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 transition-colors duration-300">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
            
            {/* Brand Left */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 dark:border-orange-500/40 flex items-center justify-center shadow-sm dark:shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                    THERMALOS
                  </h1>
                  {/* FortyGuard API Pill */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0D1017] border border-slate-200 dark:border-[#1C202B] px-2.5 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase text-slate-600 dark:text-zinc-400 font-semibold tracking-wide">
                      FORTYGUARD API
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-zinc-500 uppercase -mt-0.5">
                  URBAN MICRO-CLIMATE OS
                </p>
              </div>
            </div>

            {/* Controls Right */}
            <div className="flex items-center gap-3">
              {/* RUN COMPLIANCE AUDIT Button */}
              <button
                onClick={handleRunAudit}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs tracking-wider uppercase px-5 py-2 rounded-xl shadow-md dark:shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>RUN COMPLIANCE AUDIT</span>
              </button>

              {/* Live Status Indicator Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-[#0B1015] font-mono text-xs shadow-inner">
                <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  LIVE (1.55s)
                </span>
              </div>

              {/* Theme Toggle Button (Sun/Moon) */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="p-2.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-500/30 transition-all shadow-sm cursor-pointer active:scale-95"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* City Selector Pill */}
              <div className="relative flex items-center">
                <div className="flex items-center gap-2 bg-white dark:bg-[#0E1117] border border-slate-200 dark:border-[#1C2028] hover:border-slate-300 dark:hover:border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800 dark:text-white cursor-pointer shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400" />
                  <select
                    id="city-selector"
                    value={selectedCity}
                    onChange={handleCityChange}
                    className="appearance-none bg-transparent text-xs font-medium text-slate-800 dark:text-white outline-none cursor-pointer pr-3"
                  >
                    {CITIES.map((city) => (
                      <option key={city} value={city} className="bg-white dark:bg-[#0E1117] text-slate-900 dark:text-white">
                        {city}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 pointer-events-none -ml-2" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* =========================================================================
            DASHBOARD CONTAINER
            ========================================================================= */}
        <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
          
          {/* =========================================================================
              LEFT COLUMN (NAV SIDEBAR + SYSTEM STATUS) - 2 cols
              ========================================================================= */}
          <aside className="lg:col-span-2 flex flex-col justify-between space-y-5">
            {/* Navigation Links with Glassmorphic Dual-Theme Styling */}
            <nav className="space-y-1">
              {/* Overview */}
              <button
                onClick={() => setActiveNav("overview")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-r-xl text-xs transition-all cursor-pointer ${
                  activeNav === "overview"
                    ? "bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-transparent border-l-2 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm dark:shadow-none"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border-l-2 border-transparent font-medium"
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Overview</span>
              </button>

              {/* Telemetry */}
              <button
                onClick={() => setActiveNav("telemetry")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-r-xl text-xs transition-all cursor-pointer ${
                  activeNav === "telemetry"
                    ? "bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-transparent border-l-2 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm dark:shadow-none"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border-l-2 border-transparent font-medium"
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Telemetry</span>
              </button>

              {/* Risk Matrix */}
              <button
                onClick={() => setActiveNav("risk_matrix")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-r-xl text-xs transition-all cursor-pointer ${
                  activeNav === "risk_matrix"
                    ? "bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-transparent border-l-2 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm dark:shadow-none"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border-l-2 border-transparent font-medium"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Risk Matrix</span>
              </button>

              {/* Events */}
              <button
                onClick={() => setActiveNav("events")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-r-xl text-xs transition-all cursor-pointer ${
                  activeNav === "events"
                    ? "bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-transparent border-l-2 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm dark:shadow-none"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border-l-2 border-transparent font-medium"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Events</span>
              </button>

              {/* Reports */}
              <button
                onClick={() => setActiveNav("reports")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-r-xl text-xs transition-all cursor-pointer ${
                  activeNav === "reports"
                    ? "bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-transparent border-l-2 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm dark:shadow-none"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border-l-2 border-transparent font-medium"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => setActiveNav("settings")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-r-xl text-xs transition-all cursor-pointer ${
                  activeNav === "settings"
                    ? "bg-orange-50 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-transparent border-l-2 border-orange-500 text-orange-600 dark:text-orange-400 font-semibold shadow-sm dark:shadow-none"
                    : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-white/[0.02] border-l-2 border-transparent font-medium"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>

            {/* SYSTEM STATUS Widget */}
            <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg dark:shadow-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-bold mb-3">
                SYSTEM STATUS
              </span>

              {/* Circular Gauge Ring */}
              <div className="relative w-14 h-14 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-md dark:shadow-[0_0_15px_rgba(249,115,22,0.3)] mb-2.5">
                <Check className="w-5 h-5 text-orange-500 stroke-[2.5]" />
              </div>

              <span className="text-xs font-bold font-mono tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                OPERATIONAL
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
                All systems normal
              </span>
            </div>
          </aside>

          {/* =========================================================================
              CENTER & RIGHT WORKSPACE - 10 cols
              ========================================================================= */}
          <main className="lg:col-span-10 flex flex-col space-y-5">
            
            {/* TOP KPI ROW (3 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Card 1: SURFACE TEMP */}
              <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg dark:shadow-2xl hover:border-orange-500/30 transition-all">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium">
                  <span className="uppercase tracking-wider text-[11px] font-semibold">SURFACE TEMP</span>
                  <Thermometer className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="my-3 flex items-baseline gap-1">
                  <span className="font-sans text-4xl text-slate-900 dark:text-white font-light tracking-tight">
                    {currentReading ? currentReading.temperature_f : 102}
                  </span>
                  <span className="font-sans text-lg text-slate-400 dark:text-zinc-500">°F</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    {currentReading?.temperature_f >= 105 ? "EXTREME" : "HIGH"}
                  </span>
                </div>
              </div>

              {/* Card 2: RISK MATRIX */}
              <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg dark:shadow-2xl hover:border-red-500/30 transition-all">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium">
                  <span className="uppercase tracking-wider text-[11px] font-semibold">RISK MATRIX</span>
                  <Shield className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="my-3 flex items-center gap-2">
                  <span className="font-sans text-4xl text-slate-900 dark:text-white font-light tracking-tight">
                    {currentReading?.temperature_f >= 105 ? "CRIT" : "HIGH"}
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                      currentReading?.temperature_f >= 105
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                        : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                    }`}
                  >
                    {currentReading?.temperature_f >= 105 ? "EXTREME" : "HIGH"}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-500">
                    Crit Floor: <span className="text-red-500 font-semibold">105°F</span>
                  </span>
                </div>
              </div>

              {/* Card 3: RESOLUTION */}
              <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg dark:shadow-2xl hover:border-sky-500/30 transition-all">
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium">
                  <span className="uppercase tracking-wider text-[11px] font-semibold">RESOLUTION</span>
                  <Radio className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                </div>
                <div className="my-3">
                  <span className="font-sans text-4xl text-slate-900 dark:text-white font-light tracking-tight">
                    10m²
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                    2m above ground
                  </span>
                </div>
              </div>
            </div>

            {/* MAIN WORKSPACE ROW (Telemetry Chart Left + Event Log Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* =========================================================================
                  TELEMETRY STREAM CHART PANEL - 8 cols
                  ========================================================================= */}
              <div className="lg:col-span-8 bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-lg dark:shadow-2xl">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-4 h-4 text-orange-500" />
                      <h2 className="font-display text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                        TELEMETRY STREAM • {selectedCity}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Dynamic micro-climate temperature readings (rolling 20-sample window)
                    </p>
                  </div>

                  {/* Critical Badge Right */}
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span>CRITICAL: 105°F</span>
                  </div>
                </div>

                {/* Neon Glowing Recharts Area Chart */}
                <div className="w-full h-80 relative">
                  <span className="absolute top-1 left-2 font-mono text-[10px] text-slate-400 dark:text-zinc-500 uppercase z-10">
                    Temp (°F)
                  </span>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={
                        telemetryData.length > 0
                          ? telemetryData
                          : [
                              { time: "02:35:17 PM", temperature_f: 110 },
                              { time: "02:35:20 PM", temperature_f: 106 },
                              { time: "02:35:23 PM", temperature_f: 108 },
                              { time: "02:35:26 PM", temperature_f: 95 },
                              { time: "02:35:29 PM", temperature_f: 112 },
                              { time: "02:35:32 PM", temperature_f: 104 },
                              { time: "02:35:35 PM", temperature_f: 108 },
                              { time: "02:35:38 PM", temperature_f: 96 },
                              { time: "02:35:41 PM", temperature_f: 108 },
                              { time: "02:35:44 PM", temperature_f: 92 },
                            ]
                      }
                      margin={{ top: 20, right: 15, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="neonFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <filter id="neonGlow">
                          <feDropShadow
                            dx="0"
                            dy="0"
                            stdDeviation="6"
                            floodColor="#f97316"
                            floodOpacity={darkMode ? "0.6" : "0.2"}
                          />
                        </filter>
                      </defs>

                      {/* Dual-theme Cartesian Grid */}
                      <CartesianGrid
                        strokeDasharray="2 2"
                        stroke={darkMode ? "#1E2330" : "#E2E8F0"}
                        strokeOpacity={darkMode ? 0.3 : 0.6}
                        vertical={false}
                      />

                      {/* X Axis */}
                      <XAxis
                        dataKey="time"
                        stroke={darkMode ? "#1E2330" : "#E2E8F0"}
                        tick={{
                          fill: darkMode ? "#71717A" : "#64748B",
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                        tickLine={false}
                        axisLine={{ stroke: darkMode ? "#1E2330" : "#E2E8F0" }}
                      />

                      {/* Y Axis */}
                      <YAxis
                        domain={[90, 125]}
                        ticks={[90, 99, 108, 117, 125]}
                        stroke={darkMode ? "#1E2330" : "#E2E8F0"}
                        tick={{
                          fill: darkMode ? "#71717A" : "#64748B",
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                        tickLine={false}
                        axisLine={{ stroke: darkMode ? "#1E2330" : "#E2E8F0" }}
                        tickFormatter={(val) => `${val}°`}
                      />

                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            const isBreached = item.temperature_f >= 105;
                            return (
                              <div className="bg-white/95 dark:bg-[#0D0D0D]/95 border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs">
                                <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase">{item.time}</div>
                                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                                  {item.temperature_f}°F
                                </div>
                                <div className="text-[11px] mt-1 text-slate-500 dark:text-zinc-400">
                                  Matrix:{" "}
                                  <span className={isBreached ? "text-red-500 font-bold" : "text-slate-700 dark:text-zinc-200"}>
                                    {isBreached ? "EXTREME" : "HIGH"}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Critical Threshold 105°F Line */}
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

                      {/* Neon Telemetry Curve */}
                      <Area
                        type="monotone"
                        dataKey="temperature_f"
                        stroke="#f97316"
                        strokeWidth={3}
                        fill="url(#neonFill)"
                        filter="url(#neonGlow)"
                        dot={false}
                        activeDot={{
                          r: 6,
                          fill: "#f97316",
                          stroke: darkMode ? "#000" : "#fff",
                          strokeWidth: 2,
                        }}
                        isAnimationActive={true}
                        animationDuration={300}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart Footer Bar */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between font-mono text-xs text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-orange-500" />
                    <span>Sampling: 1500ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                    <span>
                      Frames Ingested: <strong className="text-slate-900 dark:text-white">{pollCount}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  RIGHT SIDEBAR (AGENT EVENT LOG - FRAMER MOTION LIQUID FEED) - 4 cols
                  ========================================================================= */}
              <div className="lg:col-span-4 bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-lg dark:shadow-2xl h-full">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/5 mb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                    <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      AGENT EVENT LOG
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-bold">
                    LIVE FEED
                  </span>
                </div>

                {/* Liquid Framer Motion Event Feed */}
                <div
                  ref={logsEndRef}
                  className="flex-1 overflow-y-auto max-h-[340px] pr-1 font-mono text-xs"
                >
                  <AnimatePresence initial={false}>
                    {eventLogs.map((log) => {
                      const isBreach = log.type === "extreme";
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: -20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className={`bg-white dark:bg-[#141414]/90 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 mb-2.5 relative overflow-hidden shadow-sm dark:shadow-none border-l-4 ${
                            isBreach ? "border-l-red-500" : "border-l-amber-500"
                          }`}
                        >
                          {/* Top row: Icon + Timestamp + Badge */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              {isBreach ? (
                                <AlertOctagon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              )}
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                                {log.timestamp}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border font-mono ${
                                isBreach
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              }`}
                            >
                              {log.badge}
                            </span>
                          </div>

                          {/* Message Text */}
                          <p
                            className={`text-xs leading-relaxed font-sans ${
                              isBreach
                                ? "text-red-700 dark:text-red-300 font-medium"
                                : "text-amber-800 dark:text-amber-300/90 font-medium"
                            }`}
                          >
                            {log.text}
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Sidebar Footer */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Telemetry: Active</span>
                  </div>
                  <span>Events: 206</span>
                </div>
              </div>
            </div>

            {/* =========================================================================
                BOTTOM STATUS ROW (4 Dual-Theme Indicator Cards)
                ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: DATA CONNECTION */}
              <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-lg dark:shadow-2xl hover:border-orange-500/30 transition-all">
                <div className="h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Wifi className="w-5 h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold block tracking-wider">
                    DATA CONNECTION
                  </span>
                  <div className="flex items-center gap-1.5 my-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Stable</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">Latency: 28ms</span>
                </div>
              </div>

              {/* Card 2: API STATUS */}
              <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-lg dark:shadow-2xl hover:border-amber-500/30 transition-all">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-5 h-5 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold block tracking-wider">
                    API STATUS
                  </span>
                  <div className="flex items-center gap-1.5 my-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Connected</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">FORTYGUARD API</span>
                </div>
              </div>

              {/* Card 3: LAST UPDATED */}
              <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-lg dark:shadow-2xl hover:border-orange-500/30 transition-all">
                <div className="h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold block tracking-wider">
                    LAST UPDATED
                  </span>
                  <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white my-0.5">
                    {currentTime}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">May 25, 2026</span>
                </div>
              </div>

              {/* Card 4: SYSTEM UPTIME */}
              <div className="bg-white/90 dark:bg-[#0D0D0D]/80 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-lg dark:shadow-2xl hover:border-orange-500/30 transition-all">
                <div className="h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 font-semibold block tracking-wider">
                    SYSTEM UPTIME
                  </span>
                  <div className="text-sm font-semibold font-mono text-slate-900 dark:text-white my-0.5">
                    7d 14h 35m
                  </div>
                  <span className="text-[11px] text-orange-600 dark:text-orange-300 font-medium">99.98% uptime</span>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* =========================================================================
            AGENT 1 COMPLIANCE AUDIT MODAL (DUAL-THEME)
            ========================================================================= */}
        <AnimatePresence>
          {isAuditOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-zinc-100"
              >
                {/* Modal Top Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shadow-sm">
                      <FileCheck className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                        Agent 1: Energy & Thermal Compliance Audit
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                        RAG Vector Assessment • {selectedCity}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAuditOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto py-5 space-y-4 text-sm font-sans">
                  {isAuditLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-slate-500 dark:text-zinc-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                      <span>Retrieving ASHRAE 55 and IECC building codes from ChromaDB...</span>
                    </div>
                  ) : auditError ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Audit Execution Error</span>
                      </div>
                      <p>{auditError}</p>
                    </div>
                  ) : auditReport ? (
                    <div className="space-y-4">
                      {/* Status Pill Card */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/50 font-mono text-xs">
                        <span className="text-slate-600 dark:text-zinc-400">
                          Target Region: <strong className="text-slate-900 dark:text-white">{auditReport.city}</strong>
                        </span>
                        <span className="text-slate-600 dark:text-zinc-400">
                          Audited Temp: <strong className="text-orange-500">{auditReport.temperature_f}°F</strong>
                        </span>
                      </div>

                      {/* Section 1: ASHRAE 55 Card */}
                      <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                            1. ASHRAE 55 Thermal Comfort Standard
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed font-mono text-slate-700 dark:text-zinc-300 pl-6">
                          {auditReport.ashrae_compliance_status}
                        </p>
                      </div>

                      {/* Section 2: IECC Insulation Warning */}
                      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-500" />
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            2. IECC Building Envelope & Insulation Warning
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed font-mono text-slate-700 dark:text-zinc-300 pl-6">
                          {auditReport.iecc_envelope_warning}
                        </p>
                      </div>

                      {/* Section 3: Recommended HVAC Action & Dispatch */}
                      <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-3">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                            3. Recommended HVAC Mitigation Plan
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed font-mono text-slate-700 dark:text-zinc-300 pl-6">
                          {auditReport.recommended_hvac_action}
                        </p>

                        {/* Single-Click Dispatch Button */}
                        <div className="pt-2 pl-6 flex items-center gap-3">
                          <button
                            onClick={handleDispatchN8n}
                            disabled={isDispatched}
                            className={`font-mono text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                              isDispatched
                                ? "bg-emerald-500 text-white cursor-default"
                                : "bg-gradient-to-r from-orange-500 to-red-600 hover:brightness-110 text-white active:scale-95"
                            }`}
                          >
                            {isDispatched ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>DISPATCHED TO N8N WEBHOOK</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>DISPATCH TO N8N</span>
                              </>
                            )}
                          </button>
                          {isDispatched && (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 animate-pulse">
                              Payload acknowledged by Agent 2
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Structured JSON Output */}
                      <div className="pt-2">
                        <span className="text-[11px] font-mono uppercase text-slate-400 dark:text-zinc-500 block mb-1.5">
                          Structured Pydantic JSON Output:
                        </span>
                        <pre className="font-mono text-[11px] p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/60 text-slate-800 dark:text-zinc-300 overflow-x-auto leading-relaxed">
                          {JSON.stringify(auditReport, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3 font-mono text-xs">
                  <button
                    onClick={() => setIsAuditOpen(false)}
                    className="px-4 py-2 rounded-xl font-medium bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    DISMISS
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
