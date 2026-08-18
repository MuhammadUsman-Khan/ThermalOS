import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

// Shared White + Black + Orange modal shell with spring physics
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
        transition={{ duration: 0.18 }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] text-black dark:text-white font-sans"
        >
          {/* Subtle top edge glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h2 className="font-display text-sm font-bold tracking-tight text-black dark:text-white">
                  {title}
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono mt-0.5 tracking-tight">
                  {subtitle}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm">
            {children}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3 font-mono text-xs">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold bg-orange-500 hover:bg-orange-600 text-black shadow-sm transition-all cursor-pointer"
            >
              Dismiss
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
