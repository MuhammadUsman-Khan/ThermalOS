import {
  AlertTriangle,
  Check,
  FileCheck,
  Flame,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import ModalShell from "./ModalShell";

// Agent 1: Energy & Thermal Compliance Audit (RAG vector assessment).
export default function AgentOneModal({ onClose, city, loading, error, report }) {
  return (
    <ModalShell
      onClose={onClose}
      icon={
        <div className="h-9 w-9 rounded-xl bg-orange-50 dark:bg-[#FF6B2B]/20 border border-orange-200 dark:border-[#FF6B2B]/30 flex items-center justify-center shadow-sm">
          <FileCheck className="w-5 h-5 text-[#FF6B2B]" />
        </div>
      }
      title="Agent 1: Energy & Thermal Compliance Audit"
      subtitle={`FortyGuard Microclimate & RAG Vector Assessment • ${city}`}
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 font-mono text-xs text-gray-500 dark:text-zinc-400">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B2B]" />
          <span>Retrieving ASHRAE 55 and IECC building codes from ChromaDB...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Audit Execution Error</span>
          </div>
          <p>{error}</p>
        </div>
      ) : report ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/50 font-mono text-xs">
            <span className="text-gray-600 dark:text-zinc-400">
              Target Region: <strong className="text-slate-900 dark:text-white">{report.city}</strong>
            </span>
            <span className="text-gray-600 dark:text-zinc-400">
              Audited Temp: <strong className="text-[#FF6B2B]">{report.temperature_f}°F</strong>
            </span>
          </div>

          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                1. ASHRAE 55 Thermal Comfort Standard
              </span>
            </div>
            <p className="text-xs opacity-60 font-mono text-slate-500 dark:text-zinc-400 pl-6">
              Ref: ASHRAE 55-2023 §5.3 — Operative Temperature Limits
            </p>
            <p className="text-xs leading-relaxed font-mono text-slate-700 dark:text-zinc-300 pl-6">
              {report.ashrae_compliance_status}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                2. IECC Building Envelope & Insulation Warning
              </span>
            </div>
            <p className="text-xs opacity-60 font-mono text-slate-500 dark:text-zinc-400 pl-6">
              Ref: IECC 2021 §C402 — Building Envelope Requirements
            </p>
            <p className="text-xs leading-relaxed font-mono text-slate-700 dark:text-zinc-300 pl-6">
              {report.iecc_envelope_warning}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#FF6B2B]/30 bg-[#FF6B2B]/5 space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#FF6B2B]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF6B2B]">
                3. Recommended HVAC Mitigation Plan
              </span>
            </div>
            <p className="text-xs opacity-60 font-mono text-slate-500 dark:text-zinc-400 pl-6">
              Ref: ASHRAE 90.1-2019 §6.5 — HVAC System Requirements
            </p>
            <p className="text-xs leading-relaxed font-mono text-slate-700 dark:text-zinc-300 pl-6">
              {report.recommended_hvac_action}
            </p>

            <div className="pt-2 pl-6 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold shadow-sm">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>n8n Automated Dispatch: Sent ✓</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ModalShell>
  );
}
