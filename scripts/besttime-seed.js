/**
 * Batch-seed BestTime forecasts for all venues in assets/venues.json.
 * Run: node scripts/besttime-seed.js
 *
 * Writes assets/venues-besttime.json with besttimeVenueId attached to each venue.
 * Already-seeded venues are skipped (cached by BestTime, instant 200).
 */
const fs = require('fs');
const path = require('path');

// Load .env (gitignored) without adding a dependency, so the private key
// lives in .env instead of in this tracked file.
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
const DELAY_MS_OK = 1200;   // polite delay after successful API call
const DELAY_MS_FAIL = 100;  // tiny delay after failure to avoid hammering

const inputPath = path.join(__dirname, '..', 'assets', 'venues.json');
const outputPath = path.join(__dirname, '..', 'assets', 'venues-besttime.json');

const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
let quotaExhausted = false;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createForecast(name, address) {
  const url = `${API_BASE}/forecasts?api_key_private=${PRI_KEY}&venue_name=${encodeURIComponent(name)}&venue_address=${encodeURIComponent(address)}`;
  const res = await fetch(url, { method: 'POST' });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (json.status === 'OK') {
      return { ok: true, venueId: json.venue_info.venue_id, venueType: json.venue_info.venue_type };
    }
    return { ok: false, error: typeof json.message === 'string' ? json.message : JSON.stringify(json.message) };
  } catch {
    return { ok: false, error: `HTTP ${res.status}` };
  }
}

async function main() {
  let total = 0;
  let success = 0;
  let fail = 0;

  for (const cityKey of Object.keys(data.cities)) {
    const city = data.cities[cityKey];
    for (const venue of city.venues) {
      total++;
      if (venue.besttimeVenueId) {
        console.log(`[SKIP] ${cityKey} / ${venue.name}`);
        success++;
        continue;
      }

      let result;
      if (quotaExhausted) {
        result = { ok: false, error: 'quota_exhausted (skipped)' };
      } else {
        result = await createForecast(venue.name, venue.address);
      }

      if (result.ok) {
        venue.besttimeVenueId = result.venueId;
        venue.besttimeVenueType = result.venueType;
        console.log(`[OK]   ${cityKey} / ${venue.name} -> ${result.venueId} (${result.venueType})`);
        success++;
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        await sleep(DELAY_MS_OK);
      } else {
        if (String(result.error).toLowerCase().includes('credits are used up') || result.error === 'quota_exhausted') {
          quotaExhausted = true;
        }
        console.log(`[FAIL] ${cityKey} / ${venue.name} -> ${result.error}`);
        fail++;
        await sleep(DELAY_MS_FAIL);
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nDone. Total=${total} Success=${success} Fail=${fail}`);
  console.log(`Output: ${outputPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
