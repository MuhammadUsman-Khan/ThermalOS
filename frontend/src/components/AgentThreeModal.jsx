import { AlertOctagon, AlertTriangle, RefreshCw } from "lucide-react";
import ModalShell from "./ModalShell";

// Agent 3: Civic & Public Health Heat Stress Override (WBGT fusion).
export default function AgentThreeModal({ onClose, city, loading, error, data }) {
  return (
    <ModalShell
      onClose={onClose}
      icon={
        <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shadow-sm">
          <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
        </div>
      }
      title="Agent 3: Civic & Public Health Heat Stress Override"
      subtitle={`FortyGuard WBGT Thermodynamic Index & Public Health Protocol • ${city}`}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
          <span>Fusing FortyGuard humidity & solar flux with Liljegren WBGT models...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Civic Dispatch Error</span>
          </div>
          <p>{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 flex items-center justify-between">
              <span className="text-gray-600 dark:text-zinc-400">Target Region:</span>
              <strong className="text-slate-900 dark:text-white">{data.city}</strong>
            </div>
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
              <span className="text-rose-700 dark:text-rose-300 font-bold">WBGT Index:</span>
              <strong className="text-rose-600 dark:text-rose-400 text-sm font-bold">
                {data.wbgt_index}
              </strong>
            </div>
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
              <span className="text-rose-700 dark:text-rose-300 font-bold">Heat Stress Risk:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]">
                {data.heat_stress_risk}
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center justify-between">
              <span className="text-red-700 dark:text-red-300 font-bold">Civic Alert:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  data.civic_alert_dispatched
                    ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                    : "bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30"
                }`}
              >
                {data.civic_alert_dispatched ? "DISPATCHED" : "PENDING"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Emergency Civic & Field Dispatch Protocol
              </span>
            </div>
            <pre className="font-mono text-xs leading-relaxed p-3.5 rounded-xl border border-rose-500/20 bg-white/70 dark:bg-black/60 text-slate-800 dark:text-zinc-200 overflow-y-auto max-h-[120px] whitespace-pre-wrap">
              {data.emergency_protocol}
            </pre>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
