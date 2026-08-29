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
  Cpu,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const ENDPOINT_SPECS = [
  {
    name: "Environmental & Solar",
    endpoint: "POST /v1/env_params",
    cost: "200 cr / call",
    desc: "Real-time wet bulb, heat index, apparent temp, and solar GHI/DNI irradiance.",
    caching: "Zero-Waste Disk Cache (Hourly)",
  },
  {
    name: "Spatial Thermal Mesh",
    endpoint: "POST /v1/heatmap",
    cost: "1,000 cr / call",
    desc: "100m² microclimate thermal mesh tiles with 12 equal-interval temperature bins.",
    caching: "Hard-Capped (≤30/day) + Cached",
  },
  {
    name: "Satellite Land Cover",
    endpoint: "POST /v1/satellite",
    cost: "500 cr / call",
    desc: "High-resolution segmentation: tree canopy, impervious surfaces, water, and soil.",
    caching: "Permanent Regional Cache",
  },
  {
    name: "Heat Intelligence Summary",
    endpoint: "POST /v1/heat_intelligence",
    cost: "Dynamic / call",
    desc: "Comprehensive 5-Pillar municipal intelligence report across climate risk sectors.",
    caching: "Disk Cached per Municipal Query",
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
    <div className="w-full font-sans select-none">
      {/* Primary Executive Quota Panel */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-black/10 dark:border-white/[0.08] shadow-lg transition-all relative overflow-hidden">
        {/* Subtle Ambient Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Section 1: FortyGuard Brand & Status */}
          <div className="flex items-center gap-3.5 min-w-[240px]">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-amber-500/5 border border-orange-500/30 flex items-center justify-center text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight text-black dark:text-white">
                  FortyGuard Cloud
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-radar-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Radiometric microclimate allowance
              </p>
            </div>
          </div>

          {/* Section 2: Balanced Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-3xl">
            {/* Tile 1: Remaining Credits */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle flex flex-col justify-between space-y-2.5 border border-black/5 dark:border-white/[0.04]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Credits
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <strong className="text-black dark:text-white font-bold text-xs">
                    {(quota.credits_remaining / 1000000).toFixed(2)}M
                  </strong>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">/ 2.0M</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${creditPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                <span>Used: {quota.credits_used.toLocaleString()} cr</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{creditPct.toFixed(1)}% active</span>
              </div>
            </div>

            {/* Tile 2: Daily Heatmap Limit */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle flex flex-col justify-between space-y-2.5 border border-black/5 dark:border-white/[0.04]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  Heatmap Calls
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <strong className="text-orange-500 font-bold text-xs">
                    {quota.heatmap_remaining_today}
                  </strong>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">/ {quota.heatmap_daily_limit} today</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${heatmapPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                <span>Cap: 30 / day</span>
                <span>Resets 00:00 UTC</span>
              </div>
            </div>

            {/* Tile 3: Validity & Cache Protection */}
            <div className="p-3.5 rounded-2xl glass-panel-subtle flex flex-col justify-between space-y-2.5 border border-black/5 dark:border-white/[0.04]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  Validity
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <strong className="text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                    {quota.days_remaining}
                  </strong>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">/ {quota.valid_days_total} Days</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-zinc-300 font-medium">
                  <Database className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Zero-Waste Cache</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold border border-emerald-500/20 text-[10px]">
                  {quota.cache_hits} Saved
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 dark:text-zinc-500">
                <span>Disk Storage Active</span>
                <span className="text-emerald-600 dark:text-emerald-400">0 cr Re-queries</span>
              </div>
            </div>
          </div>

          {/* Section 3: Action Controls */}
          <div className="flex items-center lg:flex-col lg:items-end justify-between gap-2.5 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-panel-subtle hover:border-orange-500/40 text-black dark:text-white transition-all cursor-pointer font-medium text-xs shadow-xs"
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
              className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 font-medium transition-colors"
            >
              <span>API Reference</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Expandable Endpoint Architecture Grid */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-200/80 dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <h4 className="font-display font-bold text-xs tracking-tight text-black dark:text-white">
                      FortyGuard Core Microclimate Endpoints & Routing Architecture
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold border border-orange-500/20">
                    4 Active Production Routes
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {ENDPOINT_SPECS.map((spec, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl glass-panel-subtle border border-black/5 dark:border-white/[0.06] space-y-2.5 flex flex-col justify-between hover:border-orange-500/30 transition-all group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-xs text-black dark:text-white">
                            {spec.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold border border-orange-500/20">
                            {spec.cost}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-black/40 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800">
                          {spec.endpoint}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed pt-1">
                          {spec.desc}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-gray-200/60 dark:border-white/[0.05] flex items-center gap-1.5 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
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
