/**
 * Backfill BestTime forecasts for venues in assets/venues.json.
 *   node scripts/besttime-seed.js              # seed every un-seeded venue
 *   node scripts/besttime-seed.js --limit 12   # seed at most 12 new venues (test batch)
 *
 * Writes the enrichment BACK INTO assets/venues.json (the file the app reads) —
 * attaching `besttimeVenueId`, `besttimeVenueType`, and a compact `besttimeForecast`
 * (the day_raw arrays lib/besttime.js getHourlyScore reads). Venues that BestTime
 * can't forecast (too low-volume) are marked `besttimeUnforecastable` so re-runs
 * don't pay to re-attempt them. Re-runs are idempotent and resume after interruption.
 *
 * The private key is read from .env (gitignored), never hardcoded.
 */
const fs = require('fs');
const path = require('path');

// Load .env (gitignored) without adding a dependency.
try {
  const envPath = path.join(__dirname, '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env present — fall back to the real environment */ }

const PRI_KEY = process.env.BESTTIME_PRIVATE_KEY;
if (!PRI_KEY) {
  console.error('Missing BESTTIME_PRIVATE_KEY — add it to .env (gitignored) or export it before running.');
  process.exit(1);
}

const API_BASE = 'https://besttime.app/api/v1';
const DELAY_MS_OK = 1200;   // polite delay after a successful (billed) call
const DELAY_MS_FAIL = 100;  // tiny delay after a failure

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

// Reconnect: read and write the SAME file the app consumes.
const catalogPath = path.join(__dirname, '..', 'assets', 'venues.json');
const data = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
let quotaExhausted = false;

function save() {
  fs.writeFileSync(catalogPath, `${JSON.stringify(data, null, 2)}\n`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Keep only what lib/besttime.js getHourlyScore needs (day_raw[hour]); the full
// analysis is ~14 KB/venue, this compact form ~0.7 KB.
function compactForecast(analysis) {
  return (analysis || []).map((d) => ({ day_int: d.day_info && d.day_info.day_int, day_raw: d.day_raw }));
}

async function createForecast(name, address) {
  const url = `${API_BASE}/forecasts?api_key_private=${PRI_KEY}&venue_name=${encodeURIComponent(name)}&venue_address=${encodeURIComponent(address)}`;
  const res = await fetch(url, { method: 'POST' });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json.status === 'OK') {
      return {
        ok: true,
        venueId: json.venue_info.venue_id,
        venueType: json.venue_info.venue_type,
        forecast: compactForecast(json.analysis),
      };
    }
    return { ok: false, error: typeof json.message === 'string' ? json.message : JSON.stringify(json.message) };
  } catch {
    return { ok: false, error: `HTTP ${res.status}` };
  }
}

async function main() {
  let total = 0;
  let seeded = 0;
  let attempted = 0;
  let unforecastable = 0;
  let fail = 0;

  outer:
  for (const cityKey of Object.keys(data.cities)) {
    for (const venue of data.cities[cityKey].venues) {
      total++;
      if (venue.besttimeVenueId || venue.besttimeUnforecastable) continue; // idempotent

      if (attempted >= LIMIT || quotaExhausted) break outer;
      attempted++;

      const result = await createForecast(venue.name, venue.address);
      if (result.ok) {
        venue.besttimeVenueId = result.venueId;
        venue.besttimeVenueType = result.venueType;
        venue.besttimeForecast = result.forecast;
        seeded++;
        console.log(`[OK]   ${cityKey} / ${venue.name} -> ${result.venueId} (${result.venueType})`);
        save();
        await sleep(DELAY_MS_OK);
      } else {
        const err = String(result.error).toLowerCase();
        if (err.includes('credits are used up')) {
          quotaExhausted = true;
        } else if (err.includes('could not forecast')) {
          venue.besttimeUnforecastable = true; // low volume — don't re-attempt next run
          unforecastable++;
          save();
        }
        console.log(`[FAIL] ${cityKey} / ${venue.name} -> ${result.error}`);
        fail++;
        await sleep(DELAY_MS_FAIL);
      }
    }
  }

  save();
  console.log(`\nDone. Scanned=${total} Seeded=${seeded} Unforecastable=${unforecastable} Failed=${fail}${quotaExhausted ? ' (stopped: credits used up)' : ''}`);
  console.log(`Wrote enrichment back into: ${catalogPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
