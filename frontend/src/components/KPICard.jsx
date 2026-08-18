export default function KPICard({
  label,
  icon,
  value,
  unit,
  valueSuffix,
  hoverBorder = "hover:border-orange-500/30",
  footer,
  sparkStroke = "#f97316",
  sparkPath,
  sparkGradientId,
  darkMode,
}) {
  return (
    <div
      className={`bg-white dark:bg-[#111318] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all ${hoverBorder}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400">
          {label}
        </span>
        <div className="text-gray-400 dark:text-zinc-500">{icon}</div>
      </div>

      {/* Main Metric Value */}
      <div className="my-2 flex items-baseline">
        <span className="text-4xl font-semibold font-mono tracking-tight tabular-nums text-slate-900 dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-lg font-mono font-normal text-gray-500 dark:text-zinc-400 ml-1">
            {unit}
          </span>
        )}
        {valueSuffix}
      </div>

      {/* Footer & Sparkline */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5">
        <div className="text-[11px] text-gray-600 dark:text-zinc-400 font-mono">
          {footer}
        </div>

        {sparkPath && (
          <svg className="w-24 h-6 overflow-visible" viewBox="0 0 110 32">
            <defs>
              <linearGradient id={sparkGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkStroke} stopOpacity={darkMode ? 0.25 : 0.12} />
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
