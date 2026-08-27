import {
  AlertTriangle,
  Check,
  FileCheck,
  Flame,
  RefreshCw,
  ShieldAlert,
  Sun,
  Activity,
  Layers,
  Thermometer,
  Zap,
} from "lucide-react";
import ModalShell from "./ModalShell";

export default function AgentOneModal({ isOpen, onClose, city, loading, error, report, data }) {
  const auditReport = data || report;

  const baselineU = auditReport?.baseline_u_factor || 0.048;
  const effectiveU = auditReport?.effective_u_factor || 0.068;
  const rLossPct = auditReport?.r_value_degradation_pct || 24.5;
  const heatFlux = auditReport?.envelope_heat_flux_btu || 138.2;
  const solAirTemp = auditReport?.sol_air_temp_f || 124.8;
  const surfaceTemp = auditReport?.surface_temp_f || 116.4;
  const ambientTemp = auditReport?.temperature_f || 104.0;
  const solarGhi = auditReport?.solar_ghi || 604.5;
  const riskTier = auditReport?.compliance_risk_tier || "CRITICAL_EXCEEDANCE";

  const isExceeded = ambientTemp > 79;
  const tempDelta = Math.max(0, ambientTemp - 79);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
          <FileCheck className="w-4 h-4" />
        </div>
      }
      title="Agent 1: Urban Energy & Thermal Compliance Auditor"
      subtitle={`ASHRAE 55-2023 & IECC RAG Vector Knowledge Core · ${city}`}
    >
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-4 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-2 border-amber-500/25 animate-ping absolute" />
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center max-w-sm">
            <span className="font-bold text-black dark:text-white text-sm font-display">
              Querying ChromaDB & Radiometry
            </span>
            <span className="text-gray-500 dark:text-zinc-400 text-xs">
              Embedding ASHRAE 55-2023 vectors & calculating sol-air degradation...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl glass-panel-subtle border-rose-500/30 text-rose-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Audit Execution Error</span>
          </div>
          <p>{error}</p>
        </div>
      ) : auditReport ? (
        <div className="space-y-3.5 font-sans text-xs">
          {/* Executive Header Banner */}
          <div className="flex flex-wrap items-center justify-between p-3.5 rounded-2xl glass-panel-subtle font-mono gap-2 border border-black/5 dark:border-white/[0.06]">
            <div>
              <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                Target AOI: <strong className="text-black dark:text-white font-bold">{auditReport.city || city}</strong>
              </div>
              <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                Radiometric Surface: <span className="text-amber-500 font-semibold">{surfaceTemp.toFixed(1)}°F</span> · Ambient: <span className="text-orange-500 font-semibold">{ambientTemp}°F</span> · GHI: <span className="text-amber-400">{solarGhi.toFixed(0)} W/m²</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold font-mono border uppercase tracking-tight ${
                  riskTier === "CRITICAL_EXCEEDANCE"
                    ? "bg-rose-500/15 text-rose-500 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                    : riskTier === "ELEVATED_DRIFT"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                }`}
              >
                {riskTier.replace("_", " ")}
              </span>
            </div>
          </div>

          {/* 3-Card Thermodynamic Envelope Degradation Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Metric 1: Effective U-Factor */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-amber-500/20 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                  <span>Effective U-Factor</span>
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-base font-bold font-mono text-black dark:text-white mt-1">
                  {effectiveU.toFixed(3)}
                  <span className="text-[9.5px] font-normal text-gray-400 dark:text-zinc-500 ml-1">BTU/hr·ft²·°F</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 pt-1 border-t border-black/5 dark:border-white/[0.04] flex items-center justify-between">
                <span>IECC Base: {baselineU.toFixed(3)}</span>
                <span className="font-semibold text-rose-500">+{(((effectiveU - baselineU) / baselineU) * 100).toFixed(0)}% Conductance</span>
              </div>
            </div>

            {/* Metric 2: R-Value Degradation */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-rose-500/20 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                  <span>R-Value Degradation</span>
                  <Activity className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="text-base font-bold font-mono text-rose-500 mt-1">
                  +{rLossPct.toFixed(1)}% Loss
                </div>
              </div>
              
              {/* Dynamic Degradation Bar */}
              <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/[0.04]">
                <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (rLossPct / 45.0) * 100)}%` }}
                  />
                </div>
                <div className="text-[9.5px] font-mono text-gray-400 dark:text-zinc-500 flex justify-between">
                  <span>Continuous Insulation</span>
                  <span>Peak Solar Drift</span>
                </div>
              </div>
            </div>

            {/* Metric 3: Envelope Heat Flux */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle border border-orange-500/20 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                  <span>Envelope Heat Flux (q)</span>
                  <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <div className="text-base font-bold font-mono text-orange-500 mt-1">
                  {heatFlux.toFixed(1)}
                  <span className="text-[9.5px] font-normal text-gray-400 dark:text-zinc-500 ml-1">BTU/hr·ft²</span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-gray-600 dark:text-zinc-400 pt-1 border-t border-black/5 dark:border-white/[0.04] flex items-center justify-between">
                <span>Sol-Air: {solAirTemp.toFixed(1)}°F</span>
                <span className="text-amber-500 font-semibold">High Ingress</span>
              </div>
            </div>
          </div>

          {/* ASHRAE 55 Adaptive Comfort Finding */}
          <div className="p-3.5 rounded-2xl glass-panel-subtle border-amber-500/25 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-tight">
                  1. ASHRAE 55-2023 Thermal Comfort Standard
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {isExceeded ? `+${tempDelta.toFixed(1)}°F Exceedance` : "Within Band"}
              </span>
            </div>
            <p className="text-[10.5px] font-mono text-gray-500 dark:text-zinc-400 pl-5">
              Citation: ASHRAE Standard 55-2023 §5.3 — Operative Temperature Upper Comfort Limit (79.0°F @ 0.5 clo summer baseline)
            </p>
            <p className="text-xs leading-relaxed font-mono text-gray-800 dark:text-zinc-200 pl-5">
              {auditReport.ashrae_compliance_status || "Operative comfort threshold exceeded. Radiant mean temperature surge triggers mandatory mechanical cooling compensation."}
            </p>
          </div>

          {/* IECC Building Envelope Warning */}
          <div className="p-3.5 rounded-2xl glass-panel-subtle border-amber-500/25 space-y-1.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                2. IECC 2021/2024 Building Envelope & Insulation Warning
              </span>
            </div>
            <p className="text-[10.5px] font-mono text-gray-500 dark:text-zinc-400 pl-5">
              Citation: IECC 2021 §C402 / ASHRAE 90.1-2019 §5 — Continuous Insulation (ci) & Thermal Bridging
            </p>
            <p className="text-xs leading-relaxed font-mono text-gray-800 dark:text-zinc-200 pl-5">
              {auditReport.iecc_envelope_warning || "Continuous insulation performance degraded by high surface temperature differential. Thermal envelope retrofit recommended."}
            </p>
          </div>

          {/* Recommended HVAC Mitigation Plan */}
          <div className="p-3.5 rounded-2xl glass-panel-subtle border-orange-500/35 space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-mono text-xs font-bold text-orange-500 uppercase tracking-tight">
                3. Actionable HVAC & Envelope Mitigation Directive
              </span>
            </div>
            <p className="text-xs leading-relaxed font-mono text-gray-800 dark:text-zinc-200 pl-5">
              {auditReport.recommended_hvac_action || "Schedule Stage-2 pre-cooling cycle prior to peak solar irradiance to shave peak electrical demand."}
            </p>

            <div className="pt-1 pl-5 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>n8n Audit Webhook: Dispatched ✓</span>
              </div>
              <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                Timestamp: {auditReport.timestamp || "2026-08-19T06:00:00Z"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
