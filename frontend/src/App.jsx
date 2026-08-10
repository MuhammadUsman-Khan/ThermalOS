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
  const [activeNav, setActiveNav] = useState("overview");
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

  // Audit Modal State
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [isDispatched, setIsDispatched] = useState(false);

  const logsEndRef = useRef(null);

  // Live clock
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

        // Trigger log alerts
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
    <div className="min-h-screen bg-[#07080A] text-zinc-100 flex flex-col relative selection:bg-[#FF5500]/30 selection:text-white font-sans overflow-x-hidden">
      {/* Top Atmospheric Red/Orange Ambient Glow */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(255,60,0,0.18),transparent_70%)] pointer-events-none z-0" />
      {/* Subtle organic topographic contour grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1A1E26_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40 z-0" />

      {/* TOPBAR */}
      <header className="border-b border-[#141720] bg-[#07080A]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          {/* Brand Left */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#FF5500]/20 to-[#D43000]/10 border border-[#FF5500]/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,85,0,0.35)]">
              <Flame className="w-5 h-5 text-[#FF5500]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-base font-bold tracking-tight text-white uppercase">
                  THERMALOS
                </h1>
                {/* FortyGuard API Pill */}
                <div className="flex items-center gap-1.5 bg-[#0D1017] border border-[#1C202B] px-2.5 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  <span className="text-[10px] font-mono uppercase text-zinc-300 font-semibold tracking-wide">
                    FORTYGUARD API
                  </span>
                </div>
              </div>
              <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase -mt-0.5">
                URBAN MICRO-CLIMATE OS
              </p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-3">
            {/* RUN COMPLIANCE AUDIT Button with Vibrant Neon Glow */}
            <button
              onClick={handleRunAudit}
              className="bg-gradient-to-r from-[#FF5500] via-[#FF6B00] to-[#E63B00] hover:from-[#FF6611] hover:to-[#F04400] text-white font-display text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-[0_0_25px_rgba(255,85,0,0.55)] border border-[#FFA066]/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-white" />
              <span>RUN COMPLIANCE AUDIT</span>
            </button>

            {/* Live Indicator Pill */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-[#0B1015] font-mono text-xs shadow-inner">
              <Activity className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">
                LIVE (1.55s)
              </span>
            </div>

            {/* Settings/Sun Button */}
            <button className="p-2.5 rounded-xl bg-[#0E1117] border border-[#1C2028] text-zinc-400 hover:text-zinc-200 transition-colors">
              <Sun className="w-4 h-4" />
            </button>

            {/* City Selector Pill */}
            <div className="relative flex items-center">
              <div className="flex items-center gap-2 bg-[#0E1117] border border-[#1C2028] hover:border-zinc-700 px-3.5 py-2 rounded-xl text-xs font-medium text-white cursor-pointer shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  id="city-selector"
                  value={selectedCity}
                  onChange={handleCityChange}
                  className="appearance-none bg-transparent text-xs font-medium text-white outline-none cursor-pointer pr-4"
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city} className="bg-[#0E1117] text-white">
                      {city}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 pointer-events-none -ml-3" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* =========================================================================
            LEFT COLUMN (NAV SIDEBAR + SYSTEM STATUS) - 2 cols
            ========================================================================= */}
        <aside className="lg:col-span-2 flex flex-col justify-between space-y-5">
          {/* Navigation Links */}
          <nav className="space-y-2">
            {/* Overview - Active Glowing Red-Orange */}
            <button
              onClick={() => setActiveNav("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs tracking-wide transition-all cursor-pointer ${
                activeNav === "overview"
                  ? "bg-gradient-to-r from-[#FF4500] to-[#D43000] text-white shadow-[0_0_20px_rgba(255,69,0,0.45)] border border-[#FF7733]/30 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#0E1117] border border-transparent"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Overview</span>
            </button>

            {/* Telemetry */}
            <button
              onClick={() => setActiveNav("telemetry")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs tracking-wide transition-all cursor-pointer ${
                activeNav === "telemetry"
                  ? "bg-gradient-to-r from-[#FF4500] to-[#D43000] text-white shadow-[0_0_20px_rgba(255,69,0,0.45)] border border-[#FF7733]/30 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#0E1117] border border-transparent"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Telemetry</span>
            </button>

            {/* Risk Matrix */}
            <button
              onClick={() => setActiveNav("risk_matrix")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs tracking-wide transition-all cursor-pointer ${
                activeNav === "risk_matrix"
                  ? "bg-gradient-to-r from-[#FF4500] to-[#D43000] text-white shadow-[0_0_20px_rgba(255,69,0,0.45)] border border-[#FF7733]/30 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#0E1117] border border-transparent"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Risk Matrix</span>
            </button>

            {/* Events */}
            <button
              onClick={() => setActiveNav("events")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs tracking-wide transition-all cursor-pointer ${
                activeNav === "events"
                  ? "bg-gradient-to-r from-[#FF4500] to-[#D43000] text-white shadow-[0_0_20px_rgba(255,69,0,0.45)] border border-[#FF7733]/30 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#0E1117] border border-transparent"
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Events</span>
            </button>

            {/* Reports */}
            <button
              onClick={() => setActiveNav("reports")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs tracking-wide transition-all cursor-pointer ${
                activeNav === "reports"
                  ? "bg-gradient-to-r from-[#FF4500] to-[#D43000] text-white shadow-[0_0_20px_rgba(255,69,0,0.45)] border border-[#FF7733]/30 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#0E1117] border border-transparent"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Reports</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setActiveNav("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs tracking-wide transition-all cursor-pointer ${
                activeNav === "settings"
                  ? "bg-gradient-to-r from-[#FF4500] to-[#D43000] text-white shadow-[0_0_20px_rgba(255,69,0,0.45)] border border-[#FF7733]/30 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#0E1117] border border-transparent"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* SYSTEM STATUS Widget */}
          <div className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-5 flex flex-col items-center text-center shadow-lg">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-4">
              SYSTEM STATUS
            </span>

            {/* Circular Gauge Ring */}
            <div className="relative w-18 h-18 rounded-full border-3 border-[#FF5500] flex items-center justify-center shadow-[0_0_20px_rgba(255,85,0,0.45)] mb-3.5">
              <Check className="w-6 h-6 text-[#FF5500] stroke-[3]" />
            </div>

            <span className="text-xs font-bold font-mono tracking-wider text-[#10B981] uppercase">
              OPERATIONAL
            </span>
            <span className="text-[11px] text-zinc-500 mt-0.5">
              All systems normal
            </span>
          </div>
        </aside>

        {/* =========================================================================
            CENTER & RIGHT WORKSPACE - 10 cols
            ========================================================================= */}
        <div className="lg:col-span-10 flex flex-col space-y-5">
          {/* TOP KPI ROW (3 Cards - Quota Removed as requested) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: SURFACE TEMP */}
            <div className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#FF5500]/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                <span className="uppercase tracking-wider text-[11px]">SURFACE TEMP</span>
                <Thermometer className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="my-2.5 flex items-baseline gap-1">
                <span className="font-display text-4xl text-white font-bold tracking-tight">
                  {currentReading ? currentReading.temperature_f : 102}
                </span>
                <span className="font-display text-xl text-zinc-400">°F</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/40">
                  {currentReading?.temperature_f >= 105 ? "EXTREME" : "HIGH"}
                </span>
                {/* Mini Orange Sparkline */}
                <svg className="w-24 h-6 overflow-visible" viewBox="0 0 100 24">
                  <path
                    d="M0,18 Q15,4 30,14 T60,8 T100,12"
                    fill="none"
                    stroke="#FF5500"
                    strokeWidth="2"
                    className="drop-shadow-[0_0_6px_rgba(255,85,0,0.8)]"
                  />
                </svg>
              </div>
            </div>

            {/* Card 2: RISK MATRIX */}
            <div className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#FF3B3B]/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                <span className="uppercase tracking-wider text-[11px]">RISK MATRIX</span>
                <Shield className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="my-2.5">
                <span className="font-display text-3xl font-bold uppercase tracking-tight text-[#FF3B3B]">
                  {currentReading?.temperature_f >= 105 ? "EXTREME" : "HIGH"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-zinc-500">
                  Crit Floor: <span className="text-[#FF3B3B] font-semibold">105°F</span>
                </span>
                {/* Mini Red Sparkline */}
                <svg className="w-24 h-6 overflow-visible" viewBox="0 0 100 24">
                  <path
                    d="M0,14 Q20,20 40,10 T80,18 T100,6"
                    fill="none"
                    stroke="#FF3B3B"
                    strokeWidth="2"
                    className="drop-shadow-[0_0_6px_rgba(255,59,59,0.8)]"
                  />
                </svg>
              </div>
            </div>

            {/* Card 3: RESOLUTION */}
            <div className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-sky-500/40 transition-colors">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
                <span className="uppercase tracking-wider text-[11px]">RESOLUTION</span>
                <Radio className="w-4 h-4 text-sky-400" />
              </div>
              <div className="my-2.5">
                <span className="font-display text-3xl font-bold text-white">
                  10m²
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  2m above ground
                </span>
                {/* Mini Cyan Sparkline */}
                <svg className="w-24 h-6 overflow-visible" viewBox="0 0 100 24">
                  <path
                    d="M0,16 Q25,8 50,14 T80,6 T100,10"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2"
                    className="drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* MAIN WORKSPACE ROW (Telemetry Chart Left + Event Log Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* =========================================================================
                TELEMETRY STREAM CHART PANEL - 8 cols
                ========================================================================= */}
            <div className="lg:col-span-8 bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-5 flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1A1E26]">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-[#FF5500]" />
                    <h2 className="font-display text-sm font-bold uppercase tracking-tight text-white">
                      TELEMETRY STREAM • {selectedCity}
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Dynamic micro-climate temperature readings (rolling 20-sample window)
                  </p>
                </div>

                {/* Critical Badge Right */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span>CRITICAL: 105°F</span>
                </div>
              </div>

              {/* Glowing Recharts Area Chart */}
              <div className="w-full h-80 relative">
                <span className="absolute top-1 left-2 font-mono text-[10px] text-zinc-500 uppercase z-10">
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
                      <linearGradient id="neonGlowRedOrange" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF4500" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#FF4500" stopOpacity={0.0} />
                      </linearGradient>
                      <filter id="glowPath" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FF4500" floodOpacity="0.8" />
                      </filter>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#161922"
                      opacity={0.7}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      tickLine={false}
                      axisLine={{ stroke: "#1A1E26" }}
                    />

                    <YAxis
                      domain={[90, 125]}
                      ticks={[90, 99, 108, 117, 125]}
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      tickLine={false}
                      axisLine={{ stroke: "#1A1E26" }}
                      tickFormatter={(val) => `${val}°`}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isBreached = item.temperature_f >= 105;
                          return (
                            <div className="bg-[#0B0D12]/95 border border-[#1A1E26] p-3 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs">
                              <div className="text-[10px] text-zinc-500 uppercase">{item.time}</div>
                              <div className="text-base font-bold text-white mt-0.5">
                                {item.temperature_f}°F
                              </div>
                              <div className="text-[11px] mt-1 text-zinc-400">
                                Matrix:{" "}
                                <span className={isBreached ? "text-[#FF3B3B] font-bold" : "text-zinc-200"}>
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
                      strokeDasharray="5 5"
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

                    {/* Glowing Area Fill */}
                    <Area
                      type="monotone"
                      dataKey="temperature_f"
                      fill="url(#neonGlowRedOrange)"
                      stroke="none"
                    />

                    {/* Vibrant Neon Stroke */}
                    <Area
                      type="monotone"
                      dataKey="temperature_f"
                      stroke="#FF4500"
                      strokeWidth={3}
                      fill="none"
                      dot={{ r: 3, fill: "#FF4500", stroke: "#07080A", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#FF6B00", stroke: "#FFF", strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={300}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Footer Bar */}
              <div className="mt-3 pt-3 border-t border-[#1A1E26] flex items-center justify-between font-mono text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>Sampling: 1500ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  <span>
                    Frames Ingested: <strong className="text-white">{pollCount}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* =========================================================================
                RIGHT SIDEBAR (AGENT EVENT LOG) - 4 cols
                ========================================================================= */}
            <div className="lg:col-span-4 bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-5 flex flex-col shadow-2xl h-full">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#1A1E26] mb-3">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-zinc-400" />
                  <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white">
                    AGENT EVENT LOG
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[#10B981] uppercase px-2 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 font-bold">
                  LIVE FEED
                </span>
              </div>

              {/* Scrollable Event Feed matching the exact card designs */}
              <div
                ref={logsEndRef}
                className="flex-1 overflow-y-auto space-y-2.5 max-h-[340px] pr-1 font-mono text-xs"
              >
                {eventLogs.map((log) => {
                  const isBreach = log.type === "extreme";
                  return (
                    <div
                      key={log.id}
                      className="bg-[#0E1117] border border-[#1C2028] rounded-xl p-3 space-y-1.5 hover:border-zinc-700 transition-colors"
                    >
                      {/* Top row: Icon + Timestamp + Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isBreach ? (
                            <AlertOctagon className="w-3.5 h-3.5 text-[#FF3B3B]" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {log.timestamp}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                            isBreach
                              ? "bg-[#FF3B3B]/15 text-[#FF3B3B] border-[#FF3B3B]/30"
                              : "bg-amber-400/15 text-amber-400 border-amber-400/30"
                          }`}
                        >
                          {log.badge}
                        </span>
                      </div>

                      {/* Message Text */}
                      <p
                        className={`text-xs leading-relaxed font-sans ${
                          isBreach ? "text-[#FF6B74] font-medium" : "text-amber-300/90"
                        }`}
                      >
                        {log.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar Footer */}
              <div className="mt-3 pt-3 border-t border-[#1A1E26] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  <span>Telemetry: Active</span>
                </div>
                <span>Events: 206</span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              BOTTOM STATUS ROW (4 Rich Indicator Cards)
              ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: DATA CONNECTION */}
            <div className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-4 flex items-center gap-4 shadow-lg">
              <div className="h-12 w-12 rounded-full bg-[#FF5500]/15 border border-[#FF5500]/30 flex items-center justify-center flex-shrink-0">
                <Wifi className="w-5 h-5 text-[#FF5500]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block tracking-wider">
                  DATA CONNECTION
                </span>
                <div className="flex items-center gap-1.5 my-0.5">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <span className="text-sm font-bold text-white">Stable</span>
                </div>
                <span className="text-[11px] text-zinc-500">Latency: 28ms</span>
              </div>
            </div>

            {/* Card 2: API STATUS */}
            <div className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-4 flex items-center gap-4 shadow-lg">
              <div className="h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Cloud className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block tracking-wider">
                  API STATUS
                </span>
                <div className="flex items-center gap-1.5 my-0.5">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <span className="text-sm font-bold text-white">Connected</span>
                </div>
                <span className="text-[11px] text-zinc-500">FORTYGUARD API</span>
              </div>
            </div>

            {/* Card 3: LAST UPDATED */}
            <div className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl p-4 flex items-center gap-4 shadow-lg">
              <div className="h-12 w-12 rounded-full bg-[#FF5500]/15 border border-[#FF5500]/30 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-[#FF5500]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block tracking-wider">
                  LAST UPDATED
                </span>
                <div className="text-sm font-bold font-mono text-white my-0.5">
                  {currentTime}
                </div>
                <span className="text-[11px] text-zinc-500">May 25, 2026</span>
              </div>
            </div>

            {/* Card 4: SYSTEM UPTIME with Glowing Red-Orange Gradient Background */}
            <div className="bg-gradient-to-r from-[#180A05] via-[#2A1005] to-[#451605] border border-[#FF5500]/40 rounded-2xl p-4 flex items-center gap-4 shadow-[0_0_20px_rgba(255,85,0,0.2)]">
              <div className="h-12 w-12 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(255,85,0,0.4)]">
                <Shield className="w-5 h-5 text-[#FF5500]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-zinc-300 font-semibold block tracking-wider">
                  SYSTEM UPTIME
                </span>
                <div className="text-sm font-bold font-mono text-white my-0.5">
                  7d 14h 35m
                </div>
                <span className="text-[11px] text-[#FFA066]">99.98% uptime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          AGENT 1 COMPLIANCE AUDIT MODAL
          ========================================================================= */}
      <AnimatePresence>
        {isAuditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#0B0D12] border border-[#1A1E26] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1A1E26]">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#FF5500]/20 border border-[#FF5500]/40 flex items-center justify-center shadow-[0_0_12px_rgba(255,85,0,0.3)]">
                    <FileCheck className="w-5 h-5 text-[#FF5500]" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold uppercase tracking-tight text-white">
                      Agent 1: Energy & Thermal Compliance Audit
                    </h2>
                    <p className="text-xs text-zinc-400 font-mono">
                      RAG Vector Assessment • {selectedCity}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1A1E26] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4 text-sm font-sans">
                {isAuditLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-zinc-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#FF5500]" />
                    <span>Retrieving ASHRAE 55 and IECC building codes from ChromaDB...</span>
                  </div>
                ) : auditError ? (
                  <div className="p-4 rounded-xl bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-[#FF3B3B] font-mono text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Audit Execution Error</span>
                    </div>
                    <p>{auditError}</p>
                  </div>
                ) : auditReport ? (
                  <div className="space-y-4">
                    {/* Status Pill Card */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-[#1A1E26] bg-[#07080A] font-mono text-xs">
                      <span className="text-zinc-400">
                        Target Region: <strong className="text-white">{auditReport.city}</strong>
                      </span>
                      <span className="text-zinc-400">
                        Audited Temp: <strong className="text-[#FF5500]">{auditReport.temperature_f}°F</strong>
                      </span>
                    </div>

                    {/* Section 1: ASHRAE 55 Card */}
                    <div className="p-4 rounded-xl border border-[#FF3B3B]/40 bg-[#FF3B3B]/5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#FF3B3B]" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF3B3B]">
                          1. ASHRAE 55 Thermal Comfort Standard
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-mono text-zinc-300 pl-6">
                        {auditReport.ashrae_compliance_status}
                      </p>
                    </div>

                    {/* Section 2: IECC Insulation Warning */}
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                          2. IECC Building Envelope & Insulation Warning
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-mono text-zinc-300 pl-6">
                        {auditReport.iecc_envelope_warning}
                      </p>
                    </div>

                    {/* Section 3: Recommended HVAC Action & Dispatch */}
                    <div className="p-4 rounded-xl border border-[#FF5500]/40 bg-[#FF5500]/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#FF5500]" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF5500]">
                          3. Recommended HVAC Mitigation Plan
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-mono text-zinc-300 pl-6">
                        {auditReport.recommended_hvac_action}
                      </p>

                      {/* Single-Click Dispatch Button */}
                      <div className="pt-2 pl-6 flex items-center gap-3">
                        <button
                          onClick={handleDispatchN8n}
                          disabled={isDispatched}
                          className={`font-mono text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                            isDispatched
                              ? "bg-[#10B981] text-black cursor-default"
                              : "bg-[#FF5500] hover:bg-[#E04800] text-white shadow-[0_0_15px_rgba(255,85,0,0.4)] active:scale-95"
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
                          <span className="text-[11px] font-mono text-[#10B981] animate-pulse">
                            Payload acknowledged by Agent 2
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Structured JSON Output */}
                    <div className="pt-2">
                      <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1.5">
                        Structured Pydantic JSON Output:
                      </span>
                      <pre className="font-mono text-[11px] p-3.5 rounded-xl border border-[#1A1E26] bg-[#07080A] text-zinc-300 overflow-x-auto leading-relaxed">
                        {JSON.stringify(auditReport, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[#1A1E26] flex items-center justify-end gap-3 font-mono text-xs">
                <button
                  onClick={() => setIsAuditOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium bg-[#141720] hover:bg-[#1C202B] text-zinc-300 transition-colors cursor-pointer"
                >
                  DISMISS
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
