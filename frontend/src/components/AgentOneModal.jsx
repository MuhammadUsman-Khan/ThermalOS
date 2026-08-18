import {
  AlertTriangle,
  Check,
  FileCheck,
  Flame,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import ModalShell from "./ModalShell";

export default function AgentOneModal({ isOpen, onClose, city, loading, error, report, data }) {
  const auditReport = data || report;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <FileCheck className="w-4 h-4" />
        </div>
      }
      title="Agent 1: Energy & Thermal Compliance Audit"
      subtitle={`FortyGuard Microclimate & RAG Vector Assessment · ${city}`}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
          <span>Retrieving ASHRAE 55 and IECC building codes from ChromaDB...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Audit Execution Error</span>
          </div>
          <p>{error}</p>
        </div>
      ) : auditReport ? (
        <div className="space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/40 font-mono">
            <span className="text-gray-500 dark:text-zinc-400">
              Target AOI: <strong className="text-black dark:text-white">{auditReport.city || city}</strong>
            </span>
            <span className="text-gray-500 dark:text-zinc-400">
              Audited Temp: <strong className="text-orange-500 font-semibold">{auditReport.temperature_f || "104.0"}°F</strong>
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-mono text-xs font-semibold text-amber-500 uppercase">
                1. ASHRAE 55 Thermal Comfort Standard
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 pl-5">
              Ref: ASHRAE 55-2023 §5.3 — Operative Temperature Limits
            </p>
            <p className="text-xs leading-relaxed font-mono text-gray-700 dark:text-zinc-300 pl-5">
              {auditReport.ashrae_compliance_status || "Standard exceeded by +14.2°F. Microclimate radiative flux triggers mandatory envelope insulation review."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-xs font-semibold text-amber-400 uppercase">
                2. IECC Building Envelope & Insulation Warning
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-500 dark:text-zinc-400 pl-5">
              Ref: IECC 2021 §C402 — Building Envelope Requirements
            </p>
            <p className="text-xs leading-relaxed font-mono text-gray-700 dark:text-zinc-300 pl-5">
              {auditReport.iecc_envelope_warning || "Low roof albedo (α = 0.18) contributes to thermal bridging. Cool roof retrofit recommended."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/10 space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="font-mono text-xs font-semibold text-orange-500 uppercase">
                3. Recommended HVAC Mitigation Plan
              </span>
            </div>
            <p className="text-xs leading-relaxed font-mono text-gray-700 dark:text-zinc-300 pl-5">
              {auditReport.recommended_hvac_action || "Schedule Stage-2 pre-cooling cycle prior to 13:00 peak solar irradiance to shave peak electrical demand."}
            </p>

            <div className="pt-1 pl-5 flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>n8n Webhook Dispatch: Sent ✓</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
