import { useState, useEffect } from "react";
import {
  Globe,
  MapPin,
  ChevronRight,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_URL ||
  "https://thermal-os-api.vercel.app";

const FALLBACK_METRICS = [
  { city: "Phoenix, AZ", ambient: 104.0, surface: 117.3, delta: 13.3, ghi: 604.5, humidity: 13.0, wetBulb: 74.7, wbgt: 86.7, buildingPct: 62, status: "Critical Heat Alert", statusType: "critical" },
  { city: "Las Vegas, NV", ambient: 101.0, surface: 114.2, delta: 13.2, ghi: 588.0, humidity: 15.5, wetBulb: 73.1, wbgt: 84.8, buildingPct: 58, status: "High Heat Risk", statusType: "critical" },
  { city: "Tucson, AZ", ambient: 99.0, surface: 111.5, delta: 12.5, ghi: 570.0, humidity: 18.0, wetBulb: 72.0, wbgt: 83.1, buildingPct: 54, status: "High Heat Risk", statusType: "critical" },
  { city: "Houston, TX", ambient: 93.0, surface: 102.5, delta: 9.5, ghi: 495.0, humidity: 62.0, wetBulb: 82.1, wbgt: 88.2, buildingPct: 65, status: "Critical Heat Alert", statusType: "critical" },
  { city: "Dallas, TX", ambient: 96.0, surface: 107.1, delta: 11.1, ghi: 535.0, humidity: 48.0, wetBulb: 78.4, wbgt: 85.6, buildingPct: 63, status: "High Heat Risk", statusType: "critical" },
  { city: "Austin, TX", ambient: 97.0, surface: 108.4, delta: 11.4, ghi: 540.0, humidity: 45.0, wetBulb: 77.8, wbgt: 85.1, buildingPct: 59, status: "High Heat Risk", statusType: "critical" },
  { city: "San Antonio, TX", ambient: 95.0, surface: 106.8, delta: 11.8, ghi: 530.0, humidity: 47.0, wetBulb: 77.2, wbgt: 84.7, buildingPct: 56, status: "High Heat Risk", statusType: "critical" },
  { city: "New Orleans, LA", ambient: 89.0, surface: 98.2, delta: 9.2, ghi: 480.0, humidity: 72.0, wetBulb: 81.5, wbgt: 87.5, buildingPct: 61, status: "Critical Heat Alert", statusType: "critical" },
  { city: "San Jose, CA", ambient: 82.0, surface: 91.4, delta: 9.4, ghi: 510.0, humidity: 38.0, wetBulb: 63.2, wbgt: 74.2, buildingPct: 52, status: "Pre-Cool Window", statusType: "precool" },
  { city: "Los Angeles, CA", ambient: 88.0, surface: 99.6, delta: 11.6, ghi: 545.0, humidity: 42.0, wetBulb: 69.1, wbgt: 79.1, buildingPct: 64, status: "Pre-Cool Window", statusType: "precool" },
  { city: "San Francisco, CA", ambient: 68.0, surface: 74.5, delta: 6.5, ghi: 460.0, humidity: 65.0, wetBulb: 58.4, wbgt: 63.8, buildingPct: 68, status: "Nominal", statusType: "nominal" },
  { city: "Seattle, WA", ambient: 74.0, surface: 82.1, delta: 8.1, ghi: 430.0, humidity: 52.0, wetBulb: 61.2, wbgt: 68.5, buildingPct: 57, status: "Nominal", statusType: "nominal" },
  { city: "Denver, CO", ambient: 84.0, surface: 95.2, delta: 11.2, ghi: 560.0, humidity: 22.0, wetBulb: 59.8, wbgt: 72.4, buildingPct: 50, status: "Nominal", statusType: "nominal" },
  { city: "Salt Lake City, UT", ambient: 91.0, surface: 103.5, delta: 12.5, ghi: 575.0, humidity: 19.0, wetBulb: 62.4, wbgt: 76.8, buildingPct: 48, status: "Elevated Heat", statusType: "elevated" },
  { city: "Chicago, IL", ambient: 82.0, surface: 90.8, delta: 8.8, ghi: 470.0, humidity: 55.0, wetBulb: 68.3, wbgt: 75.3, buildingPct: 66, status: "Pre-Cool Window", statusType: "precool" },
  { city: "Minneapolis, MN", ambient: 79.0, surface: 87.4, delta: 8.4, ghi: 450.0, humidity: 58.0, wetBulb: 66.5, wbgt: 73.1, buildingPct: 51, status: "Nominal", statusType: "nominal" },
  { city: "St. Louis, MO", ambient: 88.0, surface: 98.6, delta: 10.6, ghi: 490.0, humidity: 52.0, wetBulb: 72.4, wbgt: 80.2, buildingPct: 55, status: "Elevated Heat", statusType: "elevated" },
  { city: "New York, NY", ambient: 85.0, surface: 96.2, delta: 11.2, ghi: 480.0, humidity: 58.0, wetBulb: 72.1, wbgt: 78.6, buildingPct: 78, status: "Pre-Cool Window", statusType: "precool" },
  { city: "Boston, MA", ambient: 81.0, surface: 89.5, delta: 8.5, ghi: 460.0, humidity: 60.0, wetBulb: 69.4, wbgt: 75.0, buildingPct: 71, status: "Nominal", statusType: "nominal" },
  { city: "Philadelphia, PA", ambient: 86.0, surface: 97.8, delta: 11.8, ghi: 485.0, humidity: 56.0, wetBulb: 72.8, wbgt: 79.4, buildingPct: 69, status: "Pre-Cool Window", statusType: "precool" },
  { city: "Washington, DC", ambient: 88.0, surface: 100.2, delta: 12.2, ghi: 500.0, humidity: 54.0, wetBulb: 73.6, wbgt: 81.5, buildingPct: 67, status: "High Heat Risk", statusType: "critical" },
  { city: "Miami, FL", ambient: 91.0, surface: 103.2, delta: 12.2, ghi: 520.0, humidity: 68.0, wetBulb: 81.9, wbgt: 89.4, buildingPct: 62, status: "Critical Heat Alert", statusType: "critical" },
  { city: "Orlando, FL", ambient: 92.0, surface: 104.5, delta: 12.5, ghi: 530.0, humidity: 64.0, wetBulb: 81.2, wbgt: 88.6, buildingPct: 58, status: "Critical Heat Alert", statusType: "critical" },
  { city: "Atlanta, GA", ambient: 89.0, surface: 101.4, delta: 12.4, ghi: 510.0, humidity: 56.0, wetBulb: 75.2, wbgt: 82.8, buildingPct: 57, status: "High Heat Risk", statusType: "critical" },
];

export default function NationalThermalGridMatrix({ selectedCity, onSelectCity }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [metrics, setMetrics] = useState(FALLBACK_METRICS);
  const [loading, setLoading] = useState(false);

  // Real FortyGuard-derived telemetry for every monitored city (cache-only batch).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/fortyguard/grid`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.cities) && data.cities.length > 0) {
            setMetrics(data.cities);
          }
        }
      } catch (e) {
        // Keeps FALLBACK_METRICS safely on network error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredMetrics = metrics.filter((row) => {
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
            {["all", "critical", "elevated", "precool", "nominal"].map((st) => {
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
                  <td className="py-3 px-2 tabular-nums text-gray-600 dark:text-zinc-400">{row.buildingPct != null ? `${row.buildingPct}%` : "—"}</td>
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
