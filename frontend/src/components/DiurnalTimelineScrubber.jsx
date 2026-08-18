import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import {
  Play,
  Pause,
  Clock,
  RotateCcw,
} from "lucide-react";

// Generate realistic 24-hour diurnal profile based on FortyGuard Notebook 02 curves
function generateDiurnalProfile(city) {
  const isDesert = city.includes("Phoenix") || city.includes("Las Vegas");
  const baseNightTemp = isDesert ? 82 : 74;
  const peakDayTemp = isDesert ? 106 : 94;

  const hours = [];
  for (let h = 0; h < 24; h++) {
    const timeLabel = `${h.toString().padStart(2, "0")}:00`;
    let ghi = 0;
    if (h >= 6 && h <= 19) {
      const solarAngle = Math.sin(((h - 6) / 13) * Math.PI);
      ghi = Math.round(solarAngle * (isDesert ? 940 : 820));
    }

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
    <div className="bg-white dark:bg-[#12151B] border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col shadow-xs space-y-3.5 font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                24-Hour Diurnal Solar & Thermal Forecaster · {selectedCity}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-xs font-mono text-slate-600 dark:text-zinc-400">
                Thermodynamic Model
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Simulate diurnal heat island lag, solar flux windows, and HVAC pre-cooling opportunities
            </p>
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer ${
              isPlaying
                ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-300 dark:border-zinc-700"
                : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 hover:text-slate-900 dark:hover:text-white shadow-xs"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-300" />}
            <span>{isPlaying ? "Pause" : "Play 24H"}</span>
          </button>
          <button
            onClick={() => {
              setCurrentHour(14);
              setIsPlaying(false);
              if (onHourChange) onHourChange(diurnalData[14]);
            }}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Reset to 14:00 Solar Peak"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 24-Hour Diurnal Chart */}
      <div className="w-full h-52 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={diurnalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="surfaceDiurnalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={darkMode ? "#ffffff" : "#0f172a"} stopOpacity={0.08} />
                <stop offset="95%" stopColor={darkMode ? "#ffffff" : "#0f172a"} stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              stroke={darkMode ? "#27272a" : "#e2e8f0"}
              tick={{ fill: darkMode ? "#71717a" : "#64748b", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={{ stroke: darkMode ? "#27272a" : "#e2e8f0" }}
              interval={2}
            />
            <YAxis
              domain={[60, 130]}
              ticks={[60, 80, 100, 120]}
              stroke={darkMode ? "#27272a" : "#e2e8f0"}
              tick={{ fill: darkMode ? "#71717a" : "#64748b", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
              tickLine={false}
              axisLine={{ stroke: darkMode ? "#27272a" : "#e2e8f0" }}
              tickFormatter={(val) => `${val}°`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? "#12151B" : "#ffffff",
                borderColor: darkMode ? "#27272a" : "#e2e8f0",
                borderRadius: "8px",
                color: darkMode ? "#f4f4f5" : "#0f172a",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "11px",
              }}
            />

            {/* Pre-Cool Window Highlight (03:00 - 07:00) */}
            <ReferenceArea
              x1="03:00"
              x2="07:00"
              fill={darkMode ? "rgba(255, 255, 255, 0.03)" : "rgba(15, 23, 42, 0.02)"}
              stroke={darkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(15, 23, 42, 0.15)"}
              strokeDasharray="3 3"
              label={{
                value: "Pre-Cool Window",
                fill: darkMode ? "#a1a1aa" : "#64748b",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopLeft",
              }}
            />

            {/* Peak Grid Load Window (13:00 - 17:00) */}
            <ReferenceArea
              x1="13:00"
              x2="17:00"
              fill="rgba(244, 63, 94, 0.04)"
              stroke="rgba(244, 63, 94, 0.2)"
              strokeDasharray="3 3"
              label={{
                value: "Peak Solar & Grid Load",
                fill: "#f43f5e",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopLeft",
              }}
            />

            <Area
              type="monotone"
              dataKey="surfaceTemp"
              name="Surface Temp (°F)"
              stroke={darkMode ? "#e4e4e7" : "#0f172a"}
              strokeWidth={1.75}
              fill="url(#surfaceDiurnalFill)"
            />
            <Area
              type="monotone"
              dataKey="ambientTemp"
              name="Ambient Temp (°F)"
              stroke={darkMode ? "#71717a" : "#94a3b8"}
              strokeWidth={1.25}
              fill="none"
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Timeline Scrubber Bar */}
      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/60 space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-zinc-400">Position:</span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-semibold">
              {activeDataPoint.time}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-zinc-400">
            <span>Surface: <strong className="text-slate-900 dark:text-zinc-100">{activeDataPoint.surfaceTemp}°F</strong></span>
            <span>Ambient: <strong className="text-slate-700 dark:text-zinc-300">{activeDataPoint.ambientTemp}°F</strong></span>
            <span>Solar: <strong className="text-slate-700 dark:text-zinc-300">{activeDataPoint.ghi} W/m²</strong></span>
            <span>WBGT: <strong className={activeDataPoint.wbgt >= 85 ? "text-rose-500 font-medium" : "text-slate-700 dark:text-zinc-300"}>{activeDataPoint.wbgt}°F</strong></span>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="23"
          step="1"
          value={currentHour}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-slate-700 dark:accent-zinc-400"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500">
          <span>00:00 (Night)</span>
          <span>06:00 (Dawn)</span>
          <span>12:00 (Noon)</span>
          <span>16:00 (Peak)</span>
          <span>23:00 (Night)</span>
        </div>
      </div>
    </div>
  );
}
