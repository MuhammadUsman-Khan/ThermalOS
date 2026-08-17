import { AlertTriangle, RefreshCw, Zap } from "lucide-react";
import ModalShell from "./ModalShell";

// Agent 2: Infrastructure & Pre-Cooling Controller (grid peak-shaving).
export default function AgentTwoModal({ onClose, city, currentTemp, loading, error, data }) {
  return (
    <ModalShell
      onClose={onClose}
      icon={
        <div className="h-9 w-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center shadow-sm">
          <Zap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
      }
      title="Agent 2: Infrastructure & Pre-Cooling Controller"
      subtitle={`FortyGuard Solar Flux & Grid Pre-Cool Orchestration • ${city}`}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
          <span>Calculating FortyGuard thermal lag & thermodynamic pre-cool curves...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Controller Execution Error</span>
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
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 flex items-center justify-between">
              <span className="text-gray-600 dark:text-zinc-400">Current Ambient:</span>
              <strong className="text-orange-500">{data.current_temp_f}°F</strong>
            </div>
            <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 flex items-center justify-between">
              <span className="text-cyan-700 dark:text-cyan-300 font-bold">Target Precool:</span>
              <strong className="text-cyan-600 dark:text-cyan-400 text-sm font-bold">
                {data.target_precool_temp_f}°F
              </strong>
            </div>
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
              <span className="text-emerald-700 dark:text-emerald-300 font-bold">Grid Load Shift:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  data.grid_load_shift_active
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30"
                }`}
              >
                {data.grid_load_shift_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                HVAC Pre-Cooling Action Plan
              </span>
            </div>
            <pre className="font-mono text-xs leading-relaxed p-3.5 rounded-xl border border-cyan-500/20 bg-white/70 dark:bg-black/60 text-slate-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap">
              {currentTemp != null
                ? `Current ambient ${Math.round(currentTemp)}°F is ${Math.round(
                    currentTemp - 68
                  )}°F above target. Initiating Stage 2 pre-cooling sequence at 03:00 AM to reach 68°F before 2 PM peak load window.`
                : data.hvac_action_plan ||
                  "Current ambient 96°F is 28°F above target. Initiating Stage 2 pre-cooling sequence at 03:00 AM to reach 68°F before 2 PM peak load window."}
            </pre>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
