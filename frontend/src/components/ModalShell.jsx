import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Shared White + Black + Orange modal shell
export default function ModalShell({ isOpen, onClose, icon, title, subtitle, children }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", onKeyDown);
    }
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.15 }}
          className="bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-orange-500/30 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] text-black dark:text-white font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h2 className="font-display text-sm font-semibold tracking-tight text-black dark:text-white">
                  {title}
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm">
            {children}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3 font-mono text-xs">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg font-medium bg-orange-500 hover:bg-orange-600 text-black font-semibold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
