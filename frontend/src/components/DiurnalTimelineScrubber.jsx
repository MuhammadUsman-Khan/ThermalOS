import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import {
  Play,
  Pause,
  Clock,
  Sun,
  Zap,
  RotateCcw,
  Sparkles,
  Droplets,
  Thermometer,
} from "lucide-react";

// Generate realistic 24-hour diurnal profile based on FortyGuard Notebook 02 curves
function generateDiurnalProfile(city) {
  const isDesert = city.includes("Phoenix") || city.includes("Las Vegas");
  const baseNightTemp = isDesert ? 82 : 74;
  const peakDayTemp = isDesert ? 106 : 94;

  const hours = [];
  for (let h = 0; h < 24; h++) {
    const timeLabel = `${h.toString().padStart(2, "0")}:00`;
    // Solar GHI peaks at solar noon (13:00)
    let ghi = 0;
    if (h >= 6 && h <= 19) {
      const solarAngle = Math.sin(((h - 6) / 13) * Math.PI);
      ghi = Math.round(solarAngle * (isDesert ? 940 : 820));
    }

    // Temperature lags solar noon by 2-3 hours (peaks at 15:00-16:00)
    const tempProgress = Math.sin(((h - 8) / 16) * Math.PI);
    const ambientTemp =
      h >= 6 && h <= 22
        ? Math.round(baseNightTemp + (peakDayTemp - baseNightTemp) * Math.max(0, tempProgress))
        : baseNightTemp + Math.round(Math.sin((h / 6) * Math.PI) * 2);

    const surfaceTemp =
      ghi > 0
        ? Math.round(ambientTemp + (ghi / 940) * 16)
        : Math.round(ambientTemp - 1.5);

    const humidity =
      ghi > 0
        ? Math.max(11, Math.round(35 - (ghi / 940) * 22))
        : Math.round(32 + Math.cos((h / 24) * Math.PI * 2) * 5);

    const wbgt = +(0.567 * ((ambientTemp - 32) * (5 / 9)) + 0.393 * (humidity / 5) + 3.94) * 1.8 + 32;

    hours.push({
      hour: h,
      time: timeLabel,
      ghi,
      ambientTemp,
      surfaceTemp,
      humidity,
      wbgt: +wbgt.toFixed(1),
    });
  }
  return hours;
}

