import React from "react";

export default function RadialGauge({
  value = 0,
  min = 50,
  max = 120,
  threshold = 85,
  unit = "°F",
  label = "WBGT INDEX",
  size = 140,
  strokeWidth = 10,
  color = "#F43F5E",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc spans 240 degrees (from 150deg to 390deg)
  const arcLength = circumference * (240 / 360);
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = (normalizedValue - min) / (max - min);
  const strokeDashoffset = arcLength - percentage * arcLength;
  const isCritical = value >= threshold;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div style={{ width: size, height: size * 0.85 }} className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="transform -rotate-[210deg] overflow-visible"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-zinc-800"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Safety / Critical Zone Highlight Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isCritical ? "rgba(244, 63, 94, 0.25)" : "rgba(16, 185, 129, 0.2)"}
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: isCritical ? `drop-shadow(0 0 8px ${color})` : "none",
            }}
          />
        </svg>

        {/* Center Display Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold font-mono text-slate-800 dark:text-white tabular-nums">
              {typeof value === "number" ? value.toFixed(1) : value}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 ml-0.5">
              {unit}
            </span>
          </div>
          <span
            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5 ${
              isCritical
                ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {isCritical ? "CRITICAL" : "SAFE"}
          </span>
        </div>
      </div>

      <div className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400 dark:text-zinc-500 mt-1">
        {label}
      </div>
    </div>
  );
}
