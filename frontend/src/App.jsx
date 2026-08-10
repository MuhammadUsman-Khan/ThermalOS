import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  Line,
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
  AlertTriangle,
  ChevronDown,
  FileCheck,
  Flame,
  Globe,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
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
  const [selectedCity, setSelectedCity] = useState("Phoenix, AZ");
  const [telemetryData, setTelemetryData] = useState([]);
  const [eventLogs, setEventLogs] = useState([
    {
      id: "init-1",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      type: "system",
      level: "info",
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

  const logsEndRef = useRef(null);

  // Auto-scroll logs to bottom on update
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
              badge: "HIGH HEAT ELEVATION",
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

  return (
    <div className="min-h-screen bg-[#0A0C0F] text-zinc-100 flex flex-col relative selection:bg-[#FF6B2B]/30 selection:text-white font-sans">
      {/* Precision 16px Dot Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E2330_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-80" />

      {/* TOPBAR */}
      <header className="border-b border-[#1E2330] bg-[#0A0C0F]/90 backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
          {/* Brand Left */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#FF6B2B]/10 border border-[#FF6B2B]/30 flex items-center justify-center shadow-[0_0_12px_rgba(255,107,43,0.2)]">
              <Flame className="w-4 h-4 text-[#FF6B2B]" />
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                THERMALOS: URBAN MICRO-CLIMATE OS
              </h1>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#181B22] text-zinc-400 border border-[#1E2330]">
                FORTYGUARD API
              </span>
            </div>
          </div>

          {/* Actions & Controls Right */}
          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto justify-between md:justify-end">
            {/* Run Compliance Audit Button */}
            <button
              onClick={handleRunAudit}
              className="border border-[#FF6B2B]/70 text-[#FF6B2B] hover:bg-[#FF6B2B]/10 hover:shadow-[0_0_16px_rgba(255,107,43,0.3)] active:scale-95 transition-all font-mono text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 font-medium shadow-sm cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>RUN COMPLIANCE AUDIT</span>
            </button>

            {/* Live Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#1E2330] bg-[#111318] font-mono text-xs">
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ECC8A] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2ECC8A]" />
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF3B3B] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF3B3B]" />
                  </>
                )}
              </span>
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${isConnected ? "text-[#2ECC8A]" : "text-[#FF3B3B]"}`}>
                {isConnected ? "LIVE (1.5s)" : "OFFLINE"}
              </span>
            </div>

            {/* City Dropdown */}
            <div className="relative flex items-center">
              <select
                id="city-selector"
                value={selectedCity}
                onChange={handleCityChange}
                className="appearance-none bg-[#111318] border border-[#1E2330] hover:border-zinc-700 rounded-md px-3 py-1.5 pr-8 text-xs font-mono text-zinc-200 outline-none focus:border-[#FF6B2B]/70 cursor-pointer shadow-sm"
              >
                {CITIES.map((city) => (
                  <option key={city} value={city} className="bg-[#111318] text-zinc-100">
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
        {/* Left 2 Columns: KPI Row + Recharts Telemetry */}
        <div className="lg:col-span-2 space-y-5">
          {/* STAT KPI ROW (4 Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Card 1: SURFACE TEMP */}
            <div className="bg-[#111318] border border-[#1E2330] rounded-lg p-4 flex flex-col justify-between hover:border-zinc-700/60 transition-colors shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium font-sans">
                <span>SURFACE TEMP</span>
                <Thermometer className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="my-2.5 flex items-baseline gap-1">
                <span className="font-mono text-4xl text-white font-bold tracking-tight">
                  {currentReading ? currentReading.temperature_f : "--"}
                </span>
                <span className="font-mono text-sm text-zinc-500">°F</span>
              </div>
              <div>
                {currentReading ? (
                  currentReading.temperature_f >= 110 ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#FF3B3B]/10 text-[#FF3B3B] border border-[#FF3B3B]/30">
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
                  <span className="font-mono text-[10px] text-zinc-600">Connecting...</span>
                )}
              </div>
            </div>

            {/* Card 2: RISK MATRIX */}
            <div className="bg-[#111318] border border-[#1E2330] rounded-lg p-4 flex flex-col justify-between hover:border-zinc-700/60 transition-colors shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium font-sans">
                <span>RISK MATRIX</span>
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="my-2.5">
                <span className="font-mono text-2xl font-bold uppercase tracking-tight text-white">
                  {currentReading ? currentReading.risk_level : "--"}
                </span>
              </div>
              <div className="font-mono text-[11px] text-zinc-500">
                Crit Floor: <span className="text-[#FF3B3B] font-medium">105°F</span>
              </div>
            </div>

            {/* Card 3: RESOLUTION */}
            <div className="bg-[#111318] border border-[#1E2330] rounded-lg p-4 flex flex-col justify-between hover:border-zinc-700/60 transition-colors shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium font-sans">
                <span>RESOLUTION</span>
                <Radio className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="my-2.5">
                <span className="font-mono text-2xl font-bold text-white">
                  {currentReading ? currentReading.resolution : "10mi²"}
                </span>
              </div>
              <div className="font-sans text-[11px] text-zinc-400 truncate">
                {currentReading ? currentReading.measured_at : "2m above ground"}
              </div>
            </div>

            {/* Card 4: QUOTA REMAINING */}
            <div className="bg-[#111318] border border-[#1E2330] rounded-lg p-4 flex flex-col justify-between hover:border-zinc-700/60 transition-colors shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 text-xs font-medium font-sans">
                <span>QUOTA REMAINING</span>
                <Zap className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="my-2.5">
                <span className="font-mono text-2xl font-bold text-white">
                  {currentReading ? currentReading.credits_remaining.toLocaleString() : "999,999"}
                </span>
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#2ECC8A]/10 text-[#2ECC8A] border border-[#2ECC8A]/30">
                  Enterprise Active
                </span>
              </div>
            </div>
          </div>

          {/* RECHARTS TELEMETRY STREAM */}
          <div className="bg-[#111318] border border-[#1E2330] rounded-lg p-5 flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3.5 border-b border-[#1E2330]">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FF6B2B]" />
                  <h2 className="font-display text-sm font-bold uppercase tracking-tight text-white">
                    TELEMETRY STREAM • {selectedCity}
                  </h2>
                </div>
                <p className="font-sans text-xs text-zinc-400 mt-0.5">
                  Dynamic micro-climate temperature readings (rolling 20-sample window)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                  <span className="w-2.5 h-[1px] bg-[#FF3B3B] inline-block border-t border-dashed border-[#FF3B3B]" />
                  <span className="text-[#FF3B3B]">CRITICAL: 105°F</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                  <span className="w-2 h-[2px] bg-[#FF6B2B] inline-block" />
                  <span className="text-[#FF6B2B]">Temp (°F)</span>
                </div>
              </div>
            </div>

            {/* Smooth Monotone Area Chart */}
            <div className="w-full h-80">
              {telemetryData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-2.5 border border-dashed border-[#1E2330] rounded">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#FF6B2B]" />
                  <span>Locking micro-climate telemetry for {selectedCity}...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={telemetryData}
                    margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="thermalOrangeFaded" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6B2B" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#FF6B2B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#1E2330"
                      opacity={0.7}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      tickLine={false}
                      axisLine={{ stroke: "#1E2330" }}
                    />

                    <YAxis
                      domain={[90, 120]}
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="JetBrains Mono, monospace"
                      tickLine={false}
                      axisLine={{ stroke: "#1E2330" }}
                      tickFormatter={(val) => `${val}°`}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isBreached = item.temperature_f >= 105;
                          return (
                            <div className="bg-[#0A0C0F]/95 border border-[#1E2330] p-3 rounded-lg shadow-2xl backdrop-blur-md font-mono text-xs">
                              <div className="text-[10px] text-zinc-500 uppercase">{item.time}</div>
                              <div className="text-base font-bold text-white mt-0.5">
                                {item.temperature_f}°F
                              </div>
                              <div className="text-[11px] mt-1 text-zinc-400">
                                Matrix: <span className={isBreached ? "text-[#FF3B3B] font-semibold uppercase" : "text-zinc-300 uppercase"}>{item.risk_level}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Horizontal Dashed Critical Threshold Reference Line */}
                    <ReferenceLine
                      y={105}
                      stroke="#FF3B3B"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "CRITICAL 105°F",
                        fill: "#FF3B3B",
                        position: "insideTopRight",
                        fontSize: 10,
                        fontFamily: "JetBrains Mono, monospace",
                        fontWeight: 600,
                        offset: 8,
                      }}
                    />

                    {/* Area Gradient */}
                    <Area
                      type="monotone"
                      dataKey="temperature_f"
                      fill="url(#thermalOrangeFaded)"
                      stroke="none"
                    />

                    {/* Neon Orange Line */}
                    <Line
                      type="monotone"
                      dataKey="temperature_f"
                      stroke="#FF6B2B"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "#FF6B2B",
                        stroke: "#111318",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Footer Bar */}
            <div className="mt-3.5 pt-3 border-t border-[#1E2330] flex items-center justify-between font-mono text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2ECC8A]" />
                <span>Sampling: 1500ms</span>
              </div>
              <div>
                Frames Ingested: <span className="text-zinc-200 font-semibold">{pollCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: AGENT EVENT LOG SIDEBAR */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-4">
          <div className="bg-[#111318] border border-[#1E2330] rounded-lg p-5 flex-1 flex flex-col max-h-[600px] shadow-xl">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2330] mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-zinc-400" />
                <h2 className="font-display text-xs font-bold uppercase tracking-wider text-white">
                  AGENT EVENT LOG
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#2ECC8A] uppercase px-2 py-0.5 rounded bg-[#2ECC8A]/10 border border-[#2ECC8A]/30">
                LIVE FEED
              </span>
            </div>

            {/* Terminal Feed with Left Color Bars & Keyframe Slide-in */}
            <div
              ref={logsEndRef}
              className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs"
            >
              {eventLogs.map((log) => {
                const isBreach = log.level === "breach" || log.type === "extreme";
                const isWarning = log.level === "warning" || log.type === "high";
                const isAudit = log.level === "audit";
                const isTarget = log.level === "target";

                const barColor = isBreach
                  ? "border-[#FF3B3B] bg-[#FF3B3B]/5"
                  : isWarning
                  ? "border-amber-400 bg-amber-400/5"
                  : isAudit
                  ? "border-[#FF6B2B] bg-[#FF6B2B]/5"
                  : isTarget
                  ? "border-sky-400 bg-sky-400/5"
                  : "border-[#1E2330] bg-transparent";

                return (
                  <div
                    key={log.id}
                    className={`border-l-2 pl-3 py-2 rounded-r-md transition-all ${barColor} animate-slide-in`}
                  >
                    {/* Timestamp & Badge */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {log.timestamp}
                      </span>
                      {log.badge && (
                        <span
                          className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
                            isBreach
                              ? "bg-[#FF3B3B]/20 text-[#FF3B3B] border-[#FF3B3B]/40"
                              : isWarning
                              ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                              : isAudit
                              ? "bg-[#FF6B2B]/20 text-[#FF6B2B] border-[#FF6B2B]/40"
                              : "bg-sky-400/20 text-sky-300 border-sky-400/40"
                          }`}
                        >
                          {log.badge}
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <p
                      className={`text-xs leading-relaxed break-words ${
                        isBreach
                          ? "text-red-200 font-medium"
                          : isWarning
                          ? "text-amber-200"
                          : isAudit
                          ? "text-orange-200"
                          : "text-zinc-300"
                      }`}
                    >
                      {log.text}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Sidebar Footer */}
            <div className="mt-3 pt-3 border-t border-[#1E2330] flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Telemetry: Active</span>
              <span>Events: {eventLogs.length}</span>
            </div>
          </div>
        </div>
      </main>

      {/* AGENT 1 COMPLIANCE AUDIT MODAL OVERLAY */}
      {isAuditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111318] border border-[#1E2330] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2330]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#FF6B2B]/10 border border-[#FF6B2B]/30 flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-[#FF6B2B]" />
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
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-[#1E2330] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4 font-sans text-sm">
              {isAuditLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400 font-mono text-xs">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B2B]" />
                  <span>Retrieving ASHRAE 55 and IECC building codes from ChromaDB...</span>
                </div>
              ) : auditError ? (
                <div className="p-4 rounded-lg bg-[#FF3B3B]/10 border border-[#FF3B3B]/30 text-red-200 font-mono text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#FF3B3B]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Audit Execution Error</span>
                  </div>
                  <p>{auditError}</p>
                </div>
              ) : auditReport ? (
                <div className="space-y-4">
                  {/* Summary Status Bar */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#0A0C0F] border border-[#1E2330] font-mono text-xs">
                    <span className="text-zinc-400">Target Region: <strong className="text-white">{auditReport.city}</strong></span>
                    <span className="text-zinc-400">Audited Temp: <strong className="text-[#FF6B2B]">{auditReport.temperature_f}°F</strong></span>
                  </div>

                  {/* Section 1: ASHRAE 55 */}
                  <div className="p-4 rounded-lg bg-[#0A0C0F] border border-[#1E2330] space-y-1.5">
                    <span className="font-mono text-xs font-bold uppercase text-sky-400 tracking-wider">
                      1. ASHRAE 55 Thermal Comfort Status
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                      {auditReport.ashrae_compliance_status}
                    </p>
                  </div>

                  {/* Section 2: IECC Envelope */}
                  <div className="p-4 rounded-lg bg-[#0A0C0F] border border-[#1E2330] space-y-1.5">
                    <span className="font-mono text-xs font-bold uppercase text-amber-400 tracking-wider">
                      2. IECC Building Envelope & Insulation Warning
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                      {auditReport.iecc_envelope_warning}
                    </p>
                  </div>

                  {/* Section 3: Recommended HVAC */}
                  <div className="p-4 rounded-lg bg-[#0A0C0F] border border-[#1E2330] space-y-1.5">
                    <span className="font-mono text-xs font-bold uppercase text-[#FF6B2B] tracking-wider">
                      3. Recommended HVAC Action Plan
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-mono">
                      {auditReport.recommended_hvac_action}
                    </p>
                  </div>

                  {/* Raw JSON Accordion / View */}
                  <div className="pt-2">
                    <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1.5">
                      Structured Pydantic JSON Payload:
                    </span>
                    <pre className="font-mono text-[11px] bg-[#0A0C0F] p-3.5 rounded-lg border border-[#1E2330] overflow-x-auto text-zinc-300 leading-relaxed">
                      {JSON.stringify(auditReport, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[#1E2330] flex items-center justify-end gap-3 font-mono text-xs">
              <button
                onClick={() => setIsAuditOpen(false)}
                className="px-4 py-1.5 rounded-md bg-[#181B22] hover:bg-[#1E2330] text-zinc-300 font-medium transition-colors"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
