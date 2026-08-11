import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Check,
  FileCheck,
  Link2,
  Trash2,
} from "lucide-react";

// Badge, border and icon styling per log entry type.
const getLogConfig = (type) => {
  switch (type) {
    case "extreme":
      return {
        borderClass: "border-l-red-500",
        badgeClass:
          "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]",
        textClass: "text-red-700 dark:text-red-300",
        icon: <AlertOctagon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />,
      };
    case "high":
      return {
        borderClass: "border-l-orange-500",
        badgeClass:
          "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
        textClass: "text-orange-700 dark:text-orange-300",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />,
      };
    case "elevated":
      return {
        borderClass: "border-l-amber-500",
        badgeClass:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        textClass: "text-amber-700 dark:text-amber-300",
        icon: <Activity className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
      };
    case "city_change":
      return {
        borderClass: "border-l-sky-500",
        badgeClass:
          "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        textClass: "text-sky-700 dark:text-sky-300 font-semibold",
        icon: <Link2 className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />,
      };
    case "audit":
    case "dispatch":
      return {
        borderClass: "border-l-purple-500",
        badgeClass:
          "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        textClass: "text-purple-700 dark:text-purple-300",
        icon: <FileCheck className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />,
      };
    default:
      return {
        borderClass: "border-l-emerald-500",
        badgeClass:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        textClass: "text-gray-700 dark:text-zinc-300",
        icon: <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />,
      };
  }
};

export default function AgentEventLog({ logs, totalEventsCount, onClear }) {
  const scrollRef = useRef(null);
  // Newest entries are prepended at the top, so we keep the view pinned to the
  // top on new arrivals — unless the user has scrolled down to read history.
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
    <div className="lg:col-span-4 bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col shadow-sm dark:shadow-2xl backdrop-blur-xl h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-white/5 mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-gray-400 dark:text-zinc-400" />
          <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            AGENT EVENT LOG
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            title="Clear event log"
            className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-red-500 hover:border-red-500/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3 h-3" />
            CLEAR
          </button>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-bold">
            LIVE FEED
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto max-h-[340px] pr-1 font-mono text-xs"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const cfg = getLogConfig(log.type);
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`bg-white dark:bg-[#141414] border border-gray-200 dark:border-white/5 rounded-xl p-3.5 mb-2.5 relative overflow-hidden shadow-sm dark:shadow-none border-l-4 ${cfg.borderClass}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {cfg.icon}
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border font-mono ${cfg.badgeClass}`}
                  >
                    {log.badge}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed font-sans font-medium ${cfg.textClass}`}>
                  {log.text}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400 dark:text-zinc-500">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Telemetry: Active</span>
        </div>
        <span>Events: {totalEventsCount}</span>
      </div>
    </div>
  );
}
