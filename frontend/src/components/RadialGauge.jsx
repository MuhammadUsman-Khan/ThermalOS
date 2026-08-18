import React from "react";

export default function RadialGauge({
  value = 0,
  min = 50,
  max = 120,
  threshold = 85,
  unit = "°F",
  label = "Liljegren WBGT",
  size = 120,
  strokeWidth = 7,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (240 / 360);
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = (normalizedValue - min) / (max - min);
  const strokeDashoffset = arcLength - percentage * arcLength;
  const isCritical = value >= threshold;
  const activeColor = isCritical ? "#F43F5E" : "#10B981";

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

          {/* Active Value Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: isCritical ? "drop-shadow(0 0 6px rgba(244, 63, 94, 0.4))" : "none",
            }}
          />
        </svg>

        {/* Center Display Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-semibold font-mono text-black dark:text-white tabular-nums">
              {typeof value === "number" ? value.toFixed(1) : value}
            </span>
            <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">
              {unit}
            </span>
          </div>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded mt-0.5 font-medium ${
              isCritical
                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                : "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
            }`}
          >
            {isCritical ? "Advisory" : "Nominal"}
          </span>
        </div>
      </div>

      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mt-1">
        {label}
      </div>
    </div>
  );
}
