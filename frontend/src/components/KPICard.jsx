import { motion } from "framer-motion";

export default function KPICard({
  label,
  icon,
  value,
  unit,
  valueSuffix,
  footer,
  sparkStroke = "#FF6B2B",
  sparkPath,
  sparkGradientId = "cardSparkGrad",
  accentColor = "text-orange-500",
  borderHover = "hover:border-orange-500/40",
  darkMode = true,
  delay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.25, 1, 0.5, 1] }}
      whileHover={{ y: -2.5, transition: { duration: 0.15 } }}
      className={`bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-colors ${borderHover} group relative overflow-hidden`}
    >
      {/* Subtle top edge accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-orange-500/40 group-hover:to-transparent transition-all duration-300" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-medium">
          {label}
        </span>
        <div className={`${accentColor} transition-transform group-hover:scale-110 group-hover:rotate-3 duration-200`}>
          {icon}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="my-2.5 flex items-baseline gap-1.5">
        <span className="text-3xl lg:text-[32px] font-semibold font-mono tracking-tight tabular-nums text-black dark:text-white leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono font-medium text-gray-500 dark:text-zinc-400">
            {unit}
          </span>
        )}
        {valueSuffix}
      </div>

      {/* Footer & Sparkline */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-zinc-800/80">
        <div className="text-[11px] text-gray-600 dark:text-zinc-400 font-mono">
          {footer}
        </div>

        {sparkPath && (
          <svg className="w-20 h-5 overflow-visible" viewBox="0 0 110 32">
            <defs>
              <linearGradient id={sparkGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkStroke} stopOpacity={darkMode ? 0.3 : 0.18} />
                <stop offset="100%" stopColor={sparkStroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={`${sparkPath} L110,32 L0,32 Z`} fill={`url(#${sparkGradientId})`} />
            <motion.path
              d={sparkPath}
              fill="none"
              stroke={sparkStroke}
              strokeWidth="1.75"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
            />
          </svg>
        )}
      </div>
    </motion.div>
  );
}
