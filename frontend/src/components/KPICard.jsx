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
}) {
  return (
    <div
      className={`bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all ${borderHover} group`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400">
          {label}
        </span>
        <div className={`${accentColor} transition-transform group-hover:scale-110 duration-200`}>
          {icon}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="my-2 flex items-baseline gap-1">
        <span className="text-3xl font-semibold font-mono tracking-tight tabular-nums text-black dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-mono text-gray-500 dark:text-zinc-400">
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
                <stop offset="0%" stopColor={sparkStroke} stopOpacity={darkMode ? 0.25 : 0.15} />
                <stop offset="100%" stopColor={sparkStroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={`${sparkPath} L110,32 L0,32 Z`} fill={`url(#${sparkGradientId})`} />
            <path
              d={sparkPath}
              fill="none"
              stroke={sparkStroke}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
