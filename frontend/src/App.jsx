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
  AlertOctagon,
  ChevronDown,
  Globe,
  Radio,
  Server,
  ShieldAlert,
  Thermometer,
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
      timestamp: new Date().toLocaleTimeString(),
      type: "system",
      text: "ThermalOS kernel online. Telemetry stream connected to FortyGuard endpoint.",
    },
  ]);
  const [currentReading, setCurrentReading] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pollCount, setPollCount] = useState(0);

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
          const alertMessage = `🔴 [${timestamp}] HEAT SPIKE DETECTED: Threshold breached for ${selectedCity}.`;
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
              text: `⚠️ [${timestamp}] HIGH HEAT ELEVATION: ${selectedCity} at ${data.temperature_f}°F. Monitoring thermal plume.`,
            },
          ]);
        } else {
          // Standard periodic sync log (every 6 polls)
          setEventLogs((prevLogs) => {
            if (prevLogs.length % 6 === 0) {
              return [
                ...prevLogs,
                {
                  id: `${Date.now()}-${Math.random()}`,
                  timestamp,
                  type: "info",
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
        text: `📍 [${ts}] Spatial target switched to [${newCity}]. Re-indexing urban telemetry.`,
      },
    ]);
  };

  const renderRiskBadge = (level) => {
    switch (level?.toLowerCase()) {
      case "extreme":
        return (
          <span className="font-mono text-[11px] uppercase tracking-wider text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded">
            EXTREME
          </span>
        );
      case "high":
        return (
          <span className="font-mono text-[11px] uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
            HIGH
          </span>
        );
      default:
        return (
          <span className="font-mono text-[11px] uppercase tracking-wider text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
            ELEVATED
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col relative selection:bg-orange-500/20 selection:text-orange-200">
      {/* Precision background dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-60" />

      {/* Top Header / Enterprise Control Bar */}
      <header className="border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded border border-zinc-700/80 bg-zinc-900/90 flex items-center justify-center shadow-inner">
              <Thermometer className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white font-mono uppercase">
                  ThermalOS: Urban Micro-Climate OS
                </h1>
                <span className="text-[10px] font-mono text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  FortyGuard API
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Live Status Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-zinc-800/90 bg-zinc-900/60 font-mono text-xs">
              <span className="relative flex h-2 w-2">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </>
                )}
              </span>
              <span className={`text-[11px] font-medium tracking-wide uppercase ${isConnected ? "text-emerald-400" : "text-rose-400"}`}>
                {isConnected ? "LIVE (1.5s)" : "OFFLINE"}
              </span>
            </div>

            {/* City Selector */}
            <div className="relative flex items-center">
              <select
                id="city-selector"
                value={selectedCity}
                onChange={handleCityChange}
                className="appearance-none bg-zinc-900/90 border border-zinc-800 rounded px-3 py-1 pr-8 text-xs font-mono text-zinc-200 outline-none hover:border-zinc-700 focus:border-zinc-600 cursor-pointer shadow-sm"
              >
                {CITIES.map((city) => (
                  <option key={city} value={city} className="bg-zinc-950 text-zinc-200">
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
        {/* Left 2 Columns: KPI Row & Telemetry Graph */}
        <div className="lg:col-span-2 space-y-5">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Ambient Temperature */}
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/60 rounded-md p-3.5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Surface Temp</span>
                <Thermometer className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold font-mono tracking-tight text-white">
                  {currentReading ? currentReading.temperature_f : "--"}
                </span>
                <span className="text-xs font-mono text-zinc-500">°F</span>
              </div>
              <div className="mt-0.5">
                {currentReading ? renderRiskBadge(currentReading.risk_level) : (
                  <span className="text-[10px] font-mono text-zinc-600">Awaiting stream...</span>
                )}
              </div>
            </div>

            {/* Card 2: Risk Classification */}
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/60 rounded-md p-3.5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Risk Matrix</span>
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2">
                <span className="text-xl font-medium font-mono uppercase tracking-tight text-zinc-200">
                  {currentReading ? currentReading.risk_level : "--"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                Crit Floor: <span className="text-red-400">105°F</span>
              </div>
            </div>

            {/* Card 3: Spatial Resolution */}
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/60 rounded-md p-3.5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Resolution</span>
                <Radio className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2">
                <span className="text-xl font-medium font-mono text-zinc-200">
                  {currentReading ? currentReading.resolution : "10mi²"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 truncate">
                {currentReading ? currentReading.measured_at : "2m agl"}
              </div>
            </div>

            {/* Card 4: FortyGuard API Credits */}
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/60 rounded-md p-3.5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px] font-mono uppercase tracking-wider">Quota Remaining</span>
                <Zap className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="my-2">
                <span className="text-xl font-medium font-mono text-zinc-200">
                  {currentReading ? currentReading.credits_remaining.toLocaleString() : "999,999"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400">
                Enterprise Active
              </div>
            </div>
          </div>

          {/* Recharts Overhaul Container */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/60 rounded-md p-4 sm:p-5 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-800/50">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-orange-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-200">
                    Telemetry Stream • {selectedCity}
                  </h2>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  Dynamic micro-climate temperature readings (rolling 20-sample window)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span className="w-2.5 h-[1px] bg-red-600 inline-block border-t border-dashed border-red-500" />
                  <span className="text-red-400/90">Limit: 105°F</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span className="w-2 h-[2px] bg-orange-500 inline-block" />
                  <span className="text-orange-400/90">Temp (°F)</span>
                </div>
              </div>
            </div>

            {/* Precision Graph */}
            <div className="w-full h-80">
              {telemetryData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-2 border border-zinc-800/40 rounded">
                  <Activity className="w-5 h-5 animate-pulse text-zinc-400" />
                  <span>Synchronizing telemetry stream...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={telemetryData}
                    margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="neonOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#27272a"
                      opacity={0.4}
                      vertical={false}
                    />

                    <XAxis
                      dataKey="time"
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={{ stroke: "#27272a" }}
                    />

                    <YAxis
                      domain={[90, 120]}
                      stroke="#52525b"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                      axisLine={{ stroke: "#27272a" }}
                      tickFormatter={(val) => `${val}°`}
                    />

                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isBreached = item.temperature_f >= 105;
                          return (
                            <div className="bg-zinc-950/95 border border-zinc-800 p-2.5 rounded shadow-2xl backdrop-blur-md font-mono text-xs">
                              <div className="text-[10px] text-zinc-500 uppercase">{item.time}</div>
                              <div className="text-sm font-semibold text-white mt-0.5">
                                {item.temperature_f}°F
                              </div>
                              <div className="text-[10px] mt-1 text-zinc-400">
                                Status: <span className={isBreached ? "text-red-400 font-bold" : "text-zinc-300"}>{item.risk_level.toUpperCase()}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Thin, refined Critical Threshold line */}
                    <ReferenceLine
                      y={105}
                      stroke="#dc2626"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                      label={{
                        value: "CRITICAL 105°F",
                        fill: "#ef4444",
                        position: "insideTopRight",
                        fontSize: 9,
                        fontFamily: "monospace",
                        offset: 6,
                      }}
                    />

                    {/* Faded gradient area */}
                    <Area
                      type="monotone"
                      dataKey="temperature_f"
                      fill="url(#neonOrangeGrad)"
                      stroke="none"
                    />

                    {/* Smooth, vibrant thin neon stroke without chunky dots */}
                    <Line
                      type="monotone"
                      dataKey="temperature_f"
                      stroke="#f97316"
                      strokeWidth={1.75}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "#f97316",
                        stroke: "#09090b",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bottom Footer Metadata */}
            <div className="mt-3 pt-2.5 border-t border-zinc-800/40 flex items-center justify-between font-mono text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Sampling: 1500ms</span>
              </div>
              <div>
                Frames Ingested: <span className="text-zinc-300 font-medium">{pollCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Agent Event Log Sidebar (Terminal / Timeline Feed) */}
        <div className="lg:col-span-1 flex flex-col h-full space-y-4">
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/60 rounded-md p-4 flex-1 flex flex-col max-h-[580px]">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-zinc-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-200">
                  Agent Event Log
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                LIVE FEED
              </span>
            </div>

            {/* Terminal Timeline Feed */}
            <div
              ref={logsEndRef}
              className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono"
            >
              {eventLogs.map((log) => {
                const isExtreme = log.type === "extreme";
                const isHigh = log.type === "high";
                const isCityChange = log.type === "city_change";
                const isError = log.type === "error";

                const dotColor = isExtreme
                  ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                  : isHigh
                  ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                  : isCityChange
                  ? "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]"
                  : isError
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]";

                return (
                  <div
                    key={log.id}
                    className="relative pl-3.5 pb-2.5 border-l border-zinc-800/80 last:border-l-0 group"
                  >
                    {/* Glowing timeline dot */}
                    <div
                      className={`absolute -left-[4.5px] top-1 h-2 w-2 rounded-full ${dotColor} transition-transform group-hover:scale-125`}
                    />

                    {/* Timestamp & Type header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-zinc-400">
                        {log.timestamp}
                      </span>
                      {isExtreme && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-800/60 font-semibold">
                          CRITICAL BREACH
                        </span>
                      )}
                    </div>

                    {/* Message body */}
                    <p
                      className={`text-xs leading-relaxed break-words ${
                        isExtreme
                          ? "text-red-200 font-medium"
                          : isHigh
                          ? "text-amber-200"
                          : isCityChange
                          ? "text-sky-200"
                          : isError
                          ? "text-rose-300"
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
            <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>Telemetry: Active</span>
              <span>Events: {eventLogs.length}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
