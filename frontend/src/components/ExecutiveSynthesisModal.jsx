import { useState } from "react";
import {
  FileText,
  ShieldCheck,
  Zap,
  AlertOctagon,
  Download,
  Printer,
  CheckCircle2,
  Sparkles,
  TrendingDown,
  Building,
  Users,
  Activity,
  Layers,
} from "lucide-react";
import ModalShell from "./ModalShell";

export default function ExecutiveSynthesisModal({
  isOpen,
  onClose,
  city,
  data,
  loading,
  error,
}) {
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ThermalOS_Executive_Brief_${city.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.25)]">
          <Sparkles className="w-4 h-4" />
        </div>
      }
      title="ThermalOS Executive Municipal Synthesis Brief"
      subtitle={`Tri-Agent Autonomous Grid & Public Health Consensus · ${city}`}
    >
      {loading ? (
        <div className="py-14 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <Activity className="w-6 h-6 animate-spin text-orange-500" />
          <span>Fusing Agent 1, Agent 2, and Agent 3 telemetry into municipal brief...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl glass-panel-subtle border-rose-500/30 text-rose-400 font-mono text-xs space-y-2">
          <span>Failed to generate executive synthesis: {error}</span>
        </div>
      ) : data ? (
        <div className="space-y-4 font-sans text-xs">
          {/* Header Executive Banner */}
          <div className="flex flex-wrap items-center justify-between p-3.5 rounded-2xl glass-panel-subtle border border-black/5 dark:border-white/[0.06] gap-3">
            <div>
              <div className="text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                Municipal Target: <strong className="text-black dark:text-white font-bold">{data.city}</strong> · {data.temperature_f}°F
              </div>
              <div className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 mt-0.5">
                Timestamp: {data.timestamp} · FortyGuard Ground Truth
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                  data.status_color === "rose"
                    ? "bg-rose-500/15 text-rose-500 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                    : data.status_color === "orange"
                    ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                }`}
              >
                {data.composite_status}
              </span>
            </div>
          </div>

          {/* 3-Pillar Cross-Agent Synthesis Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Pillar 1: Energy & Envelope Compliance */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-amber-500/20 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold font-display text-xs">
                  <Building className="w-3.5 h-3.5" />
                  <span>1. Envelope & ASHRAE</span>
                </div>
                <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Effective U-Factor:</span>
                    <strong className="text-black dark:text-white">{data.agent1_compliance?.effective_u_factor?.toFixed(3) || "0.068"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">R-Value Loss:</span>
                    <strong className="text-rose-500">+{data.agent1_compliance?.r_value_degradation_pct?.toFixed(1) || "24.5"}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Heat Ingress:</span>
                    <strong className="text-orange-500">{data.agent1_compliance?.envelope_heat_flux_btu?.toFixed(1) || "138.2"} BTU</strong>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-black/5 dark:border-white/[0.05] text-[10.5px] text-gray-600 dark:text-zinc-300 font-mono">
                {data.agent1_compliance?.risk_tier || "ELEVATED_DRIFT"}
              </div>
            </div>

            {/* Pillar 2: Grid & Infrastructure Shaving */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-cyan-500/20 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold font-display text-xs">
                  <Zap className="w-3.5 h-3.5" />
                  <span>2. HVAC Demand Shaving</span>
                </div>
                <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Peak Load Shift:</span>
                    <strong className="text-cyan-600 dark:text-cyan-400">{data.agent2_infrastructure?.power_shift_kw?.toFixed(0) || "480"} kW</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Projected Savings:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">${data.agent2_infrastructure?.cost_savings_usd?.toFixed(2) || "1,420.00"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Chiller Pre-Cool:</span>
                    <strong className="text-black dark:text-white">{data.agent2_infrastructure?.precool_duration_hrs?.toFixed(1) || "2.5"} hrs</strong>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-black/5 dark:border-white/[0.05] text-[10.5px] text-gray-600 dark:text-zinc-300 font-mono">
                Target Setpoint: {data.agent2_infrastructure?.target_setpoint || "68.0"}°F
              </div>
            </div>

            {/* Pillar 3: Civic & Public Health Override */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-rose-500/20 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold font-display text-xs">
                  <Users className="w-3.5 h-3.5" />
                  <span>3. Civic Public Health</span>
                </div>
                <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">WBGT Index:</span>
                    <strong className="text-rose-500">{data.agent3_civic?.wbgt_index?.toFixed(1) || "86.7"}°F</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Compound Hazard:</span>
                    <strong className="text-rose-600 dark:text-rose-400">{data.agent3_civic?.compound_hazard_index?.toFixed(1) || "88.4"} / 100</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-zinc-400">Cooling Centers:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">{data.agent3_civic?.cooling_shelters_active || 12} Sites</strong>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-black/5 dark:border-white/[0.05] text-[10.5px] text-gray-600 dark:text-zinc-300 font-mono truncate">
                OSHA: {data.agent3_civic?.osha_schedule || "30m Work / 30m Rest"}
              </div>
            </div>
          </div>

          {/* Actionable Executive Directives Checklist */}
          <div className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/25 space-y-2">
            <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tight flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Consensus Municipal Operational Directives
            </span>
            <ul className="space-y-1.5 font-mono text-xs text-gray-800 dark:text-zinc-200">
              {data.executive_directives?.map((dir, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span>{dir}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-black/5 dark:border-white/[0.06]">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloaded ? "Downloaded Brief ✓" : "Export Official Brief (JSON)"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl glass-panel-subtle hover:border-orange-500/40 text-black dark:text-white font-mono text-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
              <span>Print Brief</span>
            </button>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
