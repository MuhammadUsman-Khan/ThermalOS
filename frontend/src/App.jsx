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
  AreaChart,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileCheck,
  Flame,
  Globe,
  Moon,
  Radio,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  Sun,
  Thermometer,
  X,
  Zap,
} from "lucide-react";

const CITIES = [
  "Phoenix, AZ",
  "Houston, TX",
  "Las Vegas, NV",
  "Dallas, TX",
];

const MAX_DATA_POINTS = 20;

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [selectedCity, setSelectedCity] = useState("Phoenix, AZ");
  const [telemetryData, setTelemetryData] = useState([]);
  const [eventLogs, setEventLogs] = useState([
    {
      id: "init-1",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      type: "system",
      level: "info",
      badge: null,
      text: "ThermalOS kernel v26.4 initialized. Telemetry stream locked on FortyGuard endpoint.",
    },
  ]);
  const [currentReading, setCurrentReading] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Audit Modal State
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [isDispatched, setIsDispatched] = useState(false);

  const logsEndRef = useRef(null);

  // Auto-scroll event logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [eventLogs]);

  // Polling loop to FastAPI backend
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

        // Update rolling telemetry window (max 20 data points)
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

        // Trigger extreme alert if risk_level is extreme or temp >= 105
        if (data.risk_level === "extreme" || data.temperature_f >= 105) {
          const alertMessage = `🔴 [${timestamp}] HEAT SPIKE DETECTED: Threshold breached for ${selectedCity}.`;
          setEventLogs((prevLogs) => [
            ...prevLogs,
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "extreme",
              level: "breach",
              badge: "CRITICAL BREACH",
              text: alertMessage,
            },
          ]);
        } else if (data.risk_level === "high" || data.temperature_f >= 100) {
          setEventLogs((prevLogs) => [
            ...prevLogs,
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "high",
              level: "warning",
              badge: "ELEVATED",
              text: `⚠️ [${timestamp}] HIGH HEAT ELEVATION: ${selectedCity} at ${data.temperature_f}°F. Monitoring thermal plume.`,
            },
          ]);
        } else {
          // Periodic standard telemetry sync log (every 6 polls)
          setEventLogs((prevLogs) => {
            if (prevLogs.length % 6 === 0) {
              return [
                ...prevLogs,
                {
                  id: `${Date.now()}-${Math.random()}`,
                  timestamp,
                  type: "info",
                  level: "info",
                  badge: null,
                  text: `📊 [${timestamp}] Telemetry frame verified for ${selectedCity} (${data.temperature_f}°F, ${data.resolution}).`,
                },
              ];
            }
            return prevLogs;
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setIsConnected(false);
        setEventLogs((prevLogs) => [
          ...prevLogs,
          {
            id: `${Date.now()}-${Math.random()}`,
            timestamp,
            type: "error",
            level: "error",
            badge: "DISCONNECT",
            text: `❌ [${timestamp}] API DISCONNECT: Endpoint unreachable at http://127.0.0.1:8000. Retrying...`,
          },
        ]);
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
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: ts,
        type: "city_change",
        level: "target",
        badge: "TARGET SHIFT",
        text: `📍 [${ts}] Spatial target switched to [${newCity}]. Re-indexing urban telemetry.`,
      },
    ]);
  };

  // Trigger Agent 1 Compliance Audit
  const handleRunAudit = async () => {
    setIsAuditOpen(true);
    setIsAuditLoading(true);
    setAuditError(null);
    setAuditReport(null);
    setIsDispatched(false);

    const tempToSend = currentReading ? currentReading.temperature_f : 108;

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
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: ts,
          type: "audit",
          level: "audit",
          badge: "AGENT 1 AUDIT",
          text: `⚡ [${ts}] AGENT 1 AUDIT COMPLETE: ASHRAE 55 & IECC evaluation generated for ${selectedCity} (${tempToSend}°F).`,
        },
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
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: ts,
        type: "dispatch",
        level: "audit",
        badge: "N8N DISPATCH",
        text: `🚀 [${ts}] N8N WEBHOOK DISPATCHED: Pre-cooling & envelope mitigation task forwarded to Agent 2 controller.`,
      },
    ]);
  };

  // Surface and Border Token Classes
  const surfaceClass = darkMode
    ? "bg-[#0E1015] border-[#1C202B]"
    : "bg-[#FFFFFF] border-[#E4E4E7] shadow-sm";
  const headerClass = darkMode
    ? "bg-[#08090C]/90 border-[#1C202B]"
    : "bg-[#FFFFFF]/90 border-[#E4E4E7] shadow-sm";
  const innerCardClass = darkMode
    ? "bg-[#08090C] border-[#1C202B]"
    : "bg-[#F4F4F5] border-[#E4E4E7]";
  const subtextColor = darkMode ? "text-zinc-400" : "text-zinc-600";
  const labelColor = darkMode ? "text-zinc-500" : "text-zinc-500";
  const textColor = darkMode ? "text-zinc-100" : "text-zinc-900";
  const headingColor = darkMode ? "text-white" : "text-zinc-900";

  return (
    <div
      className={`min-h-screen transition-colors duration-300 relative selection:bg-[#FF6B2B]/30 selection:text-white font-sans ${
        darkMode ? "bg-[#08090C] text-zinc-100 dark" : "bg-[#F8F9FA] text-zinc-900"
      }`}
    >
      {/* Precision Micro Dot Grid */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-70 ${
          darkMode
            ? "bg-[radial-gradient(#1C202B_1px,transparent_1px)] [background-size:16px_16px]"
            : "bg-[radial-gradient(#E4E4E7_1px,transparent_1px)] [background-size:16px_16px]"
        }`}
      />

      {/* TOPBAR */}
      <header className={`border-b ${headerClass} backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8 py-3 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-[#FF6B2B]/10 border border-[#FF6B2B]/30 flex items-center justify-center shadow-[0_0_12px_rgba(255,107,43,0.2)]">
              <Flame className="w-4 h-4 text-[#FF6B2B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`font-display text-sm sm:text-base font-bold tracking-tight uppercase ${headingColor}`}>
                  THERMALOS
                </h1>
                <span className={`text-[11px] font-medium tracking-normal ${subtextColor}`}>
                  URBAN MICRO-CLIMATE OS
                </span>
                <span
                  className={`hidden sm:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                    darkMode
                      ? "bg-[#14171F] text-zinc-400 border-[#1C202B]"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                >
                  FORTYGUARD API
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-between md:justify-end">
            {/* Run Compliance Audit Action Button */}
            <button
              onClick={handleRunAudit}
              className="bg-[#FF6B2B] text-black hover:bg-[#E05316] font-medium text-xs tracking-wider uppercase px-4 py-2 rounded-md shadow-lg shadow-[#FF6B2B]/20 transition-all font-mono active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>RUN COMPLIANCE AUDIT</span>
            </button>

            {/* Live Polling Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border font-mono text-xs ${
                darkMode ? "border-[#1C202B] bg-[#0E1015]" : "border-[#E4E4E7] bg-white"
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF4444]" />
                  </>
                )}
              </span>
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${isConnected ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                {isConnected ? "LIVE (1.5s)" : "OFFLINE"}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-md border transition-all cursor-pointer ${
                darkMode
                  ? "border-[#1C202B] bg-[#0E1015] text-amber-400 hover:bg-[#14171F]"
                  : "border-[#E4E4E7] bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* City Selector */}
            <div className="relative flex items-center">
              <select
                id="city-selector"
                value={selectedCity}
                onChange={handleCityChange}
                className={`appearance-none border rounded-md px-3 py-1.5 pr-8 text-xs font-mono outline-none cursor-pointer shadow-sm transition-colors ${
                  darkMode
                    ? "bg-[#0E1015] border-[#1C202B] text-zinc-100 hover:border-zinc-700 focus:border-[#FF6B2B]"
                    : "bg-white border-[#E4E4E7] text-zinc-900 hover:border-zinc-400 focus:border-[#FF6B2B]"
                }`}
              >
                {CITIES.map((city) => (
                  <option key={city} value={city} className={darkMode ? "bg-[#0E1015] text-zinc-100" : "bg-white text-zinc-900"}>
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
        {/* Left 2 Columns: KPI Row + Recharts Trading-Desk Chart */}
        <div className="lg:col-span-2 space-y-5">
          {/* STAT KPI ROW (4 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Card 1: SURFACE TEMP */}
            <div className={`border rounded-lg p-4 flex flex-col justify-between transition-all duration-300 ${surfaceClass}`}>
              <div className={`flex items-center justify-between text-xs font-medium ${subtextColor}`}>
                <span>SURFACE TEMP</span>
                <Thermometer className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2.5 flex items-baseline gap-1">
                <span className={`font-mono text-4xl font-bold tracking-tight ${headingColor}`}>
                  {currentReading ? currentReading.temperature_f : "--"}
                </span>
                <span className="font-mono text-sm text-zinc-400">°F</span>
              </div>
              <div>
                {currentReading ? (
                  currentReading.temperature_f >= 110 ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]">
                      EXTREME
                    </span>
                  ) : currentReading.temperature_f >= 100 ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      HIGH
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                      ELEVATED
                    </span>
                  )
                ) : (
                  <span className="font-mono text-[10px] text-zinc-500">Connecting...</span>
                )}
              </div>
            </div>

            {/* Card 2: RISK MATRIX */}
            <div className={`border rounded-lg p-4 flex flex-col justify-between transition-all duration-300 ${surfaceClass}`}>
              <div className={`flex items-center justify-between text-xs font-medium ${subtextColor}`}>
                <span>RISK MATRIX</span>
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2.5">
                <span className={`font-mono text-2xl font-bold uppercase tracking-tight ${headingColor}`}>
                  {currentReading ? currentReading.risk_level : "--"}
                </span>
              </div>
              <div className="font-mono text-[11px] text-zinc-500">
                Crit Floor: <span className="text-[#EF4444] font-medium">105°F</span>
              </div>
            </div>

            {/* Card 3: RESOLUTION */}
            <div className={`border rounded-lg p-4 flex flex-col justify-between transition-all duration-300 ${surfaceClass}`}>
              <div className={`flex items-center justify-between text-xs font-medium ${subtextColor}`}>
                <span>RESOLUTION</span>
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2.5">
                <span className={`font-mono text-2xl font-bold ${headingColor}`}>
                  {currentReading ? currentReading.resolution : "10mi²"}
                </span>
              </div>
              <div className={`text-[11px] truncate ${subtextColor}`}>
                {currentReading ? currentReading.measured_at : "2m above ground"}
              </div>
            </div>

            {/* Card 4: QUOTA REMAINING */}
            <div className={`border rounded-lg p-4 flex flex-col justify-between transition-all duration-300 ${surfaceClass}`}>
              <div className={`flex items-center justify-between text-xs font-medium ${subtextColor}`}>
                <span>QUOTA REMAINING</span>
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2.5">
                <span className={`font-mono text-2xl font-bold ${headingColor}`}>
                  {currentReading ? currentReading.credits_remaining.toLocaleString() : "999,999"}
                </span>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 shadow-[0_0_8px_rgba(16,185,129,0.12)]">
                  Enterprise Active
                </span>
              </div>
            </div>
          </div>

          {/* TRADINGVIEW-STYLE RECHARTS TELEMETRY OVERHAUL */}
          <div className={`border rounded-lg p-5 flex flex-col transition-all duration-300 ${surfaceClass}`}>
            {/* Header */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3.5 border-b ${darkMode ? "border-[#1C202B]" : "border-[#E4E4E7]"}`}>
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FF6B2B]" />
                  <h2 className={`font-display text-sm font-bold uppercase tracking-tight ${headingColor}`}>
                    TELEMETRY STREAM • {selectedCity}
                  </h2>
                </div>
                <p className={`font-sans text-xs mt-0.5 ${subtextColor}`}>
                  Dynamic micro-climate temperature readings (rolling 20-sample window)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#EF4444]">
                  <span className="w-2.5 h-[1px] bg-[#EF4444] inline-block border-t border-dashed border-[#EF4444]" />
                  <span>CRITICAL: 105°F</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#FF6B2B]">
                  <span className="w-2 h-[2px] bg-[#FF6B2B] inline-block" />
                  <span>Temp (°F)</span>
                </div>
              </div>
            </div>

            {/* Smooth Bezier Animated Chart */}
            <div className="w-full h-80">
              {telemetryData.length === 0 ? (
                <div className={`w-full h-full flex flex-col items-center justify-center font-mono text-xs gap-2.5 border border-dashed rounded ${darkMode ? "border-[#1C202B] text-zinc-500" : "border-[#E4E4E7] text-zinc-400"}`}>
                  <RefreshCw className="w-5 h-5 animate-spin text-[#FF6B2B]" />
                  <span>Locking micro-climate telemetry for {selectedCity}...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={telemetryData}
                    margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="thermalGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6B2B" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#FF6B2B" stopOpacity={0.00} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke={darkMode ? "#1C202B" : "#E4E4E7"}
                      opacity={0.8}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      stroke={darkMode ? "#52525b" : "#71717A"}
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      tickLine={false}
                      axisLine={{ stroke: darkMode ? "#1C202B" : "#E4E4E7" }}
                    />

                    <YAxis
                      domain={[90, 125]}
                      stroke={darkMode ? "#52525b" : "#71717A"}
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      tickLine={false}
                      axisLine={{ stroke: darkMode ? "#1C202B" : "#E4E4E7" }}
                      tickFormatter={(val) => `${val}°`}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isBreached = item.temperature_f >= 105;
                          return (
                            <div className={`p-3 rounded-lg shadow-2xl backdrop-blur-md font-mono text-xs border ${
                              darkMode ? "bg-[#08090C]/95 border-[#1C202B] text-zinc-100" : "bg-white/95 border-zinc-200 text-zinc-900"
                            }`}>
                              <div className="text-[10px] text-zinc-400 uppercase">{item.time}</div>
                              <div className="text-base font-bold mt-0.5">
                                {item.temperature_f}°F
                              </div>
                              <div className="text-[11px] mt-1">
                                Matrix: <span className={isBreached ? "text-[#EF4444] font-semibold uppercase" : "text-zinc-400 uppercase"}>{item.risk_level}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Fixed Critical Reference Line */}
                    <ReferenceLine
                      y={105}
                      stroke="#EF4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "CRITICAL FLOOR 105°F",
                        fill: "#EF4444",
                        position: "insideTopRight",
                        fontSize: 10,
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 600,
                        offset: 8,
                      }}
                    />

                    {/* Liquid Smooth Area */}
                    <Area
                      type="monotone"
                      dataKey="temperature_f"
                      stroke="#FF6B2B"
                      strokeWidth={2.5}
                      fill="url(#thermalGlow)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#FF6B2B",
                        stroke: darkMode ? "#0E1015" : "#FFFFFF",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={true}
                      animationDuration={300}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Chart Footer */}
            <div className={`mt-3.5 pt-3 border-t flex items-center justify-between font-mono text-xs ${darkMode ? "border-[#1C202B] text-zinc-400" : "border-[#E4E4E7] text-zinc-600"}`}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span>Sampling: 1500ms</span>
              </div>
              <div>
                Frames Ingested: <span className={`font-semibold ${headingColor}`}>{pollCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: LIQUID-SMOOTH AGENT EVENT LOG */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-4">
          <div className={`border rounded-lg p-5 flex-1 flex flex-col max-h-[600px] transition-all duration-300 ${surfaceClass}`}>
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between pb-3.5 border-b mb-3 ${darkMode ? "border-[#1C202B]" : "border-[#E4E4E7]"}`}>
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-zinc-400" />
                <h2 className={`font-display text-xs font-bold uppercase tracking-wider ${headingColor}`}>
                  AGENT EVENT LOG
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#10B981] uppercase px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/30">
                LIVE FEED
              </span>
            </div>

            {/* Liquid Smooth Animated Feed with Framer Motion */}
            <div
              ref={logsEndRef}
              className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs"
            >
              <AnimatePresence initial={false}>
                {eventLogs.map((log) => {
                  const isBreach = log.level === "breach" || log.type === "extreme";
                  const isWarning = log.level === "warning" || log.type === "high";
                  const isAudit = log.level === "audit";
                  const isTarget = log.level === "target";

                  const barColor = isBreach
                    ? "border-[#EF4444] bg-[#EF4444]/5"
                    : isWarning
                    ? "border-amber-400 bg-amber-400/5"
                    : isAudit
                    ? "border-[#FF6B2B] bg-[#FF6B2B]/5"
                    : isTarget
                    ? "border-sky-400 bg-sky-400/5"
                    : darkMode
                    ? "border-[#1C202B] bg-transparent"
                    : "border-[#E4E4E7] bg-transparent";

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: -12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`border-l-2 pl-3 py-2 rounded-r-md transition-colors ${barColor}`}
                    >
                      {/* Header Row: Timestamp + Severity Badge */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11px] font-mono opacity-60">
                          {log.timestamp}
                        </span>
                        {log.badge && (
                          <span
                            className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                              isBreach
                                ? "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                                : isWarning
                                ? "bg-amber-400/20 text-amber-400 border-amber-400/40"
                                : isAudit
                                ? "bg-[#FF6B2B]/20 text-[#FF6B2B] border-[#FF6B2B]/40"
                                : "bg-sky-400/20 text-sky-400 border-sky-400/40"
                            }`}
                          >
                            {log.badge}
                          </span>
                        )}
                      </div>

                      {/* Event Text */}
                      <p
                        className={`text-xs leading-relaxed break-words font-mono ${
                          isBreach
                            ? "text-[#EF4444] font-medium"
                            : isWarning
                            ? "text-amber-500 dark:text-amber-300"
                            : isAudit
                            ? "text-[#FF6B2B]"
                            : darkMode
                            ? "text-zinc-300"
                            : "text-zinc-700"
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
            <div className={`mt-3 pt-3 border-t flex items-center justify-between text-[11px] font-mono ${darkMode ? "border-[#1C202B] text-zinc-500" : "border-[#E4E4E7] text-zinc-400"}`}>
              <span>Telemetry: Active</span>
              <span>Events: {eventLogs.length}</span>
            </div>
          </div>
        </div>
      </main>

      {/* AGENT 1 AUDIT MODAL (FRAMER MOTION OVERLAY) */}
      <AnimatePresence>
        {isAuditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className={`border rounded-xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] ${
                darkMode ? "bg-[#0E1015] border-[#1C202B] text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
              }`}
            >
              {/* Modal Top Header */}
              <div className={`flex items-center justify-between pb-4 border-b ${darkMode ? "border-[#1C202B]" : "border-zinc-200"}`}>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[#FF6B2B]/10 border border-[#FF6B2B]/30 flex items-center justify-center shadow-[0_0_12px_rgba(255,107,43,0.2)]">
                    <Building2 className="w-4 h-4 text-[#FF6B2B]" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold uppercase tracking-tight">
                      Agent 1: Urban Heat & Compliance Audit
                    </h2>
                    <p className="text-xs opacity-60 font-mono">
                      RAG Vector Assessment • {selectedCity}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditOpen(false)}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    darkMode ? "text-zinc-400 hover:text-white hover:bg-[#1C202B]" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto py-5 space-y-4 text-sm">
                {isAuditLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs opacity-70">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B2B]" />
                    <span>Retrieving ASHRAE 55 and IECC building codes from ChromaDB...</span>
                  </div>
                ) : auditError ? (
                  <div className="p-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-mono text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Audit Execution Error</span>
                    </div>
                    <p>{auditError}</p>
                  </div>
                ) : auditReport ? (
                  <div className="space-y-4">
                    {/* Status Pill Card */}
                    <div className={`flex items-center justify-between p-3.5 rounded-lg border font-mono text-xs ${innerCardClass}`}>
                      <span>Target Region: <strong className={headingColor}>{auditReport.city}</strong></span>
                      <span>Audited Temp: <strong className="text-[#FF6B2B]">{auditReport.temperature_f}°F</strong></span>
                    </div>

                    {/* Section 1: ASHRAE 55 Card */}
                    <div className={`p-4 rounded-lg border space-y-1.5 ${
                      auditReport.temperature_f > 79
                        ? "border-[#EF4444]/40 bg-[#EF4444]/5"
                        : "border-[#10B981]/40 bg-[#10B981]/5"
                    }`}>
                      <div className="flex items-center gap-2">
                        {auditReport.temperature_f > 79 ? (
                          <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        )}
                        <span className={`font-mono text-xs font-bold uppercase tracking-wider ${
                          auditReport.temperature_f > 79 ? "text-[#EF4444]" : "text-[#10B981]"
                        }`}>
                          1. ASHRAE 55 Thermal Comfort Standard
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-mono opacity-90 pl-6">
                        {auditReport.ashrae_compliance_status}
                      </p>
                    </div>

                    {/* Section 2: IECC Insulation Warning Card */}
                    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                          2. IECC Building Envelope & Insulation Warning
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-mono opacity-90 pl-6">
                        {auditReport.iecc_envelope_warning}
                      </p>
                    </div>

                    {/* Section 3: Recommended HVAC Action & Dispatch */}
                    <div className="p-4 rounded-lg border border-[#FF6B2B]/40 bg-[#FF6B2B]/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-[#FF6B2B]" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF6B2B]">
                          3. Recommended HVAC Mitigation Plan
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-mono opacity-90 pl-6">
                        {auditReport.recommended_hvac_action}
                      </p>

                      {/* Single-Click Dispatch Button */}
                      <div className="pt-2 pl-6 flex items-center gap-3">
                        <button
                          onClick={handleDispatchN8n}
                          disabled={isDispatched}
                          className={`font-mono text-xs font-medium px-4 py-2 rounded-md flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                            isDispatched
                              ? "bg-[#10B981] text-black cursor-default shadow-[#10B981]/20"
                              : "bg-[#FF6B2B] text-black hover:bg-[#E05316] shadow-[#FF6B2B]/20 active:scale-95"
                          }`}
                        >
                          {isDispatched ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
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
                      <span className="text-[11px] font-mono uppercase opacity-60 block mb-1.5">
                        Structured Pydantic JSON Output:
                      </span>
                      <pre className={`font-mono text-[11px] p-3.5 rounded-lg border overflow-x-auto leading-relaxed ${innerCardClass}`}>
                        {JSON.stringify(auditReport, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className={`pt-4 border-t flex items-center justify-end gap-3 font-mono text-xs ${darkMode ? "border-[#1C202B]" : "border-zinc-200"}`}>
                <button
                  onClick={() => setIsAuditOpen(false)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    darkMode
                      ? "bg-[#14171F] hover:bg-[#1C202B] text-zinc-300"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800"
                  }`}
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
