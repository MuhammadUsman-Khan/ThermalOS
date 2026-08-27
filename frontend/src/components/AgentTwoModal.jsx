import {
  AlertTriangle,
  RefreshCw,
  Zap,
  Check,
  TrendingDown,
  Clock,
  DollarSign,
  Sun,
  ShieldCheck,
  Cpu,
  Layers,
} from "lucide-react";
import ModalShell from "./ModalShell";

export default function AgentTwoModal({
  isOpen,
  onClose,
  city,
  currentTemp,
  loading,
  error,
  data,
}) {
  const powerShift = data?.estimated_power_shift_kw || 480.0;
  const costSavings = data?.projected_cost_savings_usd || 1420.0;
  const durationHrs = data?.chiller_pre_cool_duration_hrs || 2.5;
  const targetSetpoint = data?.target_precool_temp_f || 68.0;
  const solarGhi = data?.solar_ghi || 580.0;
  const peakWindow = data?.peak_demand_window || "13:30 – 18:00 Local (Solar Zenith)";
  const ambientTemp = data?.current_temp_f || currentTemp || 104.0;
  const isActive = data?.grid_load_shift_active !== false;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
          <Zap className="w-4 h-4" />
        </div>
      }
      title="Agent 2: Infrastructure & HVAC Pre-Cool Controller"
      subtitle={`FortyGuard Thermal Inertia & Peak Tariff Shaving · ${city}`}
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-4 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-2 border-cyan-500/25 animate-ping absolute" />
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.35)]">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center max-w-sm">
            <span className="font-bold text-black dark:text-white text-sm font-display">
              Simulating Thermal Inertia Lag
            </span>
            <span className="text-gray-500 dark:text-zinc-400 text-xs">
              Computing building thermal storage & peak tariff ROI optimization...
            </span>
          </div>
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
          {/* Executive AOI & Telemetry Header Banner */}
          <div className="flex flex-wrap items-center justify-between p-3.5 rounded-2xl glass-panel-subtle font-mono gap-2 border border-black/5 dark:border-white/[0.06]">
            <div>
              <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                Target Facility: <strong className="text-black dark:text-white font-bold">{data.city || city}</strong>
              </div>
              <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                Current Ambient: <span className="text-orange-500 font-semibold">{ambientTemp}°F</span> · Solar GHI: <span className="text-amber-400 font-semibold">{solarGhi.toFixed(0)} W/m²</span> · Pre-Cool Setpoint: <span className="text-cyan-400 font-semibold">{targetSetpoint}°F</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono border bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30 uppercase tracking-tight shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                {isActive ? "Peak Load Shift Active" : "Thermal Standby"}
              </span>
            </div>
          </div>

          {/* 3-Tile KPI & Tariff ROI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Card 1: Power Shift */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-cyan-500/20 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                  <span>Peak Load Curtailed</span>
                  <Zap className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <div className="text-base font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                  {powerShift.toFixed(0)} kW
                  <span className="text-[9.5px] font-normal text-gray-400 dark:text-zinc-500 ml-1">Shaved</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-gray-600 dark:text-zinc-300 pt-1 border-t border-black/5 dark:border-white/[0.04] flex items-center justify-between">
                <span>Chiller Demand</span>
                <span className="font-semibold text-emerald-500">-38% Peak Draw</span>
              </div>
            </div>

            {/* Card 2: Financial ROI */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-emerald-500/20 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                  <span>Projected Tariff ROI</span>
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  ${costSavings.toFixed(2)}
                  <span className="text-[9.5px] font-normal text-gray-400 dark:text-zinc-500 ml-1">/ cycle</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 pt-1 border-t border-black/5 dark:border-white/[0.04] flex items-center justify-between">
                <span>TOU Differential</span>
                <span className="font-semibold">$0.38 vs $0.06/kWh</span>
              </div>
            </div>

            {/* Card 3: Lead Time & Window */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-orange-500/20 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                  <span>Pre-Cool Lead Time</span>
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <div className="text-base font-bold font-mono text-orange-500 mt-1">
                  {durationHrs.toFixed(1)} hrs
                  <span className="text-[9.5px] font-normal text-gray-400 dark:text-zinc-500 ml-1">Charging</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-gray-600 dark:text-zinc-400 pt-1 border-t border-black/5 dark:border-white/[0.04] flex items-center justify-between">
                <span>Peak Zenith</span>
                <span className="text-amber-500 font-semibold truncate ml-1">{peakWindow.split(" ")[0]}</span>
              </div>
            </div>
          </div>

          {/* 3-Phase Thermal Mass Charging & Curtailment Ramp Schedule */}
          <div className="p-3.5 rounded-2xl glass-panel-subtle border border-black/5 dark:border-white/[0.05] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-black dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                3-Phase Thermal Storage & Load Shifting Ramp
              </span>
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                Building Mass Thermal Flywheel
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10.5px]">
              {/* Phase 1 */}
              <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1">
                <div className="font-bold text-cyan-600 dark:text-cyan-400 flex items-center justify-between">
                  <span>Phase 1: Charge</span>
                  <span className="text-[9.5px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-400">08:00–12:00</span>
                </div>
                <p className="text-gray-600 dark:text-zinc-300 text-[10px] leading-tight">
                  Sub-cool building thermal mass to {targetSetpoint}°F at off-peak rate ($0.06/kWh).
                </p>
              </div>

              {/* Phase 2 */}
              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span>Phase 2: Shave</span>
                  <span className="text-[9.5px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-400">13:00–17:30</span>
                </div>
                <p className="text-gray-600 dark:text-zinc-300 text-[10px] leading-tight">
                  Throttle chillers by {powerShift.toFixed(0)} kW during solar peak, dodging $0.38/kWh tariff.
                </p>
              </div>

              {/* Phase 3 */}
              <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                  <span>Phase 3: Float</span>
                  <span className="text-[9.5px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400">17:30–21:00</span>
                </div>
                <p className="text-gray-600 dark:text-zinc-300 text-[10px] leading-tight">
                  Building thermal mass gradually floats back to 74°F within ASHRAE comfort limits.
                </p>
              </div>
            </div>
          </div>

          {/* Actionable HVAC Action Plan */}
          <div className="p-3.5 rounded-2xl glass-panel-subtle border-cyan-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-mono text-xs font-bold uppercase text-cyan-700 dark:text-cyan-400 tracking-tight">
                  Mechanical BAS / VRF Sequencing Directive
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 font-mono">
                Stage-2 Modulation
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed p-3 rounded-xl glass-panel text-gray-800 dark:text-zinc-200">
              {data.hvac_action_plan ||
                `Initiate Stage 2 pre-cooling sequence for ${data.city || city} to reach ${targetSetpoint}°F before solar peak load window (${ambientTemp}°F observed, shifting ${powerShift} kW).`}
            </p>

            <div className="pt-1 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>n8n HVAC Webhook: Dispatched ✓</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                Trigger: FortyGuard Solar Flux &gt;500 W/m²
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
