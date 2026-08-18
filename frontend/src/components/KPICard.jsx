export default function KPICard({
  label,
  icon,
  value,
  unit,
  valueSuffix,
  footer,
  sparkStroke = "#71717a",
  sparkPath,
  sparkGradientId,
  darkMode,
}) {
  return (
    <div className="bg-white dark:bg-[#12151B] border border-slate-200/80 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-colors hover:border-slate-300 dark:hover:border-zinc-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          {label}
        </span>
        <div className="text-slate-400 dark:text-zinc-500">{icon}</div>
      </div>

      {/* Main Metric Value */}
      <div className="my-2.5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold font-mono tracking-tight tabular-nums text-slate-900 dark:text-zinc-100">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-mono text-slate-500 dark:text-zinc-400">
            {unit}
          </span>
        )}
        {valueSuffix}
      </div>

      {/* Footer & Sparkline */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-zinc-800/60">
        <div className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
          {footer}
        </div>

        {sparkPath && (
          <svg className="w-20 h-5 overflow-visible" viewBox="0 0 110 32">
            <defs>
              <linearGradient id={sparkGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkStroke} stopOpacity={darkMode ? 0.12 : 0.06} />
                <stop offset="100%" stopColor={sparkStroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={`${sparkPath} L110,32 L0,32 Z`} fill={`url(#${sparkGradientId})`} />
            <path
              d={sparkPath}
              fill="none"
              stroke={sparkStroke}
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
