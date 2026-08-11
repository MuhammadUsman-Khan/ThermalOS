import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

// Bottom-right toast that auto-dismisses after `duration` ms (default 3s).
export default function Toast({ toast, onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [toast, onDismiss, duration]);

  return (
    <div className="fixed bottom-5 right-5 z-[60] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="pointer-events-auto flex items-start gap-3 max-w-sm bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl px-4 py-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                {toast.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-md text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
