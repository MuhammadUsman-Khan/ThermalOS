import { Building2, Trees, Sprout, Layers, Globe, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { MONITORED_CITIES } from "../data/cities";

export default function SurfaceSegmentationCard({ segmentation, city }) {
  const cityObj = MONITORED_CITIES.find(
    (c) => c.name === city || c.shortName === city || c.id === city
  ) || MONITORED_CITIES[0];

  const fallbackData = cityObj?.composition || {
    impervious_building_pct: 42.5,
    tree_canopy_pct: 18.2,
    plant_cover_pct: 12.4,
    ground_soil_pct: 15.6,
    albedo_mean: 0.18,
  };

  const data = segmentation || fallbackData;

  const buildingPct = data.impervious_building_pct ?? fallbackData.impervious_building_pct;
  const treePct = data.tree_canopy_pct ?? fallbackData.tree_canopy_pct;
  const plantPct = data.plant_cover_pct ?? fallbackData.plant_cover_pct;
  const soilPct = data.ground_soil_pct ?? fallbackData.ground_soil_pct;
  const albedo = data.albedo_mean ?? fallbackData.albedo_mean;
  const albedoLabel = typeof albedo === "number" ? albedo.toFixed(2) : "0.18";

  return (
    <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between transition-all hover:border-orange-500/30 relative overflow-hidden group">
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-orange-500/50 group-hover:to-transparent transition-all duration-300" />

      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold tracking-tight text-black dark:text-white">
              Surface & Land-Cover Composition · {city}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              FortyGuard high-resolution radiometric land-cover segmentation and reflective albedo
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl glass-panel-subtle border border-orange-500/25 text-xs font-mono text-orange-500 shadow-xs">
          Mean Albedo: <strong className="text-black dark:text-white font-bold ml-1">α = {albedoLabel}</strong>
        </div>
      </div>

      {/* Segmented Rich Visual Progress Bar */}
      <div className="my-4">
        <div className="flex justify-between items-center text-xs font-mono text-gray-500 dark:text-zinc-400 mb-2">
          <span className="font-semibold text-gray-700 dark:text-zinc-300">Surface Class Allocation</span>
          <span>100% Total Area-of-Interest</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-zinc-900 gap-1 p-0.5 border border-gray-200 dark:border-zinc-800">
          <div
            style={{ width: `${buildingPct}%` }}
            className="h-full bg-slate-500 rounded-l-full transition-all duration-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]"
            title={`Building Impervious: ${buildingPct}%`}
          />
          <div
            style={{ width: `${treePct}%` }}
            className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            title={`Tree Canopy: ${treePct}%`}
          />
          <div
            style={{ width: `${plantPct}%` }}
            className="h-full bg-cyan-500 transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
            title={`Plant Cover: ${plantPct}%`}
          />
          <div
            style={{ width: `${soilPct}%` }}
            className="h-full bg-amber-500 rounded-r-full transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            title={`Ground / Soil: ${soilPct}%`}
          />
        </div>
      </div>

      {/* 4 Metric Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Buildings */}
        <div className="p-3.5 rounded-2xl glass-panel-subtle flex flex-col justify-between hover:border-slate-400/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-mono font-medium text-gray-600 dark:text-zinc-400">
              Buildings & Roofs
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-black dark:text-white">
              {buildingPct}%
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">Impervious</span>
          </div>
        </div>

        {/* Tree Canopy */}
        <div className="p-3.5 rounded-2xl glass-panel-subtle flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Trees className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-zinc-400">
              Tree Canopy
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-black dark:text-white">
              {treePct}%
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold">Cooling Shade</span>
          </div>
        </div>

        {/* Plant Cover */}
        <div className="p-3.5 rounded-2xl glass-panel-subtle flex flex-col justify-between hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sprout className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-zinc-400">
              Plant Cover
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-black dark:text-white">
              {plantPct}%
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 font-semibold">Vegetation</span>
          </div>
        </div>

        {/* Ground Soil */}
        <div className="p-3.5 rounded-2xl glass-panel-subtle flex flex-col justify-between hover:border-amber-500/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
            <span className="text-[11px] font-mono font-medium text-gray-700 dark:text-zinc-400">
              Ground / Soil
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-black dark:text-white">
              {soilPct}%
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold">Porous Soil</span>
          </div>
        </div>
      </div>
    </div>
  );
}
