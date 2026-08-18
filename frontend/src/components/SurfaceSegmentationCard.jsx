import { Building2, Trees, Sprout, Layers, Globe } from "lucide-react";

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
    <div className="bg-white dark:bg-[#12151B] border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Surface & Land-Cover Composition · {city}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              FortyGuard high-resolution land-cover distribution and albedo radiometric analysis
            </p>
          </div>
        </div>
        <div className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-xs font-mono text-slate-600 dark:text-zinc-300">
          Mean Albedo: <strong className="text-slate-900 dark:text-zinc-100 font-semibold">α = {albedo.toFixed(2)}</strong>
        </div>
      </div>

      {/* Segmented calm progress bar */}
      <div className="my-3.5">
        <div className="flex justify-between items-center text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5">
          <span>Land-Cover Distribution</span>
          <span>100% Total AOI</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-zinc-800 gap-0.5">
          <div
            style={{ width: `${buildingPct}%` }}
            className="h-full bg-slate-500 dark:bg-zinc-500 rounded-l-full transition-all duration-300"
            title={`Building Impervious: ${buildingPct}%`}
          />
          <div
            style={{ width: `${treePct}%` }}
            className="h-full bg-emerald-600/80 dark:bg-emerald-500/70 transition-all duration-300"
            title={`Tree Canopy: ${treePct}%`}
          />
          <div
            style={{ width: `${plantPct}%` }}
            className="h-full bg-teal-600/70 dark:bg-teal-500/60 transition-all duration-300"
            title={`Plant Cover: ${plantPct}%`}
          />
          <div
            style={{ width: `${soilPct}%` }}
            className="h-full bg-amber-600/70 dark:bg-amber-500/60 rounded-r-full transition-all duration-300"
            title={`Ground / Soil: ${soilPct}%`}
          />
        </div>
      </div>

      {/* 4 Metric breakdown tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Buildings */}
        <div className="p-2.5 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">
              Buildings
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold font-mono text-slate-900 dark:text-zinc-100">
              {buildingPct}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">Impervious</span>
          </div>
        </div>

        {/* Tree Canopy */}
        <div className="p-2.5 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <Trees className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">
              Tree Canopy
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold font-mono text-slate-900 dark:text-zinc-100">
              {treePct}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">Shade</span>
          </div>
        </div>

        {/* Plant Cover */}
        <div className="p-2.5 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <Sprout className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">
              Plant Cover
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold font-mono text-slate-900 dark:text-zinc-100">
              {plantPct}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">Permeable</span>
          </div>
        </div>

        {/* Ground Soil */}
        <div className="p-2.5 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-900/30 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">
              Bare Soil / Ground
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold font-mono text-slate-900 dark:text-zinc-100">
              {soilPct}%
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">Substrate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
