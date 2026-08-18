import { Layers, Building, Trees, Sprout, SunMedium, Globe } from "lucide-react";

export default function SurfaceSegmentationCard({ segmentation, city, darkMode }) {
  const data = segmentation || {
    impervious_building_pct: 42.5,
    tree_canopy_pct: 18.2,
    plant_cover_pct: 12.4,
    ground_soil_pct: 15.6,
    albedo_mean: 0.18,
  };

  const buildingPct = data.impervious_building_pct ?? 42.5;
  const treePct = data.tree_canopy_pct ?? 18.2;
  const plantPct = data.plant_cover_pct ?? 12.4;
  const soilPct = data.ground_soil_pct ?? 15.6;
  const albedo = data.albedo_mean ?? 0.18;

  return (
    <div className="bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-2xl backdrop-blur-xl hover:border-orange-500/30 transition-all overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
              Surface & Land-Cover Composition • {city}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              FortyGuard high-resolution radiometric land-cover analysis
            </p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[11px] font-mono text-gray-600 dark:text-zinc-400">
          Albedo: <strong className="text-slate-800 dark:text-white">α = {albedo.toFixed(2)}</strong>
        </div>
      </div>

      {/* Segmented multi-colored progress bar */}
      <div className="my-4">
        <div className="flex justify-between items-center text-[11px] font-mono text-gray-500 dark:text-zinc-400 mb-1.5">
          <span>Surface Distribution</span>
          <span>100% Parcel Footprint</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-0.5 gap-0.5">
          <div
            style={{ width: `${buildingPct}%` }}
            className="h-full bg-amber-500 rounded-l-full relative group transition-all duration-500"
            title={`Building Impervious: ${buildingPct}%`}
          />
          <div
            style={{ width: `${treePct}%` }}
            className="h-full bg-emerald-500 relative group transition-all duration-500"
            title={`Tree Canopy: ${treePct}%`}
          />
          <div
            style={{ width: `${plantPct}%` }}
            className="h-full bg-cyan-500 relative group transition-all duration-500"
            title={`Plant Cover: ${plantPct}%`}
          />
          <div
            style={{ width: `${soilPct}%` }}
            className="h-full bg-purple-500 rounded-r-full relative group transition-all duration-500"
            title={`Ground / Soil: ${soilPct}%`}
          />
        </div>
      </div>

      {/* 4 Metric breakdown tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Buildings */}
        <div className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <Building className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-mono font-medium text-gray-500 dark:text-zinc-400">
              Buildings
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold font-mono text-slate-800 dark:text-white">
              {buildingPct}%
            </span>
            <span className="text-[10px] font-mono text-gray-400">Impervious</span>
          </div>
        </div>

        {/* Tree Canopy */}
        <div className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <Trees className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-mono font-medium text-gray-500 dark:text-zinc-400">
              Tree Canopy
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold font-mono text-slate-800 dark:text-white">
              {treePct}%
            </span>
            <span className="text-[9px] font-mono text-emerald-500/80">Cooling Shade</span>
          </div>
        </div>

        {/* Plant Cover */}
        <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/10 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <Sprout className="w-3 h-3 text-cyan-500" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              VEGETATION
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-white">
              {plantPct}%
            </span>
            <span className="text-[9px] font-mono text-cyan-500/80">Evapo-cooling</span>
          </div>
        </div>

        {/* Soil / Ground */}
        <div className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 dark:bg-purple-500/10 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <SunMedium className="w-3 h-3 text-purple-500" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              GROUND / SOIL
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-white">
              {soilPct}%
            </span>
            <span className="text-[9px] font-mono text-purple-500/80">Earth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
