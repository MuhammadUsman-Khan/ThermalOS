import { useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { Clock, Play, Pause, RotateCcw, Zap, Sun, ShieldAlert } from "lucide-react";

// Generate 24-hour diurnal thermal cycle data for a city
function generateDiurnalCurve(cityName) {
  const data = [];
  const isDesert = cityName.includes("Phoenix") || cityName.includes("Las Vegas") || cityName.includes("Tucson");
  const baseAmbient = isDesert ? 88 : 74;
  const peakAmbientDelta = isDesert ? 24 : 16;
  const baseSurface = isDesert ? 82 : 70;
  const peakSurfaceDelta = isDesert ? 38 : 25;

  for (let hour = 0; hour < 24; hour++) {
    const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
    // Solar curve peaks at 14:00 (hour 14)
    const solarFactor = Math.max(0, Math.sin(((hour - 6) / 14) * Math.PI));
    // Thermal lag: Surface peaks at 14:00, Ambient peaks at 16:00
    const surfaceFactor = Math.max(0, Math.sin(((hour - 6.5) / 13.5) * Math.PI));
    const ambientFactor = Math.max(0, Math.sin(((hour - 8) / 13) * Math.PI));

    const ambient = +(baseAmbient + ambientFactor * peakAmbientDelta).toFixed(1);
    const surface = +(baseSurface + Math.pow(surfaceFactor, 1.2) * peakSurfaceDelta).toFixed(1);
    const ghi = Math.round(solarFactor * (isDesert ? 980 : 780));
    const isPrecoolWindow = hour >= 3 && hour <= 6;
    const isPeakWindow = hour >= 13 && hour <= 17;

    data.push({
      hour,
      time: timeLabel,
      ambient,
      surface,
      ghi,
      delta: +(surface - ambient).toFixed(1),
      isPrecoolWindow,
      isPeakWindow,
    });
  }
  return data;
}

export default function DiurnalTimelineScrubber({ selectedCity = "Phoenix, AZ", darkMode = true }) {
  const [currentHour, setCurrentHour] = useState(14);
  const [isPlaying, setIsPlaying] = useState(false);

  const curveData = generateDiurnalCurve(selectedCity);
  const activePoint = curveData[currentHour] || curveData[14];

  // Play animation through 24h
  useState(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentHour((h) => (h + 1) % 24);
      }, 750);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col shadow-xs space-y-4 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold tracking-tight text-black dark:text-white">
                24-Hour Diurnal Thermal Forecaster
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-xs font-mono text-orange-500">
                {selectedCity}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Thermodynamic lag simulation: Surface irradiance vs. Canopy air lag & HVAC shifting windows
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/30 border border-cyan-500" />
            <span className="text-gray-600 dark:text-zinc-400 text-[11px]">03:00–07:00 Pre-Cool</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/30 border border-rose-500" />
            <span className="text-gray-600 dark:text-zinc-400 text-[11px]">13:00–17:00 Peak Stress</span>
          </div>
        </div>
      </div>

      {/* Scrubber Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-black dark:text-white hover:text-orange-500 hover:border-orange-500/30 transition-colors shadow-xs cursor-pointer flex items-center gap-1 font-mono text-xs"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause" : "Simulate"}</span>
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentHour(14);
            }}
            className="p-1.5 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:text-orange-500 hover:border-orange-500/30 transition-colors shadow-xs cursor-pointer"
            title="Reset to 14:00 Peak"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hour Slider */}
        <div className="flex-1 max-w-md w-full flex items-center gap-3">
          <span className="font-mono text-xs text-gray-500 dark:text-zinc-400">00:00</span>
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
          <span className="font-mono text-xs text-gray-500 dark:text-zinc-400">23:00</span>
        </div>

        {/* Current Scrubber Point Stats */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500 font-semibold">
            T = {activePoint.time}
          </div>
          <div className="text-gray-600 dark:text-zinc-400">
            Surface: <strong className="text-orange-500">{activePoint.surface}°F</strong>
          </div>
          <div className="text-gray-600 dark:text-zinc-400">
            Air: <strong className="text-cyan-400">{activePoint.ambient}°F</strong>
          </div>
        </div>
      </div>

      {/* Diurnal Chart */}
      <div className="w-full h-72 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curveData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="diurnalSurfaceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B2B" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#FF6B2B" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Reference Pre-Cool Charging Window */}
            <ReferenceArea
              x1="03:00"
              x2="07:00"
              fill="#06B6D4"
              fillOpacity={0.08}
              stroke="#06B6D4"
              strokeDasharray="3 3"
              strokeWidth={0.75}
            />

            {/* Reference Peak Stress Window */}
            <ReferenceArea
              x1="13:00"
              x2="17:00"
              fill="#F43F5E"
              fillOpacity={0.08}
              stroke="#F43F5E"
              strokeDasharray="3 3"
              strokeWidth={0.75}
            />

            {/* Current Selected Scrubber Time Line */}
            <ReferenceLine
              x={activePoint.time}
              stroke="#FF5500"
              strokeWidth={2}
              strokeDasharray="2 2"
              label={{
                value: `Current: ${activePoint.time}`,
                fill: "#FF5500",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
                position: "insideTopRight",
              }}
            />

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
              ticks={[60, 75, 90, 105, 120]}
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
        <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="font-semibold text-cyan-400">03:00 - 07:00 · Pre-Cool Window</div>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400">
              Low tariff off-peak chiller charging shifts 420 kW load.
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center gap-2.5">
          <Sun className="w-4 h-4 text-orange-500 shrink-0" />
          <div>
            <div className="font-semibold text-orange-500">14:00 · Peak Surface Flux</div>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400">
              Max solar irradiance ({curveData[14].ghi} W/m²) precedes ambient peak by ~2 hrs.
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
          <div>
            <div className="font-semibold text-rose-500">13:00 - 17:00 · Thermal Stress Peak</div>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400">
              Active municipal heat advisory & grid peak shaving sequence.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
