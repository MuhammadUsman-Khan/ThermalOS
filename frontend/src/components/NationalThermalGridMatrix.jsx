import { useState } from "react";
import {
  Globe,
  MapPin,
  ChevronRight,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";

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
    status: "Critical Heat Alert",
    statusType: "critical",
  },
  {
    city: "Las Vegas, NV",
    ambient: 101,
    surface: 114.2,
    delta: 13.2,
    ghi: 588.0,
    humidity: 15.5,
    wetBulb: 76.8,
    wbgt: 84.8,
    buildingPct: 38.0,
    status: "Pre-Cool Active",
    statusType: "precool",
  },
  {
    city: "Tucson, AZ",
    ambient: 99,
    surface: 111.5,
    delta: 12.5,
    ghi: 570.0,
    humidity: 18.0,
    wetBulb: 74.2,
    wbgt: 83.1,
    buildingPct: 36.2,
    status: "Elevated Heat",
    statusType: "elevated",
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
    status: "High Humidity Risk",
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
    status: "Elevated WBGT",
    statusType: "elevated",
  },
  {
    city: "Austin, TX",
    ambient: 97,
    surface: 108.4,
    delta: 11.4,
    ghi: 540.0,
    humidity: 45.0,
    wetBulb: 79.0,
    wbgt: 85.1,
    buildingPct: 39.4,
    status: "Elevated WBGT",
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
    status: "Nominal Baseline",
    statusType: "nominal",
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
    status: "Pre-Cool Active",
    statusType: "precool",
  },
  {
    city: "San Francisco, CA",
    ambient: 72,
    surface: 80.1,
    delta: 8.1,
    ghi: 390.0,
    humidity: 58.0,
    wetBulb: 61.5,
    wbgt: 68.2,
    buildingPct: 54.0,
    status: "Nominal Baseline",
    statusType: "nominal",
  },
  {
    city: "Seattle, WA",
    ambient: 76,
    surface: 84.5,
    delta: 8.5,
    ghi: 410.0,
    humidity: 52.0,
    wetBulb: 63.8,
    wbgt: 70.4,
    buildingPct: 44.1,
    status: "Nominal Baseline",
    statusType: "nominal",
  },
  {
    city: "Denver, CO",
    ambient: 87,
    surface: 98.2,
    delta: 11.2,
    ghi: 520.0,
    humidity: 24.0,
    wetBulb: 66.4,
    wbgt: 76.8,
    buildingPct: 40.5,
    status: "Nominal Baseline",
    statusType: "nominal",
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
    status: "Nominal Baseline",
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
    status: "Urban Canyon Heat",
    statusType: "elevated",
  },
  {
    city: "Boston, MA",
    ambient: 82,
    surface: 92.1,
    delta: 10.1,
    ghi: 440.0,
    humidity: 50.0,
    wetBulb: 69.2,
    wbgt: 75.0,
    buildingPct: 56.4,
    status: "Nominal Baseline",
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
    status: "Extreme WBGT Hazard",
    statusType: "critical",
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
    status: "Elevated Humidity",
    statusType: "elevated",
  },
];

export default function NationalThermalGridMatrix({ selectedCity, onSelectCity }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredMetrics = CITY_METRICS.filter((row) => {
    const matchesSearch = row.city.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || row.statusType === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col space-y-4 font-sans">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-sm font-bold tracking-tight text-black dark:text-white">
                National Thermal Grid Matrix
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[11px] font-mono font-medium text-orange-400">
                Cross-City Telemetry
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Synchronized microclimate metrics across major metropolitan thermal corridors
            </p>
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter cities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="glass-panel-subtle rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/50 shadow-xs w-36 sm:w-48"
            />
          </div>

          <div className="flex items-center p-1 rounded-2xl glass-panel-subtle text-xs font-mono relative shadow-xs">
            {["all", "critical", "precool", "nominal"].map((st) => {
              const isActive = statusFilter === st;

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`relative px-3 py-1.5 rounded-xl font-medium capitalize transition-colors cursor-pointer z-10 select-none ${
                    isActive
                      ? "text-black font-bold"
                      : "text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="statusFilterPill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF6B2B] to-[#FF8533] shadow-[0_0_14px_rgba(255,107,43,0.45)] -z-10"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                        mass: 0.8,
                      }}
                    />
                  )}
                  <span>{st}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200/60 dark:border-white/[0.06]">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/75 dark:bg-white/[0.02] border-b border-gray-200/60 dark:border-white/[0.06] text-[10.5px] text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-3.5">City / Grid Zone</th>
              <th className="py-3 px-2">Ambient Air</th>
              <th className="py-3 px-2">Surface Temp</th>
              <th className="py-3 px-2">Delta ΔT</th>
              <th className="py-3 px-2">Solar GHI</th>
              <th className="py-3 px-2">Humidity</th>
              <th className="py-3 px-2">Wet-Bulb</th>
              <th className="py-3 px-2">WBGT Index</th>
              <th className="py-3 px-2">Building %</th>
              <th className="py-3 px-3">Mitigation Status</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60">
            {filteredMetrics.map((row) => {
              const isSelected = selectedCity === row.city;

              return (
                <tr
                  key={row.city}
                  onClick={() => onSelectCity && onSelectCity(row.city)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "bg-orange-500/10 dark:bg-orange-500/15 font-semibold text-black dark:text-white border-l-2 border-orange-500"
                      : "hover:bg-gray-50/80 dark:hover:bg-zinc-900/50 text-gray-700 dark:text-zinc-300"
                  }`}
                >
                  <td className="py-3 px-3.5 flex items-center gap-2">
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-orange-500" : "text-gray-400 dark:text-zinc-500"}`} />
                    <span className="font-medium">{row.city}</span>
                  </td>
                  <td className="py-3 px-2 tabular-nums text-gray-600 dark:text-zinc-400">{row.ambient}°F</td>
                  <td className="py-3 px-2 tabular-nums font-bold text-orange-500">{row.surface}°F</td>
                  <td className="py-3 px-2 tabular-nums text-gray-600 dark:text-zinc-400">+{row.delta}°F</td>
                  <td className="py-3 px-2 tabular-nums text-gray-600 dark:text-zinc-400">{row.ghi} W/m²</td>
                  <td className="py-3 px-2 tabular-nums text-gray-600 dark:text-zinc-400">{row.humidity}%</td>
                  <td className="py-3 px-2 tabular-nums text-gray-600 dark:text-zinc-400">{row.wetBulb}°F</td>
                  <td className="py-3 px-2 tabular-nums font-bold">
                    <span className={row.wbgt >= 85 ? "text-rose-500 font-semibold" : "text-emerald-500 font-medium"}>
                      {row.wbgt}°F
                    </span>
                  </td>
                  <td className="py-3 px-2 tabular-nums text-gray-600 dark:text-zinc-400">{row.buildingPct}%</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] ${
                        row.statusType === "critical"
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold"
                          : row.statusType === "precool"
                          ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 font-semibold"
                          : row.statusType === "elevated"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectCity) onSelectCity(row.city);
                      }}
                      className="px-2 py-1 rounded-md text-xs bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-500 font-medium inline-flex items-center gap-0.5 transition-all"
                    >
                      <span>Focus</span>
                      <ChevronRight className="w-3 h-3" />
                    </motion.button>
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
