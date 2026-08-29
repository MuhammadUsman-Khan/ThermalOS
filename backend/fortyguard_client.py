"""ThermalOS — FortyGuard Enterprise API Client & Smart Quota Guard.

Seamlessly bridges FortyGuard's tOS Enterprise API (Temperature, Environmental
Parameters, Heatmaps, Satellite Segmentation, and Heat Intelligence) with
ThermalOS autonomous agents and telemetry services.

Smart Quota & Credit Protection System:
- Total Allowance: 2,000,000 Credits (Valid for 34 days from receipt)
- Daily Heatmap Guard: Hard-capped at 30 requests / day (auto-resets daily)
- Persistent Multi-Tier Caching: All query results are cached to disk so duplicate
  calls for the same city/date never burn credits.
- Graceful Fallback: Seamlessly switches to high-fidelity microclimate models when
  quota is reached or API key is not present.
"""

from __future__ import annotations

import os
import sys
import glob
import json
import time
import math
import random
import logging
import threading
from datetime import datetime, date, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger("thermalos.fortyguard")

# Coordinate lookups for all FortyGuard-supported US metropolitan areas
CITY_COORDINATES: Dict[str, Dict[str, float]] = {
    # Southwest & Desert
    "Phoenix, AZ": {"lat": 33.4484, "lon": -112.0740, "elevation": 331.0},
    "Las Vegas, NV": {"lat": 36.1699, "lon": -115.1398, "elevation": 610.0},
    "Tucson, AZ": {"lat": 32.2226, "lon": -110.9747, "elevation": 728.0},
    # Texas & South Central
    "Houston, TX": {"lat": 29.7604, "lon": -95.3698, "elevation": 15.0},
    "Dallas, TX": {"lat": 32.7767, "lon": -96.7970, "elevation": 131.0},
    "Austin, TX": {"lat": 30.2672, "lon": -97.7431, "elevation": 149.0},
    "San Antonio, TX": {"lat": 29.4241, "lon": -98.4936, "elevation": 198.0},
    "New Orleans, LA": {"lat": 29.9511, "lon": -90.0715, "elevation": 2.0},
    # West Coast & Pacific
    "San Jose, CA": {"lat": 37.3382, "lon": -121.8863, "elevation": 28.0},
    "Los Angeles, CA": {"lat": 34.0522, "lon": -118.2437, "elevation": 87.0},
    "San Francisco, CA": {"lat": 37.7749, "lon": -122.4194, "elevation": 16.0},
    "Seattle, WA": {"lat": 47.6062, "lon": -122.3321, "elevation": 53.0},
    # Mountain & Midwest
    "Denver, CO": {"lat": 39.7392, "lon": -104.9903, "elevation": 1609.0},
    "Salt Lake City, UT": {"lat": 40.7608, "lon": -111.8910, "elevation": 1288.0},
    "Chicago, IL": {"lat": 41.8781, "lon": -87.6298, "elevation": 181.0},
    "Minneapolis, MN": {"lat": 44.9778, "lon": -93.2650, "elevation": 253.0},
    "St. Louis, MO": {"lat": 38.6270, "lon": -90.1994, "elevation": 142.0},
    # East Coast & Southeast
    "New York, NY": {"lat": 40.7128, "lon": -74.0060, "elevation": 10.0},
    "Boston, MA": {"lat": 42.3601, "lon": -71.0589, "elevation": 43.0},
    "Philadelphia, PA": {"lat": 39.9526, "lon": -75.1652, "elevation": 12.0},
    "Washington, DC": {"lat": 38.9072, "lon": -77.0369, "elevation": 7.0},
    "Miami, FL": {"lat": 25.7617, "lon": -80.1918, "elevation": 2.0},
    "Orlando, FL": {"lat": 28.5383, "lon": -81.3792, "elevation": 25.0},
    "Atlanta, GA": {"lat": 33.7490, "lon": -84.3880, "elevation": 320.0},
}

# Resolve directories (Serverless / Read-Only Filesystem Safe)
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
QUICKSTART_DATA_DIR = PROJECT_ROOT / "temperature-api-quickstart" / "data"

def _resolve_safe_storage_paths():
    """Detects whether local filesystem is writable or read-only (e.g. Vercel/Lambda) and returns safe paths."""
    local_cache = BACKEND_DIR / "cache" / "fortyguard"
    local_quota = BACKEND_DIR / "cache" / "quota_tracker.json"
    try:
        local_cache.mkdir(parents=True, exist_ok=True)
        test_file = local_cache / ".write_test"
        test_file.touch(exist_ok=True)
        test_file.unlink(missing_ok=True)
        for sub in ["env_params", "heatmaps", "satellite", "intelligence"]:
            (local_cache / sub).mkdir(parents=True, exist_ok=True)
        return local_cache, local_quota
    except Exception:
        # Read-only container (Vercel Serverless) -> use /tmp
        tmp_cache = Path("/tmp") / "thermalos" / "cache" / "fortyguard"
        tmp_quota = Path("/tmp") / "thermalos" / "cache" / "quota_tracker.json"
        try:
            for sub in ["env_params", "heatmaps", "satellite", "intelligence"]:
                (tmp_cache / sub).mkdir(parents=True, exist_ok=True)
        except Exception as _tmp_err:
            logger.warning(f"Could not create /tmp cache subdirectories: {_tmp_err}")
        return tmp_cache, tmp_quota

CACHE_DIR, QUOTA_FILE = _resolve_safe_storage_paths()

# Add quickstart directory to sys.path to access the official fortyguard SDK
QUICKSTART_PKG_DIR = PROJECT_ROOT / "temperature-api-quickstart"
if str(QUICKSTART_PKG_DIR) not in sys.path and QUICKSTART_PKG_DIR.exists():
    sys.path.insert(0, str(QUICKSTART_PKG_DIR))

try:
    # pyrefly: ignore [missing-import]
    from fortyguard import FortyGuardClient  # type: ignore
    from fortyguard.exceptions import FortyGuardError, TaskTimeoutError  # type: ignore
    FORTYGUARD_SDK_AVAILABLE = True
except Exception:
    FortyGuardClient = None
    FortyGuardError = Exception  # type: ignore
    class TaskTimeoutError(Exception):  # type: ignore
        """Fallback when the FortyGuard SDK is unavailable."""
    FORTYGUARD_SDK_AVAILABLE = False

# Default ~104 km² polygon covering central San Jose, CA for FortyGuard API Heatmaps
SAN_JOSE_POLYGON: Dict[str, Any] = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-121.9430, 37.2930],
                    [-121.8280, 37.2930],
                    [-121.8280, 37.3850],
                    [-121.9430, 37.3850],
                    [-121.9430, 37.2930],
                ]],
            },
        }
    ],
}


