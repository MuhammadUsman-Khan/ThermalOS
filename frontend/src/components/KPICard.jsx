// A single KPI tile: label + icon header, a large value, and a footer that pairs
// contextual text/badge with a decorative sparkline.
export default function KPICard({
  label,
  icon,
  value,
  unit,
  valueSuffix,
  hoverBorder = "hover:border-[#FF6B2B]/30",
  footer,
  sparkStroke,
  sparkPath,
  sparkGradientId,
  darkMode,
}) {
  return (
    <div
      className={`bg-white dark:bg-[#0D0D0D]/80 border border-gray-200 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between shadow-sm dark:shadow-2xl backdrop-blur-xl ${hoverBorder} transition-all overflow-hidden relative`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-zinc-500 uppercase mb-4">
          {label}
        </span>
        {icon}
      </div>

      <div className="my-1 flex items-baseline">
        <span className="text-5xl lg:text-6xl font-semibold tracking-tight tabular-nums text-slate-800 dark:text-white">
          {value}
        </span>
        {unit && (
          <span className="text-2xl font-medium text-slate-500 dark:text-zinc-400 ml-1 inline-block align-top mt-1.5">
            {unit}
          </span>
        )}
        {valueSuffix}
      </div>

      <div className="flex items-center justify-between pt-2">
        {footer}

        <svg className="w-28 h-8 overflow-visible" viewBox="0 0 110 32">
          <defs>
            <linearGradient id={sparkGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparkStroke} stopOpacity={darkMode ? 0.35 : 0.2} />
              <stop offset="100%" stopColor={sparkStroke} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <path d={`${sparkPath} L110,32 L0,32 Z`} fill={`url(#${sparkGradientId})`} />
          <path
            d={sparkPath}
            fill="none"
            stroke={sparkStroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
