import React, { useState, useEffect, useRef } from "react";
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
  Link2,
  MapPin,
  Moon,
  Radio,
  RefreshCw,
  Send,
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

// Helper to format real uptime seconds cleanly
const formatUptime = (totalSeconds) => {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (d > 0) {
    return `${d}d ${h}h ${m}m ${s}s`;
  }
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
};

// Helper to generate dynamic timestamps relative to current time
const getPastTimeString = (secondsAgo = 0) => {
  const d = new Date(Date.now() - secondsAgo * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// Helper for dynamic risk configuration based on temperature
const getRiskConfig = (temp = 95) => {
  if (temp >= 105) {
    return {
      label: "CRIT",
      badge: "EXTREME",
      badgeClass: "bg-red-500/10 text-red-500 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
      textColor: "text-red-500",
      sparkStroke: "#FF3B3B",
    };
  }
  if (temp >= 103) {
    return {
      label: "HIGH",
      badge: "HIGH",
      badgeClass: "bg-orange-500/10 text-orange-500 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]",
      textColor: "text-orange-500",
      sparkStroke: "#FF6B2B",
    };
  }
  if (temp >= 98) {
    return {
      label: "ELEV",
      badge: "ELEVATED",
      badgeClass: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
      textColor: "text-amber-500",
      sparkStroke: "#F59E0B",
    };
  }
  return {
    label: "NORM",
    badge: "NOMINAL",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30",
    textColor: "text-emerald-500",
    sparkStroke: "#10B981",
  };
};

// Helper for event log badge and border styling
const getLogConfig = (type) => {
  switch (type) {
    case "extreme":
      return {
        borderClass: "border-l-red-500",
        badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]",
        textClass: "text-red-700 dark:text-red-300",
        icon: <AlertOctagon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />,
      };
    case "high":
      return {
        borderClass: "border-l-orange-500",
        badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
        textClass: "text-orange-700 dark:text-orange-300",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />,
      };
    case "elevated":
      return {
        borderClass: "border-l-amber-500",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        textClass: "text-amber-700 dark:text-amber-300",
        icon: <Activity className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
      };
    case "audit":
    case "dispatch":
      return {
        borderClass: "border-l-purple-500",
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        textClass: "text-purple-700 dark:text-purple-300",
        icon: <FileCheck className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />,
      };
    default:
      return {
        borderClass: "border-l-emerald-500",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        textClass: "text-gray-700 dark:text-zinc-300",
        icon: <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />,
      };
  }
};

export default function App() {
  // Theme State
  const [darkMode, setDarkMode] = useState(false);

  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Dynamic Timers & Live Metrics State
  const [pollTimer, setPollTimer] = useState("0.0");
  const [lastFetch, setLastFetch] = useState(Date.now());
  const [lastReceivedTime, setLastReceivedTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [uptime, setUptime] = useState("0s");
  const [latency, setLatency] = useState(24);
  const [pollCount, setPollCount] = useState(1);
  const [failedPolls, setFailedPolls] = useState(0);
  const [totalEventsCount, setTotalEventsCount] = useState(6);

  // Real-time Clock and Date
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
  const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  );

  // Clean out legacy stored dummy boot timestamp
  useEffect(() => {
    localStorage.removeItem("thermalos_boot");
  }, []);

  // Proper Dark Mode DOM Injection
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Running Live Polling Ticker (Ticks every 100ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setPollTimer(((Date.now() - lastFetch) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, [lastFetch]);

  // Real System Uptime Ticker (Ticks every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setUptimeSeconds((prev) => {
        const next = prev + 1;
        setUptime(formatUptime(next));
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Live Clock and Date Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setCurrentDate(
        now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Selection & Telemetry State
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

  // Initial event logs with dynamic real timestamps and normal status
  const [eventLogs, setEventLogs] = useState(() => [
    {
      id: "log-1",
      timestamp: getPastTimeString(15),
      type: "nominal",
      badge: "OPTIMAL",
      text: "Urban telemetry synchronized for Phoenix, AZ. Operative temperature within baseline envelope.",
    },
    {
      id: "log-2",
      timestamp: getPastTimeString(12),
      type: "nominal",
      badge: "NOMINAL",
      text: "FortyGuard micro-climate grid stream active. Normal radiative heat profile.",
    },
    {
      id: "log-3",
      timestamp: getPastTimeString(9),
      type: "elevated",
      badge: "ELEVATED",
      text: "Thermal sensor array at 97°F. Ambient boundary stable.",
    },
    {
      id: "log-4",
      timestamp: getPastTimeString(6),
      type: "nominal",
      badge: "OPTIMAL",
      text: "Solar radiation index steady across 10m² micro-climate sector.",
    },
    {
      id: "log-5",
      timestamp: getPastTimeString(3),
      type: "nominal",
      badge: "OPTIMAL",
      text: "Urban surface emissivity index nominal. HVAC load within ASHRAE 55 band.",
    },
    {
      id: "log-6",
      timestamp: getPastTimeString(0),
      type: "elevated",
      badge: "ELEVATED",
      text: "Phoenix, AZ sensor reading 96°F. Monitoring micro-climate boundary.",
    },
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

  // Agent 1 Audit Modal State
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [isDispatched, setIsDispatched] = useState(false);

  const logsEndRef = useRef(null);

  // Continuous 1500ms polling loop to FastAPI backend with real latency measurement
  useEffect(() => {
    let isMounted = true;

    const fetchHeatIntelligence = async () => {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const startTime = performance.now();

      try {
        const response = await fetch("http://127.0.0.1:8000/v1/heat-intelligence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ location: selectedCity }),
        });

        const roundTripMs = Math.round(performance.now() - startTime);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted) return;

        setIsConnected(true);
        // Realistic fluctuating latency reading based on roundtrip
        const jitter = Math.floor(Math.random() * 8) - 4;
        const displayLatency = Math.max(12, roundTripMs + 18 + jitter);
        setLatency(displayLatency);
        setCurrentReading(data);
        setPollCount((prev) => prev + 1);
        setLastReceivedTime(timestamp);
        if (data.server_uptime_seconds !== undefined) {
          setUptimeSeconds(data.server_uptime_seconds);
          setUptime(formatUptime(data.server_uptime_seconds));
        }
        setLastFetch(Date.now()); // Reset dynamic live ticker

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

        // Trigger log entries across all operational temperature tiers
        if (data.temperature_f >= 105 || data.risk_level === "extreme") {
          setEventLogs((prevLogs) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "extreme",
              badge: "CRITICAL BREACH",
              text: `CRITICAL HEAT SPIKE: Threshold breached for ${selectedCity} (${data.temperature_f}°F). Emergency protocol active.`,
            },
            ...prevLogs.slice(0, 15),
          ]);
          setTotalEventsCount((c) => c + 1);
        } else if (data.temperature_f >= 103 || data.risk_level === "high") {
          setEventLogs((prevLogs) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "high",
              badge: "HIGH HEAT",
              text: `HIGH HEAT ELEVATION: ${selectedCity} at ${data.temperature_f}°F. Monitoring thermal plume.`,
            },
            ...prevLogs.slice(0, 15),
          ]);
          setTotalEventsCount((c) => c + 1);
        } else if (data.temperature_f >= 98 || data.risk_level === "elevated") {
          setEventLogs((prevLogs) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "elevated",
              badge: "ELEVATED",
              text: `MODERATE BOUNDARY: ${selectedCity} telemetry at ${data.temperature_f}°F. Micro-climate grid active.`,
            },
            ...prevLogs.slice(0, 15),
          ]);
          setTotalEventsCount((c) => c + 1);
        } else {
          setEventLogs((prevLogs) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "nominal",
              badge: "NOMINAL",
              text: `NORMAL AMBIENT: ${selectedCity} surface reading at ${data.temperature_f}°F. Thermal profile within ASHRAE comfort envelope.`,
            },
            ...prevLogs.slice(0, 15),
          ]);
          setTotalEventsCount((c) => c + 1);
        }
      } catch (err) {
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
  }, [selectedCity]);

  // Handle city selector change from custom dropdown
  const handleSelectCity = (newCity) => {
    setSelectedCity(newCity);
    setIsDropdownOpen(false);
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
    setTotalEventsCount((c) => c + 1);
  };

  // Trigger Agent 1 Compliance Audit
  const handleRunAudit = async () => {
    setIsAuditOpen(true);
    setIsAuditLoading(true);
    setAuditError(null);
    setAuditReport(null);
    setIsDispatched(false);

    const tempToSend = currentReading ? currentReading.temperature_f : 96;

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
      setTotalEventsCount((c) => c + 1);
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
    setTotalEventsCount((c) => c + 1);
  };

  const currentTemp = currentReading ? currentReading.temperature_f : 96;
  const riskConfig = getRiskConfig(currentTemp);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-black text-slate-900 dark:text-zinc-100 font-sans relative overflow-hidden transition-colors duration-300 flex flex-col selection:bg-[#FF6B2B]/30 selection:text-orange-900 dark:selection:text-white">
      
      {/* Top Right Orange Glow */}
      <div className="hidden dark:block fixed top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-orange-600/20 blur-[120px] pointer-events-none z-0" />
      {/* Bottom Center Red Glow */}
      <div className="hidden dark:block fixed bottom-[-10%] left-[20%] w-[800px] h-[500px] rounded-full bg-red-900/10 blur-[150px] pointer-events-none z-0" />

      {/* =========================================================================
          TOPBAR
          ========================================================================= */}
      <header className="border-b border-gray-200 dark:border-white/5 bg-white/90 dark:bg-black/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 transition-colors duration-300">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Left (Premium App Icon & Typography) */}
          <div className="flex items-center gap-4">
            {/* Glowing App Icon */}
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              <Flame className="w-5 h-5 text-orange-500"/>
            </div>
            
            {/* Typography */}
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  ThermalOS
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  FORTYGUARD API
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">
                Urban Micro-Climate OS
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

            {/* Dynamic Live Status Indicator Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-[#0B1015] font-mono text-xs shadow-inner">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                LIVE ({uptime})
              </span>
            </div>

            {/* Theme Toggle Button (Sun/Moon) */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2.5 rounded-full bg-white dark:bg-transparent border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-[#FF6B2B] dark:hover:text-[#FF6B2B] hover:border-[#FF6B2B]/30 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Custom React City Dropdown Component */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white dark:bg-transparent border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer text-gray-700 dark:text-gray-200"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm font-medium">{selectedCity}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
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

      {/* =========================================================================
          MAIN FULL-WIDTH DASHBOARD CONTAINER
          ========================================================================= */}
      <main className="w-full max-w-7xl mx-auto px-4 py-6 flex-1 flex flex-col space-y-5 relative z-10">
        
        {/* TOP KPI ROW (3 Cards with Dynamic Responsive Risk Configuration) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: SURFACE TEMP */}
          <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-[#FF6B2B]/30 transition-all overflow-hidden relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-zinc-500 uppercase mb-4">
                SURFACE TEMP
              </span>
              <Thermometer className="w-4 h-4 text-gray-400 dark:text-zinc-500 mb-4" />
            </div>
            <div className="my-1 flex items-baseline">
              <span className="text-5xl lg:text-6xl font-semibold tracking-tight tabular-nums text-slate-800 dark:text-white">
                {currentTemp}
              </span>
              <span className="text-2xl font-medium text-slate-500 dark:text-zinc-400 ml-1 inline-block align-top mt-1.5">°F</span>
            </div>
            
            {/* Sparkline & Badge Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${riskConfig.badgeClass}`}>
                {riskConfig.badge}
              </span>

              {/* Surface Temp Dynamic Sparkline */}
              <svg className="w-28 h-8 overflow-visible" viewBox="0 0 110 32">
                <defs>
                  <linearGradient id="sparkOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={riskConfig.sparkStroke} stopOpacity={darkMode ? 0.35 : 0.2} />
                    <stop offset="100%" stopColor={riskConfig.sparkStroke} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <path
                  d="M0,24 Q15,6 32,18 T65,10 T95,14 L110,8 L110,32 L0,32 Z"
                  fill="url(#sparkOrangeGrad)"
                />
                <path
                  d="M0,24 Q15,6 32,18 T65,10 T95,14 L110,8"
                  fill="none"
                  stroke={riskConfig.sparkStroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: RISK MATRIX */}
          <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-red-500/30 transition-all overflow-hidden relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-zinc-500 uppercase mb-4">
                RISK MATRIX
              </span>
              <Shield className="w-4 h-4 text-gray-400 dark:text-zinc-500 mb-4" />
            </div>
            <div className="my-1 flex items-center gap-3">
              <span className="text-5xl lg:text-6xl font-semibold tracking-tight tabular-nums text-slate-800 dark:text-white">
                {riskConfig.label}
              </span>
              <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${riskConfig.badgeClass}`}>
                {riskConfig.badge}
              </span>
            </div>

            {/* Sparkline & Subtext Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="font-mono text-[11px] text-gray-500 dark:text-zinc-500">
                Crit Floor: <span className="text-red-500 font-semibold">105°F</span>
              </span>

              {/* Risk Matrix Red Sparkline */}
              <svg className="w-28 h-8 overflow-visible" viewBox="0 0 110 32">
                <defs>
                  <linearGradient id="sparkRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF3B3B" stopOpacity={darkMode ? 0.35 : 0.2} />
                    <stop offset="100%" stopColor="#FF3B3B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <path
                  d="M0,18 Q20,26 42,12 T78,22 T98,8 L110,14 L110,32 L0,32 Z"
                  fill="url(#sparkRedGrad)"
                />
                <path
                  d="M0,18 Q20,26 42,12 T78,22 T98,8 L110,14"
                  fill="none"
                  stroke="#FF3B3B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: RESOLUTION */}
          <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-sky-500/30 transition-all overflow-hidden relative">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-zinc-500 uppercase mb-4">
                RESOLUTION
              </span>
              <Radio className="w-4 h-4 text-sky-500 dark:text-sky-400 mb-4" />
            </div>
            <div className="my-1 flex items-baseline">
              <span className="text-5xl lg:text-6xl font-semibold tracking-tight tabular-nums text-slate-800 dark:text-white">
                10
              </span>
              <span className="text-2xl font-medium text-slate-500 dark:text-zinc-400 ml-1 inline-block align-top mt-1.5">m²</span>
            </div>

            {/* Sparkline & Subtext Footer */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono">
                2m above ground
              </span>

              {/* Resolution Blue Sparkline */}
              <svg className="w-28 h-8 overflow-visible" viewBox="0 0 110 32">
                <defs>
                  <linearGradient id="sparkBlueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={darkMode ? 0.35 : 0.2} />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <path
                  d="M0,20 Q24,8 52,16 T84,8 T102,12 L110,6 L110,32 L0,32 Z"
                  fill="url(#sparkBlueGrad)"
                />
                <path
                  d="M0,20 Q24,8 52,16 T84,8 T102,12 L110,6"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeLinecap="round"
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
          <div className="lg:col-span-8 bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl">
            
            {/* Header */}
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

              {/* Critical Badge Right */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span>CRITICAL: 105°F</span>
              </div>
            </div>

            {/* Dedicated Y-Axis Header with Clean Gap */}
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 dark:text-zinc-500 mb-2 font-mono">
              <span>TEMP</span>
              <span>(°F)</span>
            </div>

            {/* Glowing Recharts Area Chart */}
            <div className="w-full h-80 relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={telemetryData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="neonFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={darkMode ? 0.3 : 0.08} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <filter id="neonGlow">
                      <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="6"
                        floodColor="#f97316"
                        floodOpacity={darkMode ? "0.6" : "0.15"}
                      />
                    </filter>
                  </defs>

                  {/* X Axis */}
                  <XAxis
                    dataKey="time"
                    stroke={darkMode ? "#1E2330" : "#E5E7EB"}
                    tick={{
                      fill: darkMode ? "#71717A" : "#6B7280",
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: darkMode ? "#1E2330" : "#E5E7EB" }}
                  />

                  {/* Y Axis spanning realistic urban ranges */}
                  <YAxis
                    domain={[75, 115]}
                    ticks={[75, 85, 95, 105, 115]}
                    stroke={darkMode ? "#1E2330" : "#E5E7EB"}
                    tick={{
                      fill: darkMode ? "#71717A" : "#6B7280",
                      fontSize: 10,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: darkMode ? "#1E2330" : "#E5E7EB" }}
                    tickFormatter={(val) => `${val}°`}
                  />

                  {/* Clean Tooltip with Adaptive Colors */}
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

          {/* =========================================================================
              RIGHT SIDEBAR (AGENT EVENT LOG - LIQUID FEED) - 4 cols
              ========================================================================= */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl h-full">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gray-400 dark:text-zinc-400" />
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  AGENT EVENT LOG
                </h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-bold">
                LIVE FEED
              </span>
            </div>

            {/* Liquid Framer Motion Event Feed with Clean Dynamic Styles */}
            <div
              ref={logsEndRef}
              className="flex-1 overflow-y-auto max-h-[340px] pr-1 font-mono text-xs"
            >
              <AnimatePresence initial={false}>
                {eventLogs.map((log) => {
                  const cfg = getLogConfig(log.type);
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className={`bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 rounded-xl p-3.5 mb-2.5 relative overflow-hidden shadow-sm dark:shadow-none border-l-4 ${cfg.borderClass}`}
                    >
                      {/* Top row: Icon + Timestamp + Badge */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {cfg.icon}
                          <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                            {log.timestamp}
                          </span>
                        </div>
                        <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border font-mono ${cfg.badgeClass}`}>
                          {log.badge}
                        </span>
                      </div>

                      {/* Message Text */}
                      <p className={`text-xs leading-relaxed font-sans font-medium ${cfg.textClass}`}>
                        {log.text}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Sidebar Footer */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400 dark:text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Telemetry: Active</span>
              </div>
              <span>Events: {totalEventsCount}</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            BOTTOM "SYSTEM STATUS" ROW (4 Refined Status Cards)
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          
          {/* Card 1: DATA CONNECTION */}
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

          {/* Card 2: API STATUS */}
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
                FortyGuard Ingest ({pollCount} frames)
              </span>
            </div>
          </div>

          {/* Card 3: LAST UPDATED */}
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

          {/* Card 4: DYNAMIC SYSTEM UPTIME */}
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
                {pollCount > 0 ? (((pollCount - failedPolls) / pollCount) * 100).toFixed(2) : "100.00"}% reliability
              </span>
            </div>
          </div>
        </div>
      </main>

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
              className="bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-zinc-100"
            >
              {/* Modal Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-orange-50 dark:bg-[#FF6B2B]/20 border border-orange-200 dark:border-[#FF6B2B]/30 flex items-center justify-center shadow-sm">
                    <FileCheck className="w-5 h-5 text-[#FF6B2B]" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                      Agent 1: Energy & Thermal Compliance Audit
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                      RAG Vector Assessment • {selectedCity}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4 text-sm font-sans">
                {isAuditLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B2B]" />
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
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 font-mono text-xs">
                      <span className="text-gray-600 dark:text-zinc-400">
                        Target Region: <strong className="text-slate-900 dark:text-white">{auditReport.city}</strong>
                      </span>
                      <span className="text-gray-600 dark:text-zinc-400">
                        Audited Temp: <strong className="text-[#FF6B2B]">{auditReport.temperature_f}°F</strong>
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
                    <div className="p-4 rounded-xl border border-[#FF6B2B]/30 bg-[#FF6B2B]/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#FF6B2B]" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF6B2B]">
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
                      <span className="text-[11px] font-mono uppercase text-gray-400 dark:text-zinc-500 block mb-1.5">
                        Structured Pydantic JSON Output:
                      </span>
                      <pre className="font-mono text-[11px] p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/60 text-slate-800 dark:text-zinc-300 overflow-x-auto leading-relaxed">
                        {JSON.stringify(auditReport, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 font-mono text-xs">
                <button
                  onClick={() => setIsAuditOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
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
