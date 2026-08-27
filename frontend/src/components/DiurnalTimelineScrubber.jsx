import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sun,
  Moon,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { motion } from "framer-motion";

const generateDiurnalProfile = (baseTempF = 104) => {
  const profile = [];
  for (let h = 0; h < 24; h++) {
    const rad = ((h - 6) / 24) * 2 * Math.PI;
    const solarFactor = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
    const surfaceNoise = Math.sin(h * 0.8) * 1.2;
    const ambientNoise = Math.cos(h * 0.6) * 0.8;

    const surface = +(
      baseTempF +
      14 * solarFactor -
      (1 - solarFactor) * 8 +
      surfaceNoise
    ).toFixed(1);

    const ambientRad = ((h - 8.5) / 24) * 2 * Math.PI;
    const ambient = +(
      baseTempF - 3 +
      7 * Math.sin(ambientRad) +
      ambientNoise
    ).toFixed(1);

    const ghi = +(Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) * 920).toFixed(0);

    profile.push({
      hour: `${h.toString().padStart(2, "0")}:00`,
      hourIndex: h,
      surface,
      ambient,
      ghi,
      precoolWindow: h >= 3 && h <= 7,
      peakStressWindow: h >= 13 && h <= 17,
    });
  }
  return profile;
};

export default function DiurnalTimelineScrubber({
  selectedCity = "Phoenix, AZ",
  darkMode = true,
}) {
  const [curveData, setCurveData] = useState(() => generateDiurnalProfile(104));
  const [currentHour, setCurrentHour] = useState(14);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setCurveData(generateDiurnalProfile(selectedCity.includes("Phoenix") ? 106 : 98));
  }, [selectedCity]);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentHour((prev) => (prev + 1) % 24);
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const activePoint = curveData[currentHour] || curveData[0];
  const isForecastZone = currentHour >= 12;

  return (
    <div className="glass-panel rounded-3xl p-5 flex flex-col space-y-4 font-sans">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 pb-3.5 border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold tracking-tight text-black dark:text-white whitespace-nowrap">
                24-Hour Diurnal Forecaster
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[11px] font-mono font-medium text-orange-400 shrink-0">
                {selectedCity}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10.5px] font-mono text-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                12h AI Cast
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 font-mono">
              FortyGuard Thermodynamic Simulation · Historical Baseline + Real-Time AI Casting
            </p>
          </div>
        </div>

        {/* Modern Color-Coded Phase Legend Badges */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-blue-400 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
            <span className="text-[10.5px] font-medium whitespace-nowrap">00:00–12:00 Baseline</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse" />
            <span className="text-[10.5px] font-medium whitespace-nowrap">12:00–24:00 AI Forecast</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
            <span className="text-[10.5px] font-medium whitespace-nowrap">03:00–07:00 Pre-Cool</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
            <span className="text-[10.5px] font-medium whitespace-nowrap">13:00–17:00 Peak Stress</span>
          </div>
        </div>
      </div>

      {/* Scrubber Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl glass-panel-subtle">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg glass-panel-subtle text-black dark:text-white hover:text-orange-500 hover:border-orange-500/30 transition-colors shadow-xs cursor-pointer flex items-center gap-1 font-mono text-xs"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Simulate"}</span>
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentHour(14);
            }}
            className="p-1.5 rounded-lg glass-panel-subtle text-gray-500 dark:text-zinc-400 hover:text-orange-500 hover:border-orange-500/30 transition-colors shadow-xs cursor-pointer"
            title="Reset to 14:00 Peak"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hour Slider */}
        <div className="flex-1 max-w-md w-full flex items-center gap-3">
          <span className="font-mono text-[10px] text-blue-400 font-semibold">00:00 Hist</span>
          <input
            type="range"
            min="0"
            max="23"
            step="1"
            value={currentHour}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentHour(parseInt(e.target.value, 10));
            }}
            className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FF6B2B]"
          />
          <span className="font-mono text-[10px] text-emerald-400 font-semibold">+12h Cast</span>
        </div>

        {/* Selected Hour Telemetry Callout */}
        <div className="flex items-center gap-3 font-mono text-xs bg-white dark:bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs">
          <span className={`font-bold ${isForecastZone ? "text-emerald-400" : "text-blue-400"}`}>
            {activePoint.hour} {isForecastZone ? "(AI Cast)" : "(Hist)"}
          </span>
          <span className="text-gray-300 dark:text-zinc-700">|</span>
          <span>
            Surf: <strong className="text-orange-400">{activePoint.surface}°F</strong>
          </span>
          <span>
            Air: <strong className="text-cyan-400">{activePoint.ambient}°F</strong>
          </span>
          <span>
            GHI: <strong className="text-amber-400">{activePoint.ghi} W/m²</strong>
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="diurnalSurfaceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B2B" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#FF6B2B" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Historical Zone Background (00:00 - 12:00) */}
            <ReferenceArea
              x1="00:00"
              x2="12:00"
              fill="#3B82F6"
              fillOpacity={0.03}
            />

            {/* AI Casting Forecast Horizon (12:00 - 23:00) */}
            <ReferenceArea
              x1="12:00"
              x2="23:00"
              fill="#10B981"
              fillOpacity={0.04}
            />

            {/* 12h AI Casting Horizon Line */}
            <ReferenceLine
              x="12:00"
              stroke="#10B981"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: "⚡ 12h AI Casting Horizon",
                fill: "#10B981",
                fontSize: 9.5,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopLeft",
              }}
            />

            {/* Pre-Cool Window */}
            <ReferenceArea
              x1="03:00"
              x2="07:00"
              fill="#06B6D4"
              fillOpacity={0.08}
              stroke="#06B6D4"
              strokeDasharray="3 3"
            />

            {/* Peak Stress Window */}
            <ReferenceArea
              x1="13:00"
              x2="17:00"
              fill="#F43F5E"
              fillOpacity={0.08}
              stroke="#F43F5E"
              strokeDasharray="3 3"
            />

            {/* Current Scrubbed Hour Line */}
            <ReferenceLine
              x={activePoint.hour}
              stroke="#FF6B2B"
              strokeWidth={2}
              label={{
                value: `▶ ${activePoint.hour}`,
                fill: "#FF6B2B",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopLeft",
              }}
            />

            <XAxis
              dataKey="hour"
              stroke={darkMode ? "#27272a" : "#e2e8f0"}
              tick={{ fill: darkMode ? "#71717a" : "#64748b", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={{ stroke: darkMode ? "#27272a" : "#e2e8f0" }}
              interval={2}
            />

            <YAxis
              domain={[75, 125]}
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
                borderRadius: "8px",
                color: darkMode ? "#ffffff" : "#000000",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "11px",
              }}
            />

            <Area
              type="monotone"
              dataKey="surface"
              name="Surface Temp (°F)"
              stroke="#FF6B2B"
              strokeWidth={2.5}
              fill="url(#diurnalSurfaceFill)"
            />

            <Line
              type="monotone"
              dataKey="ambient"
              name="Ambient Air (°F)"
              stroke="#38BDF8"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Insights Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl glass-panel-subtle border-cyan-500/20 flex items-center gap-2.5 hover:border-cyan-500/40 transition-colors">
          <Zap className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <div>
            <div className="font-bold text-cyan-700 dark:text-cyan-400">03:00 - 07:00 · Pre-Cool Window</div>
            <div className="text-[11px] text-gray-600 dark:text-zinc-400">
              Low tariff off-peak chiller charging shifts 420 kW load.
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel-subtle border-orange-500/20 flex items-center gap-2.5 hover:border-orange-500/40 transition-colors">
          <Sun className="w-4 h-4 text-orange-600 dark:text-orange-500 shrink-0" />
          <div>
            <div className="font-bold text-orange-700 dark:text-orange-500">14:00 · Peak Surface Flux</div>
            <div className="text-[11px] text-gray-600 dark:text-zinc-400">
              Max solar irradiance ({curveData[14].ghi} W/m²) precedes ambient peak by ~2 hrs.
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl glass-panel-subtle border-rose-500/20 flex items-center gap-2.5 hover:border-rose-500/40 transition-colors">
          <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-500 shrink-0" />
          <div>
            <div className="font-bold text-rose-700 dark:text-rose-500">13:00 - 17:00 · Thermal Stress Peak</div>
            <div className="text-[11px] text-gray-600 dark:text-zinc-400">
              Active municipal heat advisory & grid peak shaving sequence.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
