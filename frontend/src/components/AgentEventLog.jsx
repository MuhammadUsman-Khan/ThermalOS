import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Check,
  FileCheck,
  Zap,
  Trash2,
  Radio,
} from "lucide-react";

const getLogConfig = (type) => {
  switch (type) {
    case "extreme":
      return {
        badgeClass: "bg-rose-500/15 text-rose-500 border border-rose-500/30",
        textClass: "text-rose-400 font-medium",
        tag: "Critical",
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
      };
    case "high":
      return {
        badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
        textClass: "text-zinc-200",
        tag: "Elevated",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
      };
    case "elevated":
      return {
        badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        textClass: "text-zinc-300",
        tag: "Advisory",
        icon: <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      };
    case "city_change":
      return {
        badgeClass: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
        textClass: "text-zinc-200",
        tag: "Focus",
        icon: <Radio className="w-3.5 h-3.5 text-orange-500 shrink-0" />,
      };
    case "audit":
      return {
        badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        textClass: "text-zinc-200",
        tag: "Audit",
        icon: <FileCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
      };
    case "dispatch":
      return {
        badgeClass: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
        textClass: "text-zinc-200",
        tag: "Pre-Cool",
        icon: <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
      };
    default:
      return {
        badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        textClass: "text-zinc-300",
        tag: "Telemetry",
        icon: <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      };
  }
};

export default function AgentEventLog({ logs, onClear }) {
  const scrollRef = useRef(null);
  const pinnedToTopRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) pinnedToTopRef.current = el.scrollTop <= 8;
  };

  useEffect(() => {
    if (pinnedToTopRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <div className="lg:col-span-4 bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col shadow-xs h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800/80 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-500" />
          <h2 className="font-display text-sm font-semibold tracking-tight text-black dark:text-white">
            Dispatch & Telemetry Log
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            title="Clear event log"
            className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Sync</span>
          </div>
        </div>
      </div>

      {/* Log list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto max-h-[340px] pr-1.5 font-mono text-xs space-y-2"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const cfg = getLogConfig(log.type);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="p-2.5 rounded-lg border border-gray-100 dark:border-zinc-800/60 bg-gray-50/50 dark:bg-zinc-900/30 flex flex-col gap-1 hover:border-orange-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {cfg.icon}
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">
                      {log.source || "System"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${cfg.badgeClass}`}>
                      {cfg.tag}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                      {log.time}
                    </span>
                  </div>
                </div>
                <div className={`text-xs pl-5 leading-relaxed ${cfg.textClass}`}>
                  {log.message}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {logs.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 gap-1 font-mono text-xs">
            <span>No logged dispatch events</span>
            <span className="text-[10px]">Real-time telemetry and agent actions will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
}
