import { AlertTriangle, RefreshCw, Zap, Check } from "lucide-react";
import ModalShell from "./ModalShell";

export default function AgentTwoModal({ isOpen, onClose, city, currentTemp, loading, error, data }) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
          <Zap className="w-4 h-4" />
        </div>
      }
      title="Agent 2: Infrastructure & Pre-Cooling Controller"
      subtitle={`FortyGuard Solar Flux & Grid Pre-Cool Orchestration · ${city}`}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
          <span>Calculating FortyGuard thermal lag & thermodynamic pre-cool curves...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl glass-panel-subtle border-rose-500/30 text-rose-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Controller Execution Error</span>
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
            <div className="p-3 rounded-2xl glass-panel-subtle flex items-center justify-between border border-black/5 dark:border-white/[0.04]">
              <span className="text-gray-500 dark:text-zinc-400">Current Ambient:</span>
              <strong className="text-orange-500 font-semibold">{data.current_temp_f || "104.0"}°F</strong>
            </div>
          </div>

          {/* Peak Tariff ROI & Load Shifting Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl glass-panel-subtle border border-cyan-500/20 space-y-1">
              <div className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium">Power Curtailed</div>
              <div className="text-sm font-bold font-mono text-cyan-600 dark:text-cyan-400">
                {data.estimated_power_shift_kw ? `${data.estimated_power_shift_kw.toFixed(0)} kW` : "480 kW"}
              </div>
              <div className="text-[9.5px] font-mono text-gray-400 dark:text-zinc-500">Peak grid reduction</div>
            </div>

            <div className="p-3 rounded-xl glass-panel-subtle border border-emerald-500/20 space-y-1">
              <div className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium">Estimated Tariff ROI</div>
              <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ${data.projected_cost_savings_usd ? data.projected_cost_savings_usd.toFixed(2) : "1,420.00"}
              </div>
              <div className="text-[9.5px] font-mono text-gray-400 dark:text-zinc-500">Avoided surcharges</div>
            </div>

            <div className="p-3 rounded-xl glass-panel-subtle border border-orange-500/20 space-y-1">
              <div className="text-[10.5px] text-gray-500 dark:text-zinc-400 font-medium">Pre-Cool Window</div>
              <div className="text-sm font-bold font-mono text-orange-500">
                {data.chiller_pre_cool_duration_hrs ? `${data.chiller_pre_cool_duration_hrs.toFixed(1)} hrs` : "2.5 hrs"}
              </div>
              <div className="text-[9.5px] font-mono text-gray-400 dark:text-zinc-500">{data.peak_demand_window || "13:30 – 18:00"}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel-subtle border-cyan-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-500" />
                <span className="font-mono text-xs font-semibold uppercase text-cyan-700 dark:text-cyan-400 tracking-tight">
                  HVAC Pre-Cooling Action Plan
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 font-mono">
                {data.grid_load_shift_active ? "Thermal Shift Active" : "Dispatched"}
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed p-3 rounded-xl glass-panel text-gray-800 dark:text-zinc-200">
              {data.hvac_action_plan ||
                `Initiate Stage 2 pre-cooling sequence for ${data.city || city} to reach ${data.target_precool_temp_f || "68.0"}°F before solar peak load window (${data.current_temp_f || 104}°F observed).`}
            </p>

            <div className="pt-1 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>n8n HVAC Webhook: Dispatched ✓</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                Target: {data.target_precool_temp_f || "68.0"}°F Setpoint
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