export default function DiurnalTimelineScrubber({ selectedCity, onHourChange, darkMode }) {
  const [currentHour, setCurrentHour] = useState(14); // default 2:00 PM
  const [isPlaying, setIsPlaying] = useState(false);

  const diurnalData = generateDiurnalProfile(selectedCity);
  const activeDataPoint = diurnalData[currentHour] || diurnalData[14];

  // Playback timer
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour((prev) => {
          const next = (prev + 1) % 24;
          if (onHourChange) onHourChange(diurnalData[next]);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, diurnalData, onHourChange]);

  const handleSliderChange = (e) => {
    const newHour = parseInt(e.target.value, 10);
    setCurrentHour(newHour);
    if (onHourChange) onHourChange(diurnalData[newHour]);
  };

  return (
    <div className="bg-white dark:bg-[#0D0D0D]/90 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                24-HOUR DIURNAL SOLAR & THERMAL SIMULATOR • {selectedCity}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-500 font-bold uppercase">
                PREDICTIVE TIMELINE
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Simulate diurnal heat island lag, solar flux windows, and pre-cooling opportunities
            </p>
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
              isPlaying
                ? "bg-red-500/20 text-red-500 border border-red-500/30"
                : "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md hover:brightness-110"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "PAUSE SIM" : "PLAY 24H SIM"}</span>
          </button>
          <button
            onClick={() => {
              setCurrentHour(14);
              setIsPlaying(false);
              if (onHourChange) onHourChange(diurnalData[14]);
            }}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-orange-500 transition-all"
            title="Reset to 14:00 Solar Peak"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 24-Hour Diurnal Chart */}
      <div className="w-full h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={diurnalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="solarGhiFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={darkMode ? 0.35 : 0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="surfaceDiurnalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={darkMode ? 0.4 : 0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              stroke={darkMode ? "#1E2330" : "#E5E7EB"}
              tick={{ fill: darkMode ? "#71717A" : "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={{ stroke: darkMode ? "#1E2330" : "#E5E7EB" }}
              interval={2}
            />
            <YAxis
              domain={[60, 130]}
              ticks={[60, 80, 100, 120]}
              stroke={darkMode ? "#1E2330" : "#E5E7EB"}
              tick={{ fill: darkMode ? "#71717A" : "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={{ stroke: darkMode ? "#1E2330" : "#E5E7EB" }}
              tickFormatter={(val) => `${val}°`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? "#0D0D0D" : "#ffffff",
                borderColor: darkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb",
                borderRadius: "8px",
                color: darkMode ? "#fff" : "#0f172a",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "11px",
              }}
            />

            {/* Proactive Pre-Cool Window Highlight (03:00 - 07:00) */}
            <ReferenceArea
              x1="03:00"
              x2="07:00"
              fill={darkMode ? "rgba(6, 182, 212, 0.10)" : "rgba(6, 182, 212, 0.08)"}
              stroke="rgba(6, 182, 212, 0.3)"
              strokeDasharray="3 3"
              label={{
                value: "AGENT 2 PRE-COOL WINDOW",
                fill: "#06b6d4",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopLeft",
              }}
            />

            {/* Peak Grid Load Window Highlight (13:00 - 17:00) */}
            <ReferenceArea
              x1="13:00"
              x2="17:00"
              fill={darkMode ? "rgba(239, 68, 68, 0.10)" : "rgba(239, 68, 68, 0.08)"}
              stroke="rgba(239, 68, 68, 0.3)"
              strokeDasharray="3 3"
              label={{
                value: "PEAK SOLAR & GRID STRESS",
                fill: "#ef4444",
                fontSize: 9,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopRight",
              }}
            />

            {/* Current Scrubbed Hour Vertical Reference Line */}
            <ReferenceLine
              x={activeDataPoint.time}
              stroke="#f97316"
              strokeWidth={2}
              label={{
                value: `SCRUBBED: ${activeDataPoint.time}`,
                fill: "#f97316",
                fontSize: 10,
                fontWeight: "bold",
                fontFamily: "JetBrains Mono, monospace",
                position: "top",
              }}
            />

            <Area
              type="monotone"
              dataKey="surfaceTemp"
              name="Surface Temp (°F)"
              stroke="#f97316"
              strokeWidth={2.5}
              fill="url(#surfaceDiurnalFill)"
            />
            <Area
              type="monotone"
              dataKey="ambientTemp"
              name="Ambient Canopy (°F)"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Scrubbing Slider & Instant Readouts */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-gray-500 dark:text-zinc-400">TIMELINE SCRUBBER:</span>
          <span className="text-orange-500 font-bold text-sm">
            {activeDataPoint.time} (Hour {currentHour} of 24)
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="23"
          value={currentHour}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500 shadow-inner"
        />

        {/* 4 Readout Badges for Selected Hour */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono text-xs">
          <div className="p-3 rounded-xl border border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
            <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-500" />
              Surface Temp:
            </span>
            <strong className="text-orange-500 text-sm">{activeDataPoint.surfaceTemp}°F</strong>
          </div>

          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
            <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Solar GHI:
            </span>
            <strong className="text-amber-500 text-sm">{activeDataPoint.ghi} W/m²</strong>
          </div>

          <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between">
            <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-500" />
              Rel Humidity:
            </span>
            <strong className="text-cyan-500 text-sm">{activeDataPoint.humidity}%</strong>
          </div>

          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
            <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              WBGT Index:
            </span>
            <strong className={`text-sm ${activeDataPoint.wbgt >= 85 ? "text-red-500 font-bold" : "text-rose-500"}`}>
              {activeDataPoint.wbgt}°F
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
