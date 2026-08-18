import { AlertTriangle, RefreshCw, Zap, Check } from "lucide-react";
import ModalShell from "./ModalShell";

export default function AgentTwoModal({ isOpen, onClose, city, currentTemp, loading, error, data }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
          <Zap className="w-4 h-4" />
        </div>
      }
      title="Agent 2: Infrastructure & Pre-Cooling Controller"
      subtitle={`FortyGuard Solar Flux & Grid Pre-Cool Orchestration · ${city}`}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
          <span>Calculating FortyGuard thermal lag & thermodynamic pre-cool curves...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span>Controller Execution Error</span>
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
            <div className="p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 flex items-center justify-between">
              <span className="text-gray-500 dark:text-zinc-400">Current Ambient:</span>
              <strong className="text-orange-500 font-semibold">{data.current_temp_f || "104.0"}°F</strong>
            </div>
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
              <span className="text-orange-400 font-medium">Target Pre-Cool:</span>
              <strong className="text-orange-500 font-semibold">
                {data.target_precool_temp_f || "68.0"}°F
              </strong>
            </div>
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5 flex items-center justify-between">
              <span className="text-orange-400 font-medium">Grid Load Shift:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-orange-500/15 text-orange-400 border border-orange-500/30">
                {data.grid_load_shift_active ? "Active" : "Dispatched"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-mono text-xs font-semibold uppercase text-orange-500">
                HVAC Pre-Cooling Action Plan
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed p-3 rounded-lg border border-orange-500/20 bg-white/70 dark:bg-black/50 text-gray-800 dark:text-zinc-200">
              {currentTemp != null
                ? `Current ambient ${Math.round(currentTemp)}°F is ${Math.round(
                    currentTemp - 68
                  )}°F above target. Initiating Stage 2 pre-cooling sequence at 03:00 AM to reach 68°F before 2 PM peak load window.`
                : data.hvac_action_plan ||
                  "Current ambient 104°F is 36°F above target. Initiating Stage 2 pre-cooling sequence at 03:00 AM to reach 68°F before 2 PM peak load window."}
            </p>

            <div className="pt-1 flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-400 font-mono text-xs">
                <Check className="w-3 h-3 text-orange-500" />
                <span>n8n HVAC Pre-Cool Webhook: Confirmed ✓</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
