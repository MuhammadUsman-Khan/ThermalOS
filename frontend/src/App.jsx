import React, { useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
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
  Flame,
  Globe,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sliders,
  Thermometer,
  Zap,
  CheckCircle2,
  Cpu,
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
      timestamp: new Date().toLocaleTimeString(),
      type: "system",
      text: "⚡ ThermalOS Central Core initialized. Connecting to FortyGuard API on port 8000...",
    },
  ]);
  const [currentReading, setCurrentReading] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState(null);

  const logsEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [eventLogs]);

  // Polling loop
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
        setLastPollTime(timestamp);
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

        // Trigger extreme alert if risk_level is extreme
        if (data.risk_level === "extreme" || data.temperature_f >= 110) {
          const alertMessage = `🔴 [${timestamp}] HEAT SPIKE DETECTED: Threshold breached for ${selectedCity}. (${data.temperature_f}°F - Extreme Risk)`;
          setEventLogs((prevLogs) => [
            ...prevLogs,
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "extreme",
              text: alertMessage,
            },
          ]);
        } else if (data.risk_level === "high") {
          setEventLogs((prevLogs) => [
            ...prevLogs,
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp,
              type: "high",
              text: `⚠️ [${timestamp}] HIGH HEAT WARNING: ${selectedCity} registered ${data.temperature_f}°F. Monitoring urban core.`,
            },
          ]);
        } else {
          // Add occasional standard telemetry telemetry log (every 5 polls)
          setEventLogs((prevLogs) => {
            if (prevLogs.length % 5 === 0) {
              return [
                ...prevLogs,
                {
                  id: `${Date.now()}-${Math.random()}`,
                  timestamp,
                  type: "info",
                  text: `📊 [${timestamp}] Telemetry sync: ${selectedCity} at ${data.temperature_f}°F (${data.risk_level}). Resolution: ${data.resolution}.`,
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
            text: `❌ [${timestamp}] CONNECTION FAILED: Unable to reach FortyGuard backend on http://127.0.0.1:8000. Retrying...`,
          },
        ]);
      }
    };

    // Execute immediately on mount or city change
    fetchHeatIntelligence();

    // Poll every 1500ms
    const intervalId = setInterval(fetchHeatIntelligence, 1500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedCity]);

  // Handle city change
  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setSelectedCity(newCity);
    const ts = new Date().toLocaleTimeString();
    setEventLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: ts,
        type: "city_change",
        text: `📍 [${ts}] Sensor Target switched to [${newCity}]. Re-calibrating micro-climate stream...`,
      },
    ]);
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case "extreme":
        return "text-red-500 bg-red-950/60 border-red-800/80 shadow-red-950/50";
      case "high":
        return "text-orange-400 bg-orange-950/60 border-orange-800/80 shadow-orange-950/50";
      default:
        return "text-sky-400 bg-sky-950/60 border-sky-800/80 shadow-sky-950/50";
    }
  };

  const getRiskBadge = (level) => {
    switch (level?.toLowerCase()) {
      case "extreme":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            EXTREME RISK
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            HIGH RISK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            ELEVATED
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navigation / Mission Control Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 shadow-lg shadow-orange-500/20 p-2.5">
              <Thermometer className="w-6 h-6 text-slate-950" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-ping" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  ThermalOS: Urban Micro-Climate OS
                </h1>
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  FortyGuard v26.4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Autonomous Thermodynamic Telemetry & Micro-Climate Control Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Live Status Badge */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 shadow-inner">
              <span className="relative flex h-2.5 w-2.5">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </>
                )}
              </span>
              <span className={`text-xs font-bold tracking-wider uppercase ${isConnected ? "text-emerald-400" : "text-rose-400"}`}>
                {isConnected ? "LIVE TELEMETRY (1.5s)" : "CONNECTING..."}
              </span>
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-orange-500/50 shadow-sm">
              <Globe className="w-4 h-4 text-orange-400" />
              <label htmlFor="city-selector" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                City:
              </label>
              <select
                id="city-selector"
                value={selectedCity}
                onChange={handleCityChange}
                className="bg-transparent text-sm font-semibold text-slate-100 outline-none cursor-pointer pr-2"
              >
                {CITIES.map((city) => (
                  <option key={city} value={city} className="bg-slate-900 text-slate-100">
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Telemetry Metrics & Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Current Temperature Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Current Temp</span>
                <Thermometer className="w-4 h-4 text-orange-400" />
              </div>
              <div className="my-2 flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                  {currentReading ? `${currentReading.temperature_f}°` : "--"}
                </span>
                <span className="text-sm font-semibold text-slate-400">F</span>
              </div>
              <div className="mt-1">
                {currentReading ? getRiskBadge(currentReading.risk_level) : (
                  <span className="text-xs text-slate-500">Awaiting stream...</span>
                )}
              </div>
            </div>

            {/* Risk Level Card */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Risk Level</span>
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <div className="my-2">
                <span className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-100 font-mono">
                  {currentReading ? currentReading.risk_level : "--"}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                <span>Threshold: 105°F</span>
              </div>
            </div>

            {/* Resolution & Sensor Altitude */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Resolution</span>
                <Radio className="w-4 h-4 text-sky-400" />
              </div>
              <div className="my-2">
                <span className="text-2xl font-bold font-mono text-slate-100">
                  {currentReading ? currentReading.resolution : "10mi²"}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {currentReading ? currentReading.measured_at : "2m above ground"}
              </div>
            </div>

            {/* FortyGuard Credits */}
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden backdrop-blur-sm shadow-lg">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">API Credits</span>
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {currentReading ? currentReading.credits_remaining.toLocaleString() : "999,999"}
                </span>
              </div>
              <div className="text-[11px] text-emerald-500/90 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Unlimited Hackathon Tier</span>
              </div>
            </div>
          </div>

          {/* Telemetry Chart Container */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 backdrop-blur-sm shadow-xl flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Dynamic Telemetry Stream: {selectedCity}
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time urban surface temperature measurements (rolling 20-sample window)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="w-2.5 h-0.5 bg-red-500 inline-block border-t border-dashed border-red-400"></span>
                  <span className="text-red-400 font-semibold">Crit: 105°F</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                  <span>Temp (°F)</span>
                </div>
              </div>
            </div>

            {/* Chart Area */}
            <div className="w-full h-80 sm:h-96">
              {telemetryData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3 border border-dashed border-slate-800 rounded-xl">
                  <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-sm font-medium">Acquiring sensor lock for {selectedCity}...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={telemetryData}
                    margin={{ top: 15, right: 25, left: -10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} vertical={false} />
                    
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    
                    <YAxis
                      domain={[90, 120]}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                      tickFormatter={(val) => `${val}°F`}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isBreached = item.temperature_f >= 105;
                          return (
                            <div className="bg-slate-900/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md">
                              <div className="text-[11px] font-semibold text-slate-400">{item.time}</div>
                              <div className="text-base font-bold font-mono text-white mt-1">
                                {item.city}: <span className="text-orange-400">{item.temperature_f}°F</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                {item.risk_level === "extreme" ? (
                                  <span className="text-[11px] font-bold text-red-400 uppercase">● Extreme Breach</span>
                                ) : item.risk_level === "high" ? (
                                  <span className="text-[11px] font-bold text-amber-400 uppercase">▲ High Temp</span>
                                ) : (
                                  <span className="text-[11px] font-bold text-sky-400 uppercase">■ Elevated</span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Critical Threshold Line */}
                    <ReferenceLine
                      y={105}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{
                        value: "Critical Threshold (105°F)",
                        fill: "#ef4444",
                        position: "insideTopRight",
                        fontSize: 11,
                        fontWeight: "bold",
                        offset: 8,
                      }}
                    />

                    {/* Area under curve */}
                    <Area
                      type="monotone"
                      dataKey="temperature_f"
                      fill="url(#tempGradient)"
                      stroke="none"
                    />

                    {/* Telemetry Line */}
                    <Line
                      type="monotone"
                      dataKey="temperature_f"
                      stroke="#f97316"
                      strokeWidth={3}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        const isExtreme = payload.temperature_f >= 110;
                        const isHigh = payload.temperature_f >= 100;
                        const dotColor = isExtreme ? "#ef4444" : isHigh ? "#f97316" : "#38bdf8";
                        return (
                          <circle
                            key={`${cx}-${cy}`}
                            cx={cx}
                            cy={cy}
                            r={isExtreme ? 5 : 3.5}
                            fill={dotColor}
                            stroke="#0f172a"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 7, stroke: "#ffffff", strokeWidth: 2, fill: "#f97316" }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom Chart Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Sampling: 1.5s interval</span>
              </div>
              <div className="font-mono text-[11px]">
                Pulses Recorded: <span className="text-slate-200 font-semibold">{pollCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Agent Event Log Sidebar */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-4">
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex-1 flex flex-col max-h-[640px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/90 mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold tracking-tight text-white">
                  Agent Event Log
                </h2>
              </div>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                LIVE FEED
              </span>
            </div>

            {/* Event Feed List */}
            <div
              ref={logsEndRef}
              className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-xs"
            >
              {eventLogs.map((log) => {
                const isExtreme = log.type === "extreme";
                const isHigh = log.type === "high";
                const isCityChange = log.type === "city_change";
                const isError = log.type === "error";

                return (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl border transition-all duration-200 ${
                      isExtreme
                        ? "bg-red-950/70 border-red-800/80 text-red-200 shadow-md shadow-red-950/40"
                        : isHigh
                        ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
                        : isCityChange
                        ? "bg-sky-950/40 border-sky-800/60 text-sky-200"
                        : isError
                        ? "bg-rose-950/80 border-rose-800 text-rose-200"
                        : "bg-slate-950/70 border-slate-800/80 text-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 leading-relaxed break-words">
                        {log.text}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / Status */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Status: Stream Synced</span>
              <span>Events: {eventLogs.length}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