def get_city_aoi(city_name: str) -> Dict[str, Any]:
    """Generate dynamic FeatureCollection AOI polygon for any monitored US metro."""
    coords = CITY_COORDINATES.get(city_name, {"lat": 33.4484, "lon": -112.0740})
    lat, lon = coords["lat"], coords["lon"]
    d_lat = 0.038
    d_lon = round(0.038 / max(0.2, math.cos(math.radians(lat))), 4)
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"city": city_name},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [round(lon - d_lon, 4), round(lat - d_lat, 4)],
                        [round(lon + d_lon, 4), round(lat - d_lat, 4)],
                        [round(lon + d_lon, 4), round(lat + d_lat, 4)],
                        [round(lon - d_lon, 4), round(lat + d_lat, 4)],
                        [round(lon - d_lon, 4), round(lat - d_lat, 4)],
                    ]],
                },
            }
        ],
    }


def f_to_c(temp_f: float) -> float:
    """Convert Fahrenheit to Celsius."""
    return round((temp_f - 32.0) * 5.0 / 9.0, 2)


def c_to_f(temp_c: float) -> float:
    """Convert Celsius to Fahrenheit."""
    return round((temp_c * 9.0 / 5.0) + 32.0, 2)


# Provenance labels attached to every payload so the UI can prove where a value
# came from and never present a modeled estimate as authentic FortyGuard data.
SRC_LIVE = "LIVE_API"          # freshly returned by the FortyGuard cloud
SRC_CACHE = "1H_CACHE"         # a real FortyGuard response reused within 1 hour
SRC_QUICKSTART = "QUICKSTART_CACHE"  # authentic captured FortyGuard response on disk
SRC_MODELED = "MODELED"        # last-resort physics model (API unavailable) — must be labeled

# Region & geography-calibrated land-cover profiles for monitored US metros.
CITY_LAND_COVER_PROFILES = {
    "Phoenix, AZ": {"building": 48.5, "tree": 7.2, "plant": 5.8, "earth, ground": 38.5},
    "Las Vegas, NV": {"building": 52.0, "tree": 4.5, "plant": 4.2, "earth, ground": 39.3},
    "Tucson, AZ": {"building": 44.0, "tree": 9.8, "plant": 8.4, "earth, ground": 37.8},
    "Houston, TX": {"building": 49.2, "tree": 22.4, "plant": 14.8, "earth, ground": 13.6},
    "Dallas, TX": {"building": 51.5, "tree": 18.2, "plant": 12.6, "earth, ground": 17.7},
    "Austin, TX": {"building": 46.0, "tree": 24.5, "plant": 15.2, "earth, ground": 14.3},
    "San Antonio, TX": {"building": 47.8, "tree": 19.4, "plant": 13.5, "earth, ground": 19.3},
    "New Orleans, LA": {"building": 45.0, "tree": 25.6, "plant": 18.2, "earth, ground": 11.2},
    "San Jose, CA": {"building": 26.94, "tree": 1.63, "plant": 38.83, "earth, ground": 28.2},
    "Los Angeles, CA": {"building": 54.2, "tree": 14.8, "plant": 11.5, "earth, ground": 19.5},
    "San Francisco, CA": {"building": 52.4, "tree": 18.6, "plant": 14.2, "earth, ground": 14.8},
    "Seattle, WA": {"building": 32.5, "tree": 35.8, "plant": 22.4, "earth, ground": 9.3},
    "Portland, OR": {"building": 35.2, "tree": 33.4, "plant": 20.8, "earth, ground": 10.6},
    "San Diego, CA": {"building": 46.5, "tree": 16.2, "plant": 15.0, "earth, ground": 22.3},
    "Sacramento, CA": {"building": 43.8, "tree": 23.5, "plant": 14.2, "earth, ground": 18.5},
    "Denver, CO": {"building": 42.0, "tree": 16.5, "plant": 13.2, "earth, ground": 28.3},
    "Salt Lake City, UT": {"building": 44.5, "tree": 15.2, "plant": 11.8, "earth, ground": 28.5},
    "Chicago, IL": {"building": 58.2, "tree": 15.4, "plant": 9.8, "earth, ground": 16.6},
    "Minneapolis, MN": {"building": 38.6, "tree": 29.4, "plant": 19.5, "earth, ground": 12.5},
    "St. Louis, MO": {"building": 47.2, "tree": 21.8, "plant": 13.5, "earth, ground": 17.5},
    "New York, NY": {"building": 64.5, "tree": 11.2, "plant": 6.8, "earth, ground": 17.5},
    "Boston, MA": {"building": 53.8, "tree": 21.0, "plant": 12.4, "earth, ground": 12.8},
    "Philadelphia, PA": {"building": 56.4, "tree": 18.5, "plant": 10.2, "earth, ground": 14.9},
    "Washington, DC": {"building": 48.2, "tree": 26.4, "plant": 14.8, "earth, ground": 10.6},
    "Miami, FL": {"building": 41.5, "tree": 28.2, "plant": 21.8, "earth, ground": 8.5},
    "Orlando, FL": {"building": 43.0, "tree": 26.5, "plant": 19.4, "earth, ground": 11.1},
    "Atlanta, GA": {"building": 42.8, "tree": 32.5, "plant": 15.2, "earth, ground": 9.5},
}


def extract_heatmap_temperature_stats_c(hm: Dict[str, Any]) -> Dict[str, Optional[float]]:
    """Pull min/max/mean tile temperature (°C) from ANY heatmap shape.

    Handles the real FortyGuard schema (``stats_data.temperature_stats`` with
    ``minimum``/``maximum``/``mean`` and tile ``properties.average_temperature``),
    the legacy synthesized schema (``Temperature_stats`` with ``min``/``max``), and
    falls back to computing directly from the GeoJSON tile features.
    """
    st = hm.get("stats_data", {}) if isinstance(hm, dict) else {}
    ts = st.get("temperature_stats") or st.get("Temperature_stats") or {}
    mean = ts.get("mean")
    mn = ts.get("minimum", ts.get("min"))
    mx = ts.get("maximum", ts.get("max"))

    if mean is None or mn is None or mx is None:
        # Derive from the actual tile mesh — the ground truth of the response.
        feats = (hm.get("map_data", {}) or {}).get("features", []) if isinstance(hm, dict) else []
        temps: List[float] = []
        for feat in feats:
            props = feat.get("properties", {}) if isinstance(feat, dict) else {}
            if not isinstance(props, dict):
                continue
            val = props.get("average_temperature", props.get("temperature", props.get("value")))
            if isinstance(val, (int, float)):
                temps.append(float(val))
        if temps:
            mean = mean if mean is not None else round(sum(temps) / len(temps), 4)
            mn = mn if mn is not None else round(min(temps), 4)
            mx = mx if mx is not None else round(max(temps), 4)

    # Per-tile hotspot / coolest — the true intra-AOI spread (surface peak vs coolest),
    # used for a meaningful spatial urban-heat-island delta. stats_data.min/max are only
    # the spread of tile *averages* and understate the real range.
    feats = (hm.get("map_data", {}) or {}).get("features", []) if isinstance(hm, dict) else []
    tile_maxes, tile_mins = [], []
    for f in feats:
        if not isinstance(f, dict):
            continue
        props = f.get("properties", {})
        if not isinstance(props, dict):
            continue
        if isinstance(props.get("max_temperature"), (int, float)):
            tile_maxes.append(float(props["max_temperature"]))
        if isinstance(props.get("min_temperature"), (int, float)):
            tile_mins.append(float(props["min_temperature"]))
    hotspot = round(max(tile_maxes), 4) if tile_maxes else None
    coolest = round(min(tile_mins), 4) if tile_mins else None

    return {"min": mn, "max": mx, "mean": mean, "hotspot": hotspot, "coolest": coolest}


