import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, AlertOctagon, X } from "lucide-react";

export default function Toast({ toast, message, type = "info", onClose, onDismiss, duration = 3500 }) {
  const text = message || toast?.message || toast?.title;
  const toastType = type || toast?.type || "info";
  const dismissFn = onClose || onDismiss;

  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => {
      if (dismissFn) dismissFn();
    }, duration);
    return () => clearTimeout(t);
  }, [text, duration, dismissFn]);

  if (!text) return null;

  const getIcon = () => {
    switch (toastType) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case "error":
        return <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60] pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 450, damping: 25 }}
          className="pointer-events-auto flex items-start gap-3 max-w-sm glass-panel border-orange-500/30 rounded-xl shadow-2xl px-4 py-3 font-sans relative overflow-hidden"
        >
          {/* Subtle top edge glow */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-orange-500/60 via-amber-500/60 to-transparent" />

          {getIcon()}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-black dark:text-zinc-200 leading-snug font-mono tracking-tight">
              {text}
            </p>
          </div>
          {dismissFn && (
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={dismissFn}
              className="p-0.5 rounded text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
