/**
 * BestTime client for Rounds Layer 2 (foot traffic & peak hours).
 *
 * Two auth patterns:
 *   - Private key -> POST /forecasts (create / refresh full 7-day forecast)
 *   - Public key  -> GET /forecasts/busy (current-day busy hours, safe for client)
 */

const PUB_KEY = process.env.EXPO_PUBLIC_BESTTIME_KEY || 'pub_1d730429f0e7438894c0b8bdbb831120';
const API_BASE = 'https://besttime.app/api/v1';

/**
 * Get current busy-window data for a venue.
 * @param {string} besttimeVenueId
 * @returns {Promise<{ok:boolean, busyHours:number[], peakInfo:object, dayMean:number, dayMax:number}|{ok:boolean, error:string}>}
 */
export async function getBusyWindow(besttimeVenueId) {
  const url = `${API_BASE}/forecasts/busy?api_key_public=${PUB_KEY}&venue_id=${encodeURIComponent(besttimeVenueId)}`;
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.status === 'Error') {
    return { ok: false, error: json.message || `HTTP ${res.status}` };
  }

  const analysis = json.analysis || {};
  return {
    ok: true,
    venueLocalTime: json.venue_info?.venue_current_localtime,
    busyHours: analysis.busy_hours_list || [],
    busyHours12h: analysis.busy_hours_list_12h || [],
    dayMean: analysis.day_info?.day_mean,
    dayMax: analysis.day_info?.day_max,
    dayRankMean: analysis.day_info?.day_rank_mean,
    dayRankMax: analysis.day_info?.day_rank_max,
    peakInfo: analysis.peak_hours?.[0] || null,
  };
}

/**
 * Derive a simple "busyness score" (0–100) for a given hour from cached forecast data.
 * @param {object} venue  — venue object containing `besttimeForecast` (the full analysis array)
 * @param {number} dayInt — 0=Monday … 6=Sunday
 * @param {number} hour   — 0–23
 */
export function getHourlyScore(venue, dayInt, hour) {
  const forecast = venue.besttimeForecast;
  if (!forecast) return null;
  const day = forecast[dayInt];
  if (!day) return null;
  return day.day_raw?.[hour] ?? null;
}

/**
 * Return a human label for an intensity number.
 */
export function intensityLabel(intensityNr) {
  const map = {
    999: 'Closed',
    0: 'Average',
    1: 'Above average',
    2: 'High',
    3: 'Very high',
    4: 'Extreme',
    5: 'Maximum',
  };
  return map[intensityNr] ?? 'Unknown';
}
