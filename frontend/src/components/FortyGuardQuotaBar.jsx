import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Zap,
  Clock,
  Database,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = "http://127.0.0.1:8000";

const ENDPOINT_SPECS = [
  {
    name: "Environmental & Solar",
    endpoint: "POST /v1/env_params",
    cost: "200 credits / call",
    desc: "Fetches live wet bulb, heat index, apparent temp, RH, and solar GHI/DNI irradiance.",
    caching: "Zero-waste disk cached by city + hour",
  },
  {
    name: "Thermal Heatmap Tiles",
    endpoint: "POST /v1/heatmap",
    cost: "1,000 credits / call",
    desc: "Generates 100m² microclimate thermal mesh tiles with 12 equal-interval temperature bins.",
    caching: "Hard-capped at ≤30 calls/day + disk cached",
  },
  {
    name: "Satellite Land Cover",
    endpoint: "POST /v1/satellite",
    cost: "500 credits / call",
    desc: "100m land cover segmentation (tree canopy, impervious surfaces, water, bare soil).",
    caching: "Disk cached in backend/cache/fortyguard/",
  },
  {
    name: "Heat Intelligence Summary",
    endpoint: "POST /v1/heat_intelligence",
    cost: "Dynamic / call",
    desc: "Comprehensive 5-Pillar municipal intelligence report across climate risks.",
    caching: "Full analysis cached permanently per query",
  },
];

export default function FortyGuardQuotaBar({ darkMode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quota, setQuota] = useState({
    is_live_ready: true,
    credit_allowance: 2000000,
    credits_used: 400,
    credits_remaining: 1999600,
    days_remaining: 34,
    valid_days_total: 34,
    heatmap_daily_limit: 30,
    heatmap_calls_today: 0,
    heatmap_remaining_today: 30,
    cache_hits: 1,
    credits_saved_by_cache: 500,
    quota_status: "OK",
  });

  const fetchQuota = async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/fortyguard/quota`);
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch (e) {
      // safe fallback keeps current state
    }
  };

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 8000);
    return () => clearInterval(interval);
  }, []);

  const creditPct = Math.max(
    1,
    Math.min(100, (quota.credits_remaining / quota.credit_allowance) * 100)
  );
  const heatmapPct = Math.max(
    5,
    Math.min(100, (quota.heatmap_remaining_today / quota.heatmap_daily_limit) * 100)
  );

  return (
    <div className="w-full font-mono text-xs select-none">
      {/* Primary Spacious Floating Quota Panel */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-black/10 dark:border-white/[0.08] shadow-md transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Section 1: FortyGuard Live Connection & Engine Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-black dark:text-white font-sans tracking-tight">
                  FortyGuard API Engine
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-radar-ping" />
                  LIVE CONNECTED
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                Radiometric microclimate & urban heat allowance monitor
              </p>
            </div>
          </div>

          {/* Section 2: Metric Gauges (Credits + Heatmaps + Validity) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-2xl">
            {/* 1. Credit Balance */}
            <div className="p-3 rounded-2xl glass-panel-subtle flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Remaining Credits
                </span>
                <span className="font-bold text-black dark:text-white">
                  {(quota.credits_remaining / 1000000).toFixed(2)}M / 2.0M
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9.5px] text-gray-400 dark:text-zinc-500">
                <span>Used: {quota.credits_used.toLocaleString()} cr</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{creditPct.toFixed(1)}% intact</span>
              </div>
            </div>

            {/* 2. Daily Heatmap Quota */}
            <div className="p-3 rounded-2xl glass-panel-subtle flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  Daily Heatmaps
                </span>
                <span className="font-bold text-orange-500">
                  {quota.heatmap_remaining_today} / {quota.heatmap_daily_limit} left
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${heatmapPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[9.5px] text-gray-400 dark:text-zinc-500">
                <span>Daily cap: 30 calls</span>
                <span>Resets 00:00 UTC</span>
              </div>
            </div>

            {/* 3. Validity & Zero-Waste Cache */}
            <div className="p-3 rounded-2xl glass-panel-subtle flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  Validity Window
                </span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {quota.days_remaining} / {quota.valid_days_total} Days
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] pt-1">
                <div className="flex items-center gap-1 text-gray-600 dark:text-zinc-300">
                  <Database className="w-3 h-3 text-emerald-500" />
                  <span>Zero-Waste Cache</span>
                </div>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[9.5px]">
                  {quota.cache_hits} queries saved
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Expand / Docs Action Button */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl glass-panel-subtle hover:border-orange-500/40 text-black dark:text-white transition-all cursor-pointer font-semibold shadow-xs"
            >
              <span>{isExpanded ? "Hide Endpoints" : "Inspect Endpoints"}</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-orange-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-orange-500" />
              )}
            </button>

            <a
              href="https://docs-api.fortyguard.com/docs/introduction"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10.5px] text-orange-500 hover:text-orange-400 font-medium transition-colors"
            >
              <span>API Reference</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Expandable Endpoint Breakdown Drawer */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-200/80 dark:border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-black dark:text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    FortyGuard Endpoints Architecture & Cost Distribution
                  </h4>
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono">
                    Key: bfd5••••••••••••••••••••••••2677
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {ENDPOINT_SPECS.map((spec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl glass-panel-subtle border border-gray-200/60 dark:border-white/[0.05] space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-black dark:text-white text-[11px]">
                            {spec.name}
                          </span>
                          <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold">
                            {spec.cost}
                          </span>
                        </div>
                        <div className="font-mono text-[9.5px] text-gray-400 dark:text-zinc-500 mt-1">
                          {spec.endpoint}
                        </div>
                        <p className="text-[10.5px] text-gray-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
                          {spec.desc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-200/60 dark:border-white/[0.05] flex items-center gap-1.5 text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>{spec.caching}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