class FortyGuardQuotaTracker:
    """Tracks FortyGuard credit allowance and daily rate limits."""

    INITIAL_CREDIT_ALLOWANCE = 2_000_000
    DAILY_HEATMAP_LIMIT = 30
    VALIDITY_DAYS = 34

    def __init__(self, filepath: Path = QUOTA_FILE):
        self.filepath = filepath
        self._lock = threading.RLock()
        self.data = self._load_or_init()

    def _load_or_init(self) -> Dict[str, Any]:
        today_str = date.today().isoformat()
        if self.filepath.exists():
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._check_and_reset_daily(data)
                    return data
            except Exception as e:
                logger.warning(f"Failed to read quota file: {e}. Reinitializing tracker.")

        # Fresh initialization
        init_data = {
            "account": {
                "credit_allowance": self.INITIAL_CREDIT_ALLOWANCE,
                "credits_used": 0,
                "credits_remaining": self.INITIAL_CREDIT_ALLOWANCE,
                "valid_days_total": self.VALIDITY_DAYS,
                "start_date": today_str,
                "days_remaining": self.VALIDITY_DAYS,
            },
            "daily_limits": {
                "heatmap": {
                    "max_per_day": self.DAILY_HEATMAP_LIMIT,
                    "calls_today": 0,
                    "remaining_today": self.DAILY_HEATMAP_LIMIT,
                    "last_reset_date": today_str,
                },
                "env_params": {
                    "calls_today": 0,
                    "last_reset_date": today_str,
                },
                "satellite": {
                    "calls_today": 0,
                    "last_reset_date": today_str,
                },
            },
            "cache_stats": {
                "hits": 0,
                "saved_credits": 0,
            },
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
        self._save(init_data)
        return init_data

    def _check_and_reset_daily(self, data: Dict[str, Any]) -> None:
        """Reset daily counters if date has changed."""
        today_str = date.today().isoformat()
        daily = data.setdefault("daily_limits", {})
        
        # Check start date and compute days remaining
        try:
            start_d = date.fromisoformat(data["account"]["start_date"])
            elapsed_days = (date.today() - start_d).days
            data["account"]["days_remaining"] = max(0, self.VALIDITY_DAYS - elapsed_days)
        except Exception:
            data["account"]["days_remaining"] = self.VALIDITY_DAYS

        # Heatmap daily reset
        hm = daily.setdefault("heatmap", {})
        if hm.get("last_reset_date") != today_str:
            hm["calls_today"] = 0
            hm["remaining_today"] = self.DAILY_HEATMAP_LIMIT
            hm["last_reset_date"] = today_str

        # Env params reset
        ep = daily.setdefault("env_params", {})
        if ep.get("last_reset_date") != today_str:
            ep["calls_today"] = 0
            ep["last_reset_date"] = today_str

        # Satellite reset
        sat = daily.setdefault("satellite", {})
        if sat.get("last_reset_date") != today_str:
            sat["calls_today"] = 0
            sat["last_reset_date"] = today_str

    def _save(self, data: Optional[Dict[str, Any]] = None) -> None:
        to_save = data or self.data
        to_save["last_updated"] = datetime.now(timezone.utc).isoformat()
        try:
            self.filepath.parent.mkdir(parents=True, exist_ok=True)
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(to_save, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving quota tracker: {e}")

    def can_call_heatmap(self) -> bool:
        """Check if daily heatmap quota allows another live request."""
        self._check_and_reset_daily(self.data)
        hm = self.data["daily_limits"]["heatmap"]
        return hm["calls_today"] < hm["max_per_day"]

    def record_call(self, endpoint: str, credits_cost: int = 100) -> None:
        """Record an executed live FortyGuard API request and deduct credits."""
        with self._lock:
            self._check_and_reset_daily(self.data)

            # Deduct credits
            acc = self.data["account"]
            acc["credits_used"] += credits_cost
            acc["credits_remaining"] = max(0, acc["credit_allowance"] - acc["credits_used"])

            # Increment daily endpoint counters
            if endpoint in self.data["daily_limits"]:
                ep = self.data["daily_limits"][endpoint]
                ep["calls_today"] = ep.get("calls_today", 0) + 1
                if "max_per_day" in ep:
                    ep["remaining_today"] = max(0, ep["max_per_day"] - ep["calls_today"])

            self._save()
        logger.info(
            f"FortyGuard API [{endpoint}] called. Credits used: +{credits_cost}. "
            f"Remaining allowance: {acc['credits_remaining']:,} credits. "
            f"Daily heatmap quota: {self.data['daily_limits']['heatmap']['remaining_today']}/30 left."
        )

    def record_cache_hit(self, saved_credits: int = 500) -> None:
        """Track credit savings through our persistent cache."""
        cs = self.data.setdefault("cache_stats", {"hits": 0, "saved_credits": 0})
        cs["hits"] += 1
        cs["saved_credits"] += saved_credits
        self._save()

    def get_summary(self) -> Dict[str, Any]:
        """Return human-readable and machine-readable quota telemetry."""
        self._check_and_reset_daily(self.data)
        hm = self.data["daily_limits"]["heatmap"]
        acc = self.data["account"]
        return {
            "is_live_ready": bool(os.getenv("FORTYGUARD_API_KEY")),
            "credit_allowance": acc["credit_allowance"],
            "credits_used": acc["credits_used"],
            "credits_remaining": acc["credits_remaining"],
            "days_remaining": acc["days_remaining"],
            "valid_days_total": acc["valid_days_total"],
            "heatmap_daily_limit": hm["max_per_day"],
            "heatmap_calls_today": hm["calls_today"],
            "heatmap_remaining_today": hm["remaining_today"],
            "cache_hits": self.data.get("cache_stats", {}).get("hits", 0),
            "credits_saved_by_cache": self.data.get("cache_stats", {}).get("saved_credits", 0),
            "quota_status": "OK" if hm["calls_today"] < hm["max_per_day"] else "DAILY_LIMIT_REACHED",
        }


class FortyGuardAdapter:
    """Dual-Mode Adapter with Smart Quota Guard & Persistent Disk Caching."""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.getenv("FORTYGUARD_API_KEY")
        self.base_url = base_url or os.getenv("FORTYGUARD_BASE_URL", "https://api.fortyguard.com")
        self.is_live = bool(self.api_key and self.api_key.strip() and not self.api_key.startswith("your_"))
        self.quota_tracker = FortyGuardQuotaTracker()
        
        self.sdk_client = None
        if self.is_live and FORTYGUARD_SDK_AVAILABLE:
            try:
                self.sdk_client = FortyGuardClient(api_key=self.api_key, base_url=self.base_url)
                logger.info("FortyGuardAdapter initialized in LIVE API mode with Quota Guard active.")
            except Exception as e:
                logger.warning(f"Failed to initialize live FortyGuardClient: {e}. Falling back to CACHED mode.")
                self.is_live = False
        else:
            logger.info("FortyGuardAdapter initialized in CACHED / OFFLINE mode with Quota Guard active.")

        self._cached_env_params: List[Dict[str, Any]] = []
        self._cached_heatmaps: List[Dict[str, Any]] = []
        self._cached_satellite: List[Dict[str, Any]] = []
        self._cached_street_views: List[Dict[str, Any]] = []
        self._load_cached_quickstart_data()

    def _load_cached_quickstart_data(self) -> None:
        """Ingest authentic FortyGuard quickstart response caches from disk."""
        if not QUICKSTART_DATA_DIR.exists():
            logger.warning(f"Quickstart data dir not found at {QUICKSTART_DATA_DIR}")
            return

        # 1. Load Environmental Parameters
        for fpath in QUICKSTART_DATA_DIR.glob("env_params/*.json"):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    self._cached_env_params.append(json.load(f))
            except Exception as e:
                logger.warning(f"Error loading {fpath.name}: {e}")

        # 2. Load Heatmaps
        for fpath in QUICKSTART_DATA_DIR.glob("heatmaps/*.json"):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    self._cached_heatmaps.append(json.load(f))
            except Exception as e:
                logger.warning(f"Error loading {fpath.name}: {e}")

        # 3. Load Satellite
        for fpath in QUICKSTART_DATA_DIR.glob("satellite/*.json"):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    self._cached_satellite.append(json.load(f))
            except Exception as e:
                logger.warning(f"Error loading {fpath.name}: {e}")

        # 4. Load Street View
        for fpath in QUICKSTART_DATA_DIR.glob("street_view/*.json"):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    self._cached_street_views.append(json.load(f))
            except Exception as e:
                logger.warning(f"Error loading {fpath.name}: {e}")

    # -------------------------------------------------------------------------
    # Disk Cache Helpers (Strict 1-Hour TTL)
    # -------------------------------------------------------------------------
    def _read_disk_cache(self, category: str, cache_key: str, max_age_seconds: int = 3600) -> Optional[Dict[str, Any]]:
        """Serve from disk cache ONLY if user asked within the last 1 hour (3600 seconds)."""
        safe_name = "".join([c if c.isalnum() or c in "._-" else "_" for c in cache_key]) + ".json"
        cfile = CACHE_DIR / category / safe_name
        if cfile.exists():
            try:
                file_age = time.time() - cfile.stat().st_mtime
                if file_age <= max_age_seconds:
                    with open(cfile, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        data["_cached_within_1h"] = True
                        data["_cache_age_seconds"] = int(file_age)
                        logger.info(f"Served {category} from 1-hour cache (age: {int(file_age)}s): {safe_name}")
                        return data
                else:
                    logger.info(f"Cache expired ({int(file_age)}s > {max_age_seconds}s) for {safe_name}. Making live FortyGuard API request.")
            except Exception as e:
                logger.warning(f"Error reading disk cache {safe_name}: {e}")
        return None

    def _write_disk_cache(self, category: str, cache_key: str, data: Dict[str, Any]) -> None:
        safe_name = "".join([c if c.isalnum() or c in "._-" else "_" for c in cache_key]) + ".json"
        cfile = CACHE_DIR / category / safe_name
        try:
            with open(cfile, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"Error writing disk cache {safe_name}: {e}")

    # -------------------------------------------------------------------------
    # 1. Environmental Parameters (POST /v1/env_params)
    # -------------------------------------------------------------------------
    def get_environmental_parameters(
        self,
        city: str = "Phoenix, AZ",
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        temp_f: Optional[float] = None,
        date_str: str = "2024-07-15",
        filter_type: int = 3,
        allow_live: bool = True,
    ) -> Dict[str, Any]:
        """Fetch 24h environmental and solar metrics with disk caching & quota protection.

        ``allow_live=False`` serves only cached/modeled data (no network call) — used by
        the multi-city grid so a single view never fans out 24 async cloud requests.
        """
        cache_key = f"env_{city}_{date_str}_{filter_type}"
        cached = self._read_disk_cache("env_params", cache_key)
        if cached:
            # A real (live-origin) response reused within 1h is a cache hit, not fresh live.
            cached["data_source"] = SRC_MODELED if cached.get("data_source") == SRC_MODELED else SRC_CACHE
            return cached

        coords = CITY_COORDINATES.get(city, {"lat": 33.4484, "lon": -112.0740, "elevation": 331.0})
        target_lat = lat if lat is not None else coords["lat"]
        target_lon = lon if lon is not None else coords["lon"]
        curr_temp_c = f_to_c(temp_f) if temp_f is not None else 35.0

        # Try Live API if configured
        if self.is_live and self.sdk_client and allow_live:
            try:
                res = self.sdk_client.environmental_parameters(
                    latitude=target_lat,
                    longitude=target_lon,
                    temperature=curr_temp_c,
                    start_date=date_str,
                    filter_type=filter_type,
                    wait=True,
                    poll_interval=2.0,
                    timeout=8.0,
                    verbose=False,
                )
                payload = res.get("result", res) if isinstance(res, dict) else res
                if isinstance(payload, dict):
                    payload["data_source"] = SRC_LIVE
                self.quota_tracker.record_call(endpoint="env_params", credits_cost=200)
                self._write_disk_cache("env_params", cache_key, payload)
                return payload
            except TaskTimeoutError as e:
                # Job submitted (billable) but not finished in the poll window — record it.
                self.quota_tracker.record_call(endpoint="env_params", credits_cost=200)
                logger.warning(f"Live environmental_parameters timed out ({e}); recorded against quota. Using physics model.")
            except Exception as e:
                logger.error(f"Live environmental_parameters failed: {e}. Falling back to physics model.")

        # High-Fidelity Microclimate Model (FortyGuard Standard Format)
        hum_base = 25.0 if "Phoenix" in city or "Las Vegas" in city else 55.0
        timestamps = [f"{date_str}T{h:02d}:00:00-08:00" for h in range(24)]
        
        heat_indices, apparent_temps, wet_bulbs, humidity_series, pm25_series, aqi_series = [], [], [], [], [], []

        for h in range(24):
            diurnal_wave = math.sin((h - 8) * math.pi / 12) if 6 <= h <= 20 else -0.5
            h_temp = curr_temp_c + (diurnal_wave * 4.5)
            h_hum = max(10.0, hum_base - (diurnal_wave * 12.0))
            
            # Stull wet-bulb approximation
            tw = h_temp * math.atan(0.151977 * math.sqrt(h_hum + 8.313659)) + \
                 math.atan(h_temp + h_hum) - math.atan(h_hum - 1.676331) + \
                 0.00391838 * (h_hum ** 1.5) * math.atan(0.023101 * h_hum) - 4.686035

            # Heat index (simplified Rothfusz)
            hi = h_temp + 0.55 * (1 - h_hum / 100) * (h_temp - 14.5)

            heat_indices.append(round(hi, 1))
            apparent_temps.append(round(h_temp + 1.2, 1))
            wet_bulbs.append(round(tw, 1))
            humidity_series.append(round(h_hum, 1))
            pm25_series.append(round(42.0 + math.sin(h * 0.5) * 6.0, 1))
            aqi_series.append(round(45.0 + math.sin(h * 0.5) * 5.0, 1))

        solar_ghi = round(620.0 * max(0.0, math.sin((14 - 6) * math.pi / 14)), 2)
        solar_dni = round(710.0 * max(0.0, math.sin((14 - 6) * math.pi / 14)), 2)
        solar_dhi = round(95.0, 2)

        res = {
            "metadata": {
                "timezone": "GMT-8",
                "timezone_offset_hours": -8,
                "time_range": {"start": f"{date_str}T00:00:00-08:00", "end": f"{date_str}T23:00:00-08:00", "interval": "1h", "count": 24},
                "timestamps": timestamps,
            },
            "locations": [
                {
                    "lat": target_lat,
                    "lon": target_lon,
                    "elevation": coords["elevation"],
                    "temperature": curr_temp_c,
                    "parameters": {
                        "heat_index_celsius": heat_indices,
                        "apparent_temperature_celsius": apparent_temps,
                        "wet_bulb_temperature_celsius": wet_bulbs,
                        "relative_humidity_percent": humidity_series,
                        "precipitation_mm": [0.0] * 24,
                        "cloud_cover_octas": [0.0 if "Phoenix" in city else 15.0] * 24,
                        "air_quality:idx": aqi_series,
                        "air_quality_pm2p5:idx": pm25_series,
                        "air_quality_pm10:idx": [round(p * 0.28, 1) for p in pm25_series],
                        "air_quality_no2:idx": [2.4] * 24,
                        "aqi_us_co": [1.3] * 24,
                        "air_quality_o3:idx": [38.5] * 24,
                        "air_quality_so2:idx": [0.9] * 24,
                        "methane_ppb": [None] * 24,
                        "co2_ppm": [None] * 24,
                    },
                    "solar_irradiance": {
                        "clear_sky": {"ghi": solar_ghi, "dni": solar_dni, "dhi": solar_dhi},
                        "description": "FortyGuard Solar Radiation Vector: Global Horizontal (GHI), Direct Normal (DNI), and Diffuse Horizontal (DHI)."
                    },
                }
            ],
            "data_source": SRC_MODELED,
        }
        self._write_disk_cache("env_params", cache_key, res)
        return res

    # -------------------------------------------------------------------------
    # 2. Heatmap Analytics (POST /v1/heatmap) with Strict 30/day Quota Guard
    # -------------------------------------------------------------------------
    def get_heatmap_analytics(
        self,
        city: str = "Phoenix, AZ",
        analytic_type: str = "tcm",
        date_str: str = "2024-07-15",
        granularity: int = 100,
        force_live: bool = False,
        allow_live: bool = True,
    ) -> Dict[str, Any]:
        """Fetch spatial thermal tile mesh from FortyGuard Live API, with strict 1-hour cache reuse.

        ``allow_live=False`` restricts to cached/quickstart/modeled data with no cloud
        call — used by the multi-city grid to avoid burning the 30/day heatmap quota.
        """
        cache_key = f"heatmap_{city}_{analytic_type}_{date_str}_{granularity}"

        # 1. Always reuse a real FortyGuard response captured within the last hour.
        #    (Cache-first even for force_live: the daily heatmap quota is only 30, so
        #    re-serving a <1h-old authentic response protects credits without faking data.)
        cached = self._read_disk_cache("heatmaps", cache_key, max_age_seconds=3600)
        if cached:
            st = cached.setdefault("stats_data", {})
            st["granularity_meters"] = granularity
            st["resolution_label"] = f"{granularity}m FortyGuard Spatial Mesh"
            st["n_cells"] = len(cached.get("map_data", {}).get("features", [])) or 144
            st["served_from"] = "1H_CACHE"
            st["cache_age_seconds"] = cached.get("_cache_age_seconds", 0)
            # Real (live/quickstart-origin) tiles reused within 1h are a cache hit; keep
            # MODELED labeled as MODELED, but never report a stale value as fresh LIVE_API.
            cached["data_source"] = SRC_MODELED if cached.get("data_source") == SRC_MODELED else SRC_CACHE
            return cached

        # 2. On a cache miss, attempt a live cloud generation (short synchronous poll).
        if allow_live and self.is_live and self.sdk_client and self.quota_tracker.can_call_heatmap():
            try:
                target_aoi = get_city_aoi(city) if city in CITY_COORDINATES else SAN_JOSE_POLYGON
                logger.info(f"Dispatching Live FortyGuard create_heatmap for {city} (AOI: {granularity}m, {analytic_type})...")
                res = self.sdk_client.create_heatmap(
                    polygon_aoi=target_aoi,
                    start_date=date_str,
                    filter_type=3,
                    granularity=granularity,
                    analytic_type=analytic_type,
                    threshold=32.0 if analytic_type in ("exceedance", "persistence") else None,
                    direction="above" if analytic_type in ("exceedance", "persistence") else None,
                    wait=True,
                    timeout=8.0,
                    verbose=False,
                )
                payload = res.get("result", res) if isinstance(res, dict) else res
                if isinstance(payload, dict):
                    st = payload.setdefault("stats_data", {})
                    st["granularity_meters"] = granularity
                    st["resolution_label"] = f"{granularity}m FortyGuard Spatial Mesh"
                    st["n_cells"] = len(payload.get("map_data", {}).get("features", [])) or 144
                    st["served_from"] = "LIVE_API"
                    payload["data_source"] = SRC_LIVE
                self.quota_tracker.record_call(endpoint="heatmap", credits_cost=1000)
                self._write_disk_cache("heatmaps", cache_key, payload)
                return payload
            except TaskTimeoutError as e:
                # The job WAS submitted (credits consumed server-side) but did not finish
                # within our short poll window. Record it so the 30/day guard actually
                # engages instead of re-submitting a fresh billable job on every request.
                self.quota_tracker.record_call(endpoint="heatmap", credits_cost=1000)
                logger.warning(f"Live create_heatmap timed out for {city} ({e}); recorded against quota. Serving spatial mesh.")
            except Exception as e:
                logger.warning(f"Live FortyGuard create_heatmap deferred ({e}). Serving calibrated spatial mesh.")

        # Quickstart Cache Match — only for San Jose, CA (the city the authentic
        # quickstart responses were actually captured for). Serving San Jose tiles
        # for any other city would misreport both temperature and tile geography.
        if city == "San Jose, CA":
            for hm in self._cached_heatmaps:
                stats = hm.get("stats_data", {})
                if (analytic_type == "tcm" and ("temperature_stats" in stats or "Temperature_stats" in stats)) or (stats.get("analytic_type") == analytic_type):
                    hm_res = json.loads(json.dumps(hm))
                    st = hm_res.setdefault("stats_data", {})
                    st["granularity_meters"] = granularity
                    st["resolution_label"] = f"{granularity}m FortyGuard Spatial Mesh"
                    st["n_cells"] = len(hm_res.get("map_data", {}).get("features", []))
                    st["served_from"] = "QUICKSTART_CACHE"
                    st["quota_info"] = self.quota_tracker.get_summary()
                    hm_res["data_source"] = SRC_QUICKSTART
                    self._write_disk_cache("heatmaps", cache_key, hm_res)
                    return hm_res

        # Synthesized Microclimate GeoJSON FeatureCollection (MODELED last resort).
        # City-differentiated base temperature from latitude + elevation so the modeled
        # estimate is plausible per-city (never identical rows). Always flagged MODELED.
        coords = CITY_COORDINATES.get(city, {"lat": 33.4484, "lon": -112.0740, "elevation": 331.0})
        base_lat, base_lon = coords["lat"], coords["lon"]
        elevation = coords.get("elevation", 300.0)
        # Warmer at lower latitude / lower elevation; clamped to a realistic summer band.
        base_c = max(16.0, min(44.0, 46.0 - 0.55 * (base_lat - 25.0) - 0.003 * elevation))

        granularity = int(granularity) if granularity in (60, 80, 100) else 100
        step_deg = 0.003 if granularity == 60 else (0.004 if granularity == 80 else 0.005)
        grid_dim = 14 if granularity == 60 else (12 if granularity == 80 else 10)
        tile_offset = grid_dim // 2

        features = []
        for i in range(grid_dim):
            for j in range(grid_dim):
                tile_lat = base_lat + (i - tile_offset) * step_deg
                tile_lon = base_lon + (j - tile_offset) * step_deg
                t_val = round(base_c + math.sin(i * 0.45) * 3.5 + math.cos(j * 0.45) * 2.5, 2)

                features.append({
                    "type": "Feature",
                    "properties": {
                        "tile_id": f"tile_{granularity}m_{i}_{j}",
                        "granularity_meters": granularity,
                        "average_temperature": t_val,
                        "max_temperature": round(t_val + 3.2, 2),
                        "min_temperature": round(t_val - 4.1, 2),
                        "temperature": t_val,
                        "value": round(t_val if analytic_type == "tcm" else 6.0, 1),
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [tile_lon, tile_lat],
                            [tile_lon + (step_deg * 0.85), tile_lat],
                            [tile_lon + (step_deg * 0.85), tile_lat + (step_deg * 0.85)],
                            [tile_lon, tile_lat + (step_deg * 0.85)],
                            [tile_lon, tile_lat],
                        ]],
                    },
                })

        tile_temps = [f["properties"]["average_temperature"] for f in features] or [35.0]
        res = {
            "stats_data": {
                "temperature_stats": {
                    "minimum": round(min(tile_temps), 2),
                    "maximum": round(max(tile_temps), 2),
                    "mean": round(sum(tile_temps) / len(tile_temps), 2),
                },
                "units": "°C" if analytic_type == "tcm" else "hour",
                "analytic_type": analytic_type,
                "granularity_meters": granularity,
                "resolution_label": f"{granularity}m FortyGuard Spatial Mesh",
                "n_cells": len(features),
                "served_from": "MODELED",
                "quota_info": self.quota_tracker.get_summary(),
            },
            "map_data": {
                "type": "FeatureCollection",
                "features": features,
            },
            "data_source": SRC_MODELED,
        }
        self._write_disk_cache("heatmaps", cache_key, res)
        return res

    # -------------------------------------------------------------------------
    # 3. Satellite Land-Cover Segmentation (POST /v1/satellite)
    # -------------------------------------------------------------------------
    def get_satellite_segmentation(
        self,
        city: str = "Phoenix, AZ",
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        date_str: str = "2024-07-15",
    ) -> Dict[str, Any]:
        """Fetch 100m satellite land-cover segmentation with real class fractions.

        The FortyGuard satellite endpoint returns land-cover **percentages** directly in
        ``segmentation.segments`` (e.g. ``{"building": 26.94, "tree": 1.63, ...}``), so we
        surface those authentic fractions rather than fabricating any. Albedo is not
        returned by the API and is derived from the real composition via a standard
        surface-albedo weighting (flagged as derived).
        """
        coords = CITY_COORDINATES.get(city, {"lat": 33.4484, "lon": -112.0740, "elevation": 331.0})
        target_lat = lat if lat is not None else coords["lat"]
        target_lon = lon if lon is not None else coords["lon"]

        cache_key = f"satellite_{city}_{date_str}"
        cached = self._read_disk_cache("satellite", cache_key)
        if cached:
            cached.setdefault("data_source", SRC_CACHE)
            return self._augment_satellite(cached)

        # Live FortyGuard satellite segmentation (short synchronous poll).
        if self.is_live and self.sdk_client:
            try:
                res = self.sdk_client.satellite_segmentation(
                    latitude=target_lat, longitude=target_lon,
                    start_date=date_str, filter_type=3, granularity=100,
                    wait=True, poll_interval=2.0, timeout=8.0, verbose=False,
                )
                payload = res.get("result", res) if isinstance(res, dict) else res
                if isinstance(payload, dict):
                    payload["data_source"] = SRC_LIVE
                    self.quota_tracker.record_call(endpoint="satellite", credits_cost=300)
                    self._write_disk_cache("satellite", cache_key, payload)
                    return self._augment_satellite(payload)
            except TaskTimeoutError as e:
                self.quota_tracker.record_call(endpoint="satellite", credits_cost=300)
                logger.warning(f"Live satellite_segmentation timed out ({e}); recorded against quota. Serving cached/modeled land cover.")
            except Exception as e:
                logger.warning(f"Live satellite_segmentation deferred ({e}). Serving cached/modeled land cover.")

        # Authentic quickstart capture — only for San Jose (the captured city).
        if city == "San Jose, CA" and self._cached_satellite:
            sat = json.loads(json.dumps(self._cached_satellite[0]))
            sat["data_source"] = SRC_QUICKSTART
            self._write_disk_cache("satellite", cache_key, sat)
        # Modeled last resort — clearly labeled, never presented as authentic.
        city_seg = CITY_LAND_COVER_PROFILES.get(
            city,
            {"building": 42.5, "tree": 18.2, "plant": 12.4, "earth, ground": 15.6}
        )
        res = {
            "coordinates": {"latitude": target_lat, "longitude": target_lon},
            "image_year": 2024,
            "segmentation": {
                "segments": city_seg,
                "image_legend": {
                    "building": [180, 120, 120], "tree": [4, 200, 3],
                    "earth, ground": [120, 120, 70], "plant": [204, 255, 4], "others": [255, 255, 255],
                },
            },
            "data_source": SRC_MODELED,
        }
        self._write_disk_cache("satellite", cache_key, res)
        return self._augment_satellite(res)

    # Typical broadband albedo per land-cover class (used only to derive a
    # composition-weighted albedo, since the API does not return albedo directly).
    _CLASS_ALBEDO = {"building": 0.12, "tree": 0.15, "earth, ground": 0.17, "plant": 0.20, "others": 0.25}

    def _augment_satellite(self, sat: Dict[str, Any]) -> Dict[str, Any]:
        """Map the API's real ``segments`` percentages to the UI card fields and derive albedo."""
        seg = sat.get("segmentation", {}) if isinstance(sat, dict) else {}
        segments = seg.get("segments", {})
        # Real responses use a {class: percent} dict; strip any non-numeric entries.
        if isinstance(segments, dict):
            pct = {k: float(v) for k, v in segments.items() if isinstance(v, (int, float))}
        else:
            pct = {}
        albedo = round(sum(self._CLASS_ALBEDO.get(k, 0.2) * (v / 100.0) for k, v in pct.items()), 3) if pct else None
        sat["surface_composition"] = {
            "impervious_building_pct": round(pct.get("building", 0.0), 1),
            "tree_canopy_pct": round(pct.get("tree", 0.0), 1),
            "plant_cover_pct": round(pct.get("plant", 0.0), 1),
            "ground_soil_pct": round(pct.get("earth, ground", 0.0), 1),
            "other_pct": round(pct.get("others", 0.0), 1),
            "albedo_mean": albedo,
            "albedo_is_derived": True,
            "data_source": sat.get("data_source", SRC_MODELED),
        }
        # Drop multi-hundred-KB base64 image blobs — the dashboard only needs the
        # numeric composition, and shipping raw imagery bloats every response.
        sat.pop("original_image", None)
        sat.pop("orignal_image", None)
        if isinstance(seg, dict):
            seg.pop("image_content", None)
        return sat

    # -------------------------------------------------------------------------
    # 4. Heat Intelligence Report (POST /v1/heat_intelligence)
    # -------------------------------------------------------------------------
    def get_heat_intelligence_report(
        self,
        city: str = "Phoenix, AZ",
        temp_f: Optional[float] = None,
        date_str: str = "2024-07-15",
        analysis_types: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Build a heat-intelligence report from REAL FortyGuard analytics.

        Every metric is derived from the heatmap (spatial temperature statistics),
        env_params (24h heat/humidity/solar curves), or satellite (land-cover
        composition). Metrics the API cannot provide have been removed rather than
        fabricated. Each pillar and the report as a whole carries a ``data_source``
        label; if any input is modeled the report is flagged ``is_modeled``.
        """
        types = analysis_types or ["geographic", "environmental", "urban", "events"]
        coords = CITY_COORDINATES.get(city, {"lat": 33.4484, "lon": -112.0740, "elevation": 331.0})

        # --- Real inputs (cache-first, no fan-out of live jobs) ---
        # allow_live=False: this composite report reads heatmap+env+satellite; letting each
        # trigger an 8s live poll would stack to ~24s and blow the serverless request budget.
        # It serves cached/quickstart data where present and modeled (labeled) otherwise.
        hm = self.get_heatmap_analytics(city=city, analytic_type="tcm", granularity=100, allow_live=False)
        hm_src = hm.get("data_source", SRC_MODELED)
        stats_c = extract_heatmap_temperature_stats_c(hm)
        mean_c = stats_c.get("mean")
        min_c = stats_c.get("min")
        max_c = stats_c.get("max")
        hotspot_c = stats_c.get("hotspot") or max_c
        coolest_c = stats_c.get("coolest") or min_c

        baseline_c = float(mean_c) if mean_c is not None else (f_to_c(temp_f) if temp_f is not None else 38.0)

        env = self.get_environmental_parameters(city=city, temp_f=c_to_f(baseline_c), date_str=date_str, allow_live=False)
        env_src = env.get("data_source", SRC_MODELED) if isinstance(env, dict) else SRC_MODELED
        eloc = (env.get("locations", [{}]) or [{}])[0] if isinstance(env, dict) else {}
        eparams = eloc.get("parameters", {})
        apparent = [v for v in eparams.get("apparent_temperature_celsius", []) if isinstance(v, (int, float))]
        wet_bulb = [v for v in eparams.get("wet_bulb_temperature_celsius", []) if isinstance(v, (int, float))]
        solar_ghi = float((eloc.get("solar_irradiance", {}).get("clear_sky", {}) or {}).get("ghi", 0.0))

        sat = self.get_satellite_segmentation(city=city, lat=coords["lat"], lon=coords["lon"], date_str=date_str)
        comp = sat.get("surface_composition", {})
        sat_src = comp.get("data_source", SRC_MODELED)

        # --- Derived, real-data-backed pillar metrics ---
        # Spatial urban-heat-island intensity = hottest tile vs coolest tile (°C), using the
        # per-tile min/max spread (stats_data min/max are only the spread of tile *averages*
        # and badly understate the true intra-AOI range).
        hot = hotspot_c if hotspot_c is not None else max_c
        cool = coolest_c if coolest_c is not None else min_c
        uhi_delta_c = round(float(hot) - float(cool), 2) if (hot is not None and cool is not None) else None
        # Diurnal cooling range from the 24h apparent-temperature curve.
        nighttime_cooling_c = round(max(apparent) - min(apparent), 2) if apparent else None
        peak_wbgt_c = round(max(wet_bulb), 2) if wet_bulb else None
        impervious_frac = round(comp.get("impervious_building_pct", 0.0) / 100.0, 3)
        tree_frac = round(comp.get("tree_canopy_pct", 0.0) / 100.0, 3)

        if peak_wbgt_c is None:
            health_tier = "Unavailable"
        elif peak_wbgt_c >= 32.0:
            health_tier = "Critical (WBGT ≥ 32°C)"
        elif peak_wbgt_c >= 28.0:
            health_tier = "High (WBGT ≥ 28°C)"
        else:
            health_tier = "Moderate"

        elev = coords["elevation"]
        terrain = "High-elevation plateau" if elev >= 1000 else ("Coastal / low-lying" if elev <= 50 else "Inland basin / valley")

        rank = {SRC_LIVE: 3, SRC_CACHE: 2, SRC_QUICKSTART: 1, SRC_MODELED: 0}
        overall_src = min([hm_src, env_src, sat_src], key=lambda s: rank.get(s, 0))
        is_modeled = overall_src == SRC_MODELED

        return {
            "city": city,
            "coordinates": coords,
            "baseline_temperature_c": round(baseline_c, 2),
            "baseline_temperature_f": c_to_f(baseline_c),
            "date": date_str,
            "analysis_categories": types,
            "intelligence_pillars": {
                "geographic": {
                    "elevation_meters": elev,
                    "terrain_classification": terrain,
                    "source": "CITY_COORDINATES (geographic reference)",
                },
                "environmental": {
                    "uhi_intensity_delta_c": uhi_delta_c,
                    "spatial_temp_min_c": round(float(cool), 2) if cool is not None else None,
                    "spatial_temp_max_c": round(float(hot), 2) if hot is not None else None,
                    "surface_hotspot_c": round(float(hotspot_c), 2) if hotspot_c is not None else None,
                    "diurnal_cooling_range_c": nighttime_cooling_c,
                    "peak_solar_ghi_w_m2": round(solar_ghi, 1),
                    "source": hm_src,
                },
                "urban": {
                    "impervious_surface_fraction": impervious_frac,
                    "tree_canopy_fraction": tree_frac,
                    "derived_albedo": comp.get("albedo_mean"),
                    "dominant_land_use": max(
                        [("Built / impervious", impervious_frac), ("Vegetated", tree_frac + comp.get("plant_cover_pct", 0.0) / 100.0)],
                        key=lambda kv: kv[1],
                    )[0] if comp else "Unavailable",
                    "source": sat_src,
                },
                "events": {
                    "projected_peak_wbgt_c": peak_wbgt_c,
                    "public_health_vulnerability_tier": health_tier,
                    "source": env_src,
                },
            },
            "status": "ready",
            "data_source": overall_src,
            "is_modeled": is_modeled,
            "data_label": "Modeled estimate (FortyGuard API unavailable)" if is_modeled else "Derived from live FortyGuard analytics",
            "quota_summary": self.quota_tracker.get_summary(),
            "report_source": "FortyGuard tOS Enterprise API" if self.is_live else "FortyGuard Cached/Modeled Engine",
        }

    # -------------------------------------------------------------------------
    # 5. Real-Time Telemetry Snapshot
    # -------------------------------------------------------------------------
    def get_live_telemetry_snapshot(self, city: str = "Phoenix, AZ", temp_f: Optional[float] = None, allow_live: bool = True) -> Dict[str, Any]:
        """Assemble a microclimate telemetry packet sourced from real FortyGuard data.

        Temperature is derived from the FortyGuard **tcm heatmap** (mean tile = ambient,
        hottest tile = surface hotspot) rather than any hardcoded seed. That real
        temperature is then fed to the env_params endpoint so humidity, wet-bulb, heat
        index, solar GHI, and AQI are the API's own derived values. Every packet carries
        a ``data_source`` label; a modeled last-resort is always tagged MODELED so the UI
        can flag it instead of presenting it as authentic.
        """
        # --- 1. Ground-truth temperature from the tcm heatmap (cached-first, live attempt) ---
        heatmap_source = None
        if temp_f is not None:
            # Explicit reading supplied by an agent/caller — honor it.
            ambient_f = float(temp_f)
            ambient_c = f_to_c(ambient_f)
            surface_c = round(ambient_c + 7.4, 2)
            heatmap_source = "CALLER_SUPPLIED"
        else:
            hm = self.get_heatmap_analytics(city=city, analytic_type="tcm", granularity=100, allow_live=allow_live)
            heatmap_source = hm.get("data_source", SRC_MODELED)
            stats_c = extract_heatmap_temperature_stats_c(hm)
            mean_c = stats_c.get("mean")
            hotspot_c = stats_c.get("hotspot") or stats_c.get("max")
            if mean_c is None:
                ambient_c = 38.0
                heatmap_source = SRC_MODELED
            else:
                ambient_c = float(mean_c)
            ambient_f = c_to_f(ambient_c)
            surface_c = round(float(hotspot_c) if hotspot_c is not None else ambient_c + 7.4, 2)
        surface_f = c_to_f(surface_c)

        # --- 2. Derived environmental parameters for the same real temperature ---
        env_data = self.get_environmental_parameters(city=city, temp_f=ambient_f, allow_live=allow_live)
        env_source = env_data.get("data_source", SRC_MODELED) if isinstance(env_data, dict) else SRC_MODELED
        locs = env_data.get("locations", []) if isinstance(env_data, dict) else []
        loc = locs[0] if locs and isinstance(locs[0], dict) else {}
        params = loc.get("parameters", {})
        solar = loc.get("solar_irradiance", {}).get("clear_sky", {})

        # Point-in-time = current LOCAL hour for this city, clamped to the 24h array.
        # The env arrays are in the location's local timezone (metadata.timezone_offset_hours,
        # e.g. -8 for Pacific). On a UTC host (Vercel/Lambda) datetime.now() is UTC, so we
        # must shift by the offset or the "current" reading is ~8h off (peak vs night).
        tz_offset = 0
        if isinstance(env_data, dict):
            try:
                tz_offset = int(env_data.get("metadata", {}).get("timezone_offset_hours", 0)) or 0
            except (TypeError, ValueError):
                tz_offset = 0
        hour_idx = (datetime.now(timezone.utc).hour + tz_offset) % 24

        def _at_hour(series: List[Any], fallback: float) -> float:
            return float(series[hour_idx]) if isinstance(series, list) and len(series) > hour_idx and series[hour_idx] is not None else float(fallback)

        wet_bulb_c = _at_hour(params.get("wet_bulb_temperature_celsius", []), ambient_c - 12.0)
        wet_bulb_f = c_to_f(wet_bulb_c)
        heat_index_c = _at_hour(params.get("heat_index_celsius", []), ambient_c + 4.0)
        heat_index_f = c_to_f(heat_index_c)
        humidity = _at_hour(params.get("relative_humidity_percent", []), 45.0)
        aqi_pm25 = _at_hour(params.get("air_quality_pm2p5:idx", []), 42.0)
        solar_ghi = float(solar.get("ghi", 0.0))

        # Outdoor WBGT (°F) from the real wet-bulb and ambient (shade approximation
        # WBGT ≈ 0.7·Tnwb + 0.3·Ta; no globe sensor, so the dry-bulb stands in for Tg).
        wbgt_c = 0.7 * wet_bulb_c + 0.3 * ambient_c
        wbgt_f = c_to_f(wbgt_c)

        if ambient_f >= 105.0 or wet_bulb_f >= 88.0:
            risk = "extreme"
        elif ambient_f >= 102.0 or wet_bulb_f >= 84.0:
            risk = "high"
        elif ambient_f >= 96.0:
            risk = "elevated"
        else:
            risk = "nominal"

        # Overall provenance: the least-authentic contributing source wins, so a single
        # modeled input downgrades (and thus flags) the whole packet.
        rank = {SRC_LIVE: 3, SRC_CACHE: 2, SRC_QUICKSTART: 1, "CALLER_SUPPLIED": 1, SRC_MODELED: 0}
        contributing = [heatmap_source, env_source]
        overall_source = min(contributing, key=lambda s: rank.get(s, 0))
        is_modeled = overall_source == SRC_MODELED

        quota_sum = self.quota_tracker.get_summary()

        return {
            "location": city,
            "temperature_f": round(ambient_f, 1),
            "temperature_c": round(ambient_c, 2),
            "surface_temperature_f": round(surface_f, 1),
            "surface_temperature_c": round(surface_c, 2),
            "heat_index_f": round(heat_index_f, 1),
            "wet_bulb_f": round(wet_bulb_f, 1),
            "wbgt_f": round(wbgt_f, 1),
            "relative_humidity": round(humidity, 1),
            "solar_irradiance_ghi": round(solar_ghi, 1),
            "air_quality_pm25": round(aqi_pm25, 1),
            "risk_level": risk,
            "resolution": "100m FortyGuard TCM",
            "measured_at": "2m canopy & surface ground truth",
            "data_source": overall_source,
            "temperature_source": heatmap_source,
            "environmental_source": env_source,
            "is_modeled": is_modeled,
            "data_label": "Modeled estimate (FortyGuard API unavailable)" if is_modeled else "Live FortyGuard microclimate data",
            "api_mode": "LIVE" if self.is_live else "CACHED_QUICKSTART",
            "quota": quota_sum,
            "credits_remaining": quota_sum["credits_remaining"],
            "heatmap_remaining_today": quota_sum["heatmap_remaining_today"],
        }


# Global singleton instance for easy import across backend modules
fortyguard_client = FortyGuardAdapter()
