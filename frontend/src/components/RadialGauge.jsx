import React from "react";

export default function RadialGauge({
  value = 0,
  min = 50,
  max = 120,
  threshold = 85,
  unit = "°F",
  label = "WBGT Heat Stress",
  size = 130,
  strokeWidth = 8,
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
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.5s ease-out",
            }}
          />
        </svg>

        {/* Center Display Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="flex items-baseline">
            <span className="text-2xl font-semibold font-mono text-slate-900 dark:text-white tabular-nums">
              {typeof value === "number" ? value.toFixed(1) : value}
            </span>
            <span className="text-xs font-mono text-gray-500 dark:text-zinc-400 ml-0.5">
              {unit}
            </span>
          </div>
          <span
            className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded mt-1 ${
              isCritical
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            }`}
          >
            {isCritical ? "Advisory Triggered" : "Nominal Range"}
          </span>
        </div>
      </div>

      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mt-1">
        {label}
      </div>
    </div>
  );
}
