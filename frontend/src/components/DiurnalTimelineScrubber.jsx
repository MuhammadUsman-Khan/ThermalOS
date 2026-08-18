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
  Sun,
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
    <div className="bg-white dark:bg-[#111318] border border-gray-200 dark:border-white/5 rounded-xl p-5 flex flex-col shadow-xs space-y-4 font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                24-Hour Diurnal Solar & Thermal Forecaster · {selectedCity}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-mono text-gray-600 dark:text-zinc-400">
                Thermodynamic Model
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Simulate diurnal heat island lag, solar flux windows, and HVAC pre-cooling opportunities
            </p>
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              isPlaying
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                : "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10 hover:text-orange-500 shadow-xs"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-orange-500" />}
            <span>{isPlaying ? "Pause" : "Play 24H"}</span>
          </button>
          <button
            onClick={() => {
              setCurrentHour(14);
              setIsPlaying(false);
              if (onHourChange) onHourChange(diurnalData[14]);
            }}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 hover:text-orange-500 transition-all cursor-pointer"
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
                backgroundColor: darkMode ? "#111318" : "#ffffff",
                borderColor: darkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb",
                borderRadius: "8px",
                color: darkMode ? "#fff" : "#0f172a",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "11px",
              }}
            />

            {/* Pre-Cool Window Highlight (03:00 - 07:00) */}
            <ReferenceArea
              x1="03:00"
              x2="07:00"
              fill={darkMode ? "rgba(6, 182, 212, 0.08)" : "rgba(6, 182, 212, 0.05)"}
              stroke="rgba(6, 182, 212, 0.25)"
              strokeDasharray="3 3"
              label={{
                value: "Pre-Cooling Opportunity (Off-Peak)",
                fill: "#06b6d4",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopLeft",
              }}
            />

            {/* Peak Grid Load Window (13:00 - 17:00) */}
            <ReferenceArea
              x1="13:00"
              x2="17:00"
              fill={darkMode ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)"}
              stroke="rgba(239, 68, 68, 0.25)"
              strokeDasharray="3 3"
              label={{
                value: "Peak Solar & Grid Stress",
                fill: "#ef4444",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopLeft",
              }}
            />

            <Area
              type="monotone"
              dataKey="surfaceTemp"
              name="Surface Temp (°F)"
              stroke="#f97316"
              strokeWidth={2}
              fill="url(#surfaceDiurnalFill)"
            />
            <Area
              type="monotone"
              dataKey="ambientTemp"
              name="Ambient Temp (°F)"
              stroke="#38bdf8"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="4 4"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Timeline Scrubber Bar */}
      <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-zinc-400">Scrubber Position:</span>
            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500 font-semibold">
              {activeDataPoint.time} ({activeDataPoint.hour}:00)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500 dark:text-zinc-400">
            <span>Surface: <strong className="text-orange-500">{activeDataPoint.surfaceTemp}°F</strong></span>
            <span>Ambient: <strong className="text-sky-400">{activeDataPoint.ambientTemp}°F</strong></span>
            <span>Solar: <strong className="text-amber-500">{activeDataPoint.ghi} W/m²</strong></span>
            <span>WBGT: <strong className={activeDataPoint.wbgt >= 85 ? "text-rose-500" : "text-emerald-500"}>{activeDataPoint.wbgt}°F</strong></span>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="23"
          step="1"
          value={currentHour}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
        <div className="flex justify-between text-[10px] font-mono text-gray-400 dark:text-zinc-500">
          <span>00:00 (Night Min)</span>
          <span>06:00 (Dawn)</span>
          <span>12:00 (Solar Noon)</span>
          <span>16:00 (Thermal Peak)</span>
          <span>23:00 (Night)</span>
        </div>
      </div>
    </div>
  );
}
