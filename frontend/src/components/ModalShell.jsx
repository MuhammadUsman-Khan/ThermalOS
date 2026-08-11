import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

// Shared dual-theme modal chrome for the three agent panels.
// Closes on Escape and on clicking the backdrop outside the card.
export default function ModalShell({ onClose, icon, title, subtitle, children }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] text-slate-900 dark:text-zinc-100"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h2 className="font-display text-base font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-5 space-y-4 text-sm font-sans">{children}</div>

        <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
