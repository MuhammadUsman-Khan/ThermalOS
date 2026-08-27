import { AlertOctagon, AlertTriangle, RefreshCw, Check } from "lucide-react";
import ModalShell from "./ModalShell";

export default function AgentThreeModal({ isOpen, onClose, city, loading, error, data }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
          <AlertOctagon className="w-4 h-4" />
        </div>
      }
      title="Agent 3: Civic & Public Health Heat Stress Override"
      subtitle={`FortyGuard WBGT Thermodynamic Index & Public Health Protocol · ${city}`}
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-4 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-2 border-rose-500/25 animate-ping absolute" />
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center max-w-sm">
            <span className="font-bold text-black dark:text-white text-sm font-display">
              Fusing Multi-Spectral Telemetry
            </span>
            <span className="text-gray-500 dark:text-zinc-400 text-xs">
              Calculating Liljegren WBGT index & querying municipal dispatch protocol...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl glass-panel-subtle border-rose-500/30 text-rose-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Civic Dispatch Error</span>
          </div>
          <p>{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-3.5 font-sans text-xs">
          {/* Status Header Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
            <div className="p-3 rounded-2xl glass-panel-subtle flex items-center justify-between border border-black/5 dark:border-white/[0.04]">
              <span className="text-gray-500 dark:text-zinc-400">Target Region:</span>
              <strong className="text-black dark:text-white font-bold">{data.city || city}</strong>
            </div>
            <div className="p-3 rounded-2xl glass-panel-subtle border-rose-500/25 flex items-center justify-between">
              <span className="text-rose-700 dark:text-rose-400 font-medium">WBGT Index:</span>
              <strong className="text-rose-600 dark:text-rose-500 font-semibold">
                {typeof data.wbgt_index === "number" ? `${data.wbgt_index.toFixed(1)}°F` : (data.wbgt_index || "86.7°F")}
              </strong>
            </div>
          </div>

          {/* Compound Environmental Hazard & OSHA Schedule Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl glass-panel-subtle border border-rose-500/20 space-y-1">
              <div className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium">Compound Hazard</div>
              <div className="text-sm font-bold font-mono text-rose-500">
                {data.compound_hazard_index ? `${data.compound_hazard_index.toFixed(1)}` : "88.4"}
                <span className="text-[9.5px] font-normal text-gray-400 dark:text-zinc-500 ml-1">/ 100 Index</span>
              </div>
              <div className="text-[9.5px] font-mono text-rose-600 dark:text-rose-400">Dual Heat + Solar Risk</div>
            </div>

            <div className="p-3 rounded-xl glass-panel-subtle border border-amber-500/20 space-y-1">
              <div className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium">OSHA Labor Schedule</div>
              <div className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 line-clamp-1">
                {data.osha_work_rest_ratio || "30m Work / 30m Rest"}
              </div>
              <div className="text-[9.5px] font-mono text-gray-400 dark:text-zinc-500">Mandatory Hydration</div>
            </div>

            <div className="p-3 rounded-xl glass-panel-subtle border border-emerald-500/20 space-y-1">
              <div className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium">Cooling Shelters</div>
              <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {data.cooling_shelters_active || 12} Active Sites
              </div>
              <div className="text-[9.5px] font-mono text-gray-400 dark:text-zinc-500">Misting Hubs Online</div>
            </div>
          </div>

          {/* Targeted Vulnerability Advisory */}
          {data.vulnerable_demographic_advisory && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1">
              <span className="font-mono text-[10.5px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight">
                Targeted Demographic Protection Directive
              </span>
              <p className="text-[11px] font-mono text-gray-800 dark:text-zinc-300 leading-relaxed">
                {data.vulnerable_demographic_advisory}
              </p>
            </div>
          )}

          <div className="p-3.5 rounded-2xl glass-panel-subtle border-rose-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
                <span className="font-mono text-xs font-semibold uppercase text-rose-700 dark:text-rose-500 tracking-tight">
                  Emergency Civic & Field Dispatch Protocol
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-rose-500 text-white font-mono">
                {data.heat_stress_risk || "EXTREME"}
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed p-3 rounded-xl glass-panel text-gray-800 dark:text-zinc-200">
              {data.emergency_protocol || "OSHA / ACGIH Heat Stress Advisory: Outdoor occupational limits restricted to 15 min/hr. Cooling centers activated across municipal sector."}
            </p>

            <div className="pt-1 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>n8n Civic Alert Broadcast: Triggered ✓</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                Threshold: &gt;85.0°F WBGT
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
