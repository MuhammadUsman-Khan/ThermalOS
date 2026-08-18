import {
  Globe,
  MapPin,
  Flame,
  Sun,
  Shield,
  Droplets,
  Building,
  Check,
  ChevronRight,
  Zap,
} from "lucide-react";

const CITY_METRICS = [
  {
    city: "Phoenix, AZ",
    ambient: 104,
    surface: 117.3,
    delta: 13.3,
    ghi: 604.5,
    humidity: 13.0,
    wetBulb: 78.4,
    wbgt: 86.7,
    buildingPct: 42.5,
    status: "CRITICAL ALERT",
    statusType: "critical",
  },
  {
    id: "las_vegas",
    city: "Las Vegas, NV",
    ambient: 101,
    surface: 114.2,
    delta: 13.2,
    ghi: 588.0,
    humidity: 15.5,
    wetBulb: 76.8,
    wbgt: 84.8,
    buildingPct: 38.0,
    status: "PRE-COOL ACTIVE",
    statusType: "precool",
  },
  {
    city: "Houston, TX",
    ambient: 93,
    surface: 102.5,
    delta: 9.5,
    ghi: 495.0,
    humidity: 62.0,
    wetBulb: 82.1,
    wbgt: 88.2,
    buildingPct: 46.2,
    status: "CRITICAL HUMIDITY",
    statusType: "critical",
  },
  {
    city: "Dallas, TX",
    ambient: 96,
    surface: 107.1,
    delta: 11.1,
    ghi: 535.0,
    humidity: 48.0,
    wetBulb: 79.5,
    wbgt: 85.6,
    buildingPct: 41.8,
    status: "ELEVATED WBGT",
    statusType: "elevated",
  },
  {
    city: "San Jose, CA",
    ambient: 82,
    surface: 91.4,
    delta: 9.4,
    ghi: 440.0,
    humidity: 38.5,
    wetBulb: 65.2,
    wbgt: 73.5,
    buildingPct: 35.4,
    status: "NOMINAL BASELINE",
    statusType: "nominal",
  },
  {
    city: "New York, NY",
    ambient: 88,
    surface: 99.8,
    delta: 11.8,
    ghi: 470.0,
    humidity: 54.0,
    wetBulb: 75.1,
    wbgt: 81.9,
    buildingPct: 62.1,
    status: "URBAN CANYON HEAT",
    statusType: "elevated",
  },
  {
    city: "Chicago, IL",
    ambient: 84,
    surface: 94.2,
    delta: 10.2,
    ghi: 455.0,
    humidity: 46.0,
    wetBulb: 70.4,
    wbgt: 77.2,
    buildingPct: 52.8,
    status: "NOMINAL BASELINE",
    statusType: "nominal",
  },
  {
    city: "Miami, FL",
    ambient: 92,
    surface: 104.6,
    delta: 12.6,
    ghi: 560.0,
    humidity: 71.0,
    wetBulb: 84.6,
    wbgt: 90.4,
    buildingPct: 39.5,
    status: "EXTREME WBGT HAZARD",
    statusType: "critical",
  },
  {
    city: "Los Angeles, CA",
    ambient: 95,
    surface: 108.3,
    delta: 13.3,
    ghi: 575.0,
    humidity: 32.0,
    wetBulb: 74.8,
    wbgt: 83.9,
    buildingPct: 48.0,
    status: "PRE-COOL ACTIVE",
    statusType: "precool",
  },
  {
    city: "Atlanta, GA",
    ambient: 91,
    surface: 101.9,
    delta: 10.9,
    ghi: 490.0,
    humidity: 58.0,
    wetBulb: 78.9,
    wbgt: 84.7,
    buildingPct: 36.7,
    status: "ELEVATED HUMIDITY",
    statusType: "elevated",
  },
];

export default function NationalThermalGridMatrix({ selectedCity, onSelectCity }) {
  return (
    <div className="bg-white dark:bg-[#0D0D0D]/90 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                National Thermal Grid Matrix
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-mono text-gray-600 dark:text-zinc-400 font-medium">
                Comparative Matrix
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Cross-city comparative telemetry across monitored metropolitan thermal corridors
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10 text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              <th className="py-3 px-3">City / Grid Zone</th>
              <th className="py-3 px-2">Ambient Air</th>
              <th className="py-3 px-2">Surface Temp</th>
              <th className="py-3 px-2">Surface ΔT</th>
              <th className="py-3 px-2">Solar GHI</th>
              <th className="py-3 px-2">Humidity (RH)</th>
              <th className="py-3 px-2">WBGT Index</th>
              <th className="py-3 px-2">Impervious %</th>
              <th className="py-3 px-2">Grid Status</th>
              <th className="py-3 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {CITY_METRICS.map((row) => {
              const isSelected = selectedCity === row.city;
              return (
                <tr
                  key={row.city}
                  onClick={() => onSelectCity(row.city)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-orange-50/80 dark:bg-orange-500/10"
                      : "hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <td className="py-3.5 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-orange-500" : "text-gray-400"}`} />
                    <span>{row.city}</span>
                    {isSelected && (
                      <span className="px-1.5 py-0.2 rounded bg-orange-500 text-white text-[9px] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-zinc-200">
                    {row.ambient}°F
                  </td>
                  <td className="py-3.5 px-2 font-bold text-orange-500">
                    {row.surface}°F
                  </td>
                  <td className="py-3.5 px-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-500 border border-orange-500/30">
                      +{row.delta}°F
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-amber-500 font-medium">
                    {row.ghi} W/m²
                  </td>
                  <td className="py-3.5 px-2 text-cyan-500 font-medium">
                    {row.humidity}%
                  </td>
                  <td className="py-3.5 px-2 font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        row.wbgt >= 85.0
                          ? "bg-red-500/20 text-red-500 border border-red-500/30 font-bold"
                          : "text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      {row.wbgt}°F
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-slate-600 dark:text-zinc-400">
                    {row.buildingPct}%
                  </td>
                  <td className="py-3.5 px-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        row.statusType === "critical"
                          ? "bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                          : row.statusType === "precool"
                          ? "bg-cyan-500/20 text-cyan-500 border border-cyan-500/30"
                          : row.statusType === "elevated"
                          ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCity(row.city);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 text-slate-700 dark:text-zinc-300 font-bold text-[10px] transition-all inline-flex items-center gap-1"
                    >
                      <span>SELECT</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
