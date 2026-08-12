// Shared constants and pure helpers for the ThermalOS Mission Control dashboard.

export const API_BASE = "http://127.0.0.1:8000";
export const N8N_AUDIT_WEBHOOK = "https://usmankhan0.app.n8n.cloud/webhook-test/thermalos-audit";

export const CITIES = ["Phoenix, AZ", "Houston, TX", "Las Vegas, NV", "Dallas, TX"];

export const MAX_DATA_POINTS = 20;
export const MAX_LOG_ENTRIES = 100;

const TIME_OPTS = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

// Current wall-clock time as a HH:MM:SS string.
export const timeNow = () => new Date().toLocaleTimeString([], TIME_OPTS);

// A HH:MM:SS string for a moment `secondsAgo` in the past (seeds initial telemetry).
export const getPastTimeString = (secondsAgo = 0) =>
  new Date(Date.now() - secondsAgo * 1000).toLocaleTimeString([], TIME_OPTS);

// Human-readable uptime (e.g. "1d 2h 3m 4s"), collapsing leading zero units.
export const formatUptime = (totalSeconds) => {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

let logSeq = 0;
// Build a log entry with a unique, collision-free id and a fresh timestamp.
export const makeLog = ({ type, badge, text }) => ({
  id: `log-${Date.now()}-${logSeq++}`,
  timestamp: timeNow(),
  type,
  badge,
  text,
});

// Prepend new entries (newest first) and cap total history at MAX_LOG_ENTRIES.
export const prependLogs = (prev, entries) => {
  const list = Array.isArray(entries) ? entries : [entries];
  return [...list, ...prev].slice(0, MAX_LOG_ENTRIES);
};

// Risk tier styling driven by surface temperature. Thresholds: 98 / 103 / 105.
export const getRiskConfig = (temp = 95) => {
  if (temp >= 105) {
    return {
      label: "CRIT",
      badge: "EXTREME",
      badgeClass:
        "bg-red-500/10 text-red-500 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
      textColor: "text-red-500",
      sparkStroke: "#FF3B3B",
    };
  }
  if (temp >= 103) {
    return {
      label: "HIGH",
      badge: "HIGH",
      badgeClass:
        "bg-orange-500/10 text-orange-500 border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]",
      textColor: "text-orange-500",
      sparkStroke: "#FF6B2B",
    };
  }
  if (temp >= 98) {
    return {
      label: "ELEV",
      badge: "ELEVATED",
      badgeClass: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
      textColor: "text-amber-500",
      sparkStroke: "#F59E0B",
    };
  }
  return {
    label: "NORM",
    badge: "NOMINAL",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30",
    textColor: "text-emerald-500",
    sparkStroke: "#10B981",
  };
};

// Classify a telemetry reading into a log entry (or null to suppress noisy repeats).
// `prevRisk` lets us log "normal" only on transition into the nominal band.
export const telemetryLog = (city, temp, risk, prevRisk) => {
  if (temp >= 105 || risk === "extreme") {
    return makeLog({
      type: "extreme",
      badge: "CRITICAL BREACH",
      text: `CRITICAL HEAT SPIKE: Threshold breached for ${city} (${temp}°F). Emergency protocol active.`,
    });
  }
  if (temp >= 103 || risk === "high") {
    return makeLog({
      type: "high",
      badge: "HIGH HEAT",
      text: `HIGH HEAT ELEVATION: ${city} at ${temp}°F. Monitoring thermal plume.`,
    });
  }
  if (temp >= 98 || risk === "elevated") {
    return makeLog({
      type: "elevated",
      badge: "ELEVATED",
      text: `MODERATE BOUNDARY: ${city} telemetry at ${temp}°F. Micro-climate grid active.`,
    });
  }
  if (prevRisk !== "nominal") {
    return makeLog({
      type: "nominal",
      badge: "NOMINAL",
      text: `NORMAL AMBIENT: ${city} surface reading at ${temp}°F. Thermal profile within ASHRAE comfort envelope.`,
    });
  }
  return null;
};
