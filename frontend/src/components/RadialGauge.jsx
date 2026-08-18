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
  color = "#f43f5e",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
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
            className="text-slate-200 dark:text-zinc-800"
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
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.4s ease-out",
            }}
          />
        </svg>

        {/* Center Display Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-semibold font-mono text-slate-900 dark:text-zinc-100 tabular-nums">
              {typeof value === "number" ? value.toFixed(1) : value}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              {unit}
            </span>
          </div>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded mt-0.5 ${
              isCritical
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium"
                : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-normal"
            }`}
          >
            {isCritical ? "Advisory" : "Nominal"}
          </span>
        </div>
      </div>

      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 mt-1">
        {label}
      </div>
    </div>
  );
}
