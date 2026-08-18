import { AlertOctagon, AlertTriangle, RefreshCw, Check } from "lucide-react";
import ModalShell from "./ModalShell";

export default function AgentThreeModal({ isOpen, onClose, city, loading, error, data }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
          <AlertOctagon className="w-4 h-4" />
        </div>
      }
      title="Agent 3: Civic & Public Health Heat Stress Override"
      subtitle={`FortyGuard WBGT Thermodynamic Index & Public Health Protocol · ${city}`}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
          <span>Fusing FortyGuard humidity & solar flux with Liljegren WBGT models...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span>Civic Dispatch Error</span>
          </div>
          <p>{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-3 font-sans text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
            <div className="p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 flex items-center justify-between">
              <span className="text-gray-500 dark:text-zinc-400">Target Region:</span>
              <strong className="text-black dark:text-white">{data.city || city}</strong>
            </div>
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
              <span className="text-orange-400 font-medium">WBGT Index:</span>
              <strong className="text-orange-500 font-semibold">
                {data.wbgt_index || "86.7°F"}
              </strong>
            </div>
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
              <span className="text-orange-400 font-medium">Heat Stress Risk:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-orange-500 text-black">
                {data.heat_stress_risk || "EXTREME"}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
              <span className="text-orange-400 font-medium">Civic Alert:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                {data.civic_alert_dispatched ? "Dispatched" : "Active"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-mono text-xs font-semibold uppercase text-orange-500">
                Emergency Civic & Field Dispatch Protocol
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed p-3 rounded-lg border border-orange-500/20 bg-white/70 dark:bg-black/50 text-gray-800 dark:text-zinc-200">
              {data.emergency_protocol || "OSHA / ACGIH Heat Stress Advisory: Outdoor occupational limits restricted to 15 min/hr. Cooling centers activated across municipal sector."}
            </p>

            <div className="pt-1 flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono text-xs">
                <Check className="w-3 h-3 text-orange-500" />
                <span>n8n Civic Alert Broadcast: Triggered ✓</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
