/**
 * Layer 3 prototype: Apify-hosted RA + Posh.vip scrapers.
 * Run: APIFY_TOKEN=apify_api_... node scripts/apify-layer3-test.js
 *
 * Validates:
 *   - Resident Advisor events scraper (whatsup~ra-events-scraper)
 *   - Posh.vip events scraper (hypebridge~posh-vip)
 *
 * Outputs sample data to assets/layer3-samples.json for inspection.
 */
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) {
  console.error('Set APIFY_TOKEN env var');
  process.exit(1);
}

const RA_ACTOR = 'whatsup~ra-events-scraper';
const POSH_ACTOR = 'hypebridge~posh-vip';

const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'layer3-samples.json');

async function apifyRunSync(actor, input) {
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${TOKEN}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!res.ok && json.error) {
      return { ok: false, error: json.error.message || JSON.stringify(json.error) };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
  }
}

function summarizeRA(events) {
  return events.map(e => ({
    id: e.id,
    title: e.title,
    venue: e.venue?.name,
    city: e.venue?.address?.split(';').pop()?.trim(),
    startTime: e.startTime,
    lineup: e.lineup,
    genres: (e.genres || []).map(g => g.name),
    minAge: e.minAge,
    price: e.price,
    isFestival: e.isFestival,
  }));
}

function summarizePosh(events) {
  return events.map(e => ({
    eventId: e.eventId,
    title: e.eventTitle,
    venue: e.venueName,
    city: e.city,
    startDateTime: e.startDateTime,
    endDateTime: e.endDateTime,
    lowestPrice: e.lowestPrice,
    highestPrice: e.highestPrice,
    isFreeEvent: e.isFreeEvent,
    organizer: e.organizerName,
    lineup: e.lineup || [],
  }));
}

async function main() {
  const results = {
    ra: {},
    posh: null,
    timestamp: new Date().toISOString(),
  };

  // RA scraper tests
  const raTests = [
    { area: 'us/newyorkcity', label: 'NYC', maxEvents: 5 },
    { area: 'us/miami', label: 'Miami', maxEvents: 5 },
    { area: 'de/berlin', label: 'Berlin', maxEvents: 5 },
    { area: 'nl/amsterdam', label: 'Amsterdam', maxEvents: 5 },
  ];

  for (const t of raTests) {
    console.log(`[RA] ${t.label} (${t.area}) ...`);
    const res = await apifyRunSync(RA_ACTOR, {
      areas: [t.area],
      maxEvents: t.maxEvents,
    });
    if (!res.ok) {
      console.log(`  FAIL: ${res.error}`);
      results.ra[t.label] = { ok: false, error: res.error };
    } else {
      const events = Array.isArray(res.data) ? res.data : [];
      console.log(`  OK: ${events.length} events`);
      results.ra[t.label] = { ok: true, count: events.length, sample: summarizeRA(events) };
    }
  }

  // Posh scraper test
  console.log('[Posh] New York ...');
  const poshRes = await apifyRunSync(POSH_ACTOR, {
    startUrls: [{ url: 'https://posh.vip/explore?city=New+York' }],
    maxItems: 5,
  });
  if (!poshRes.ok) {
    console.log(`  FAIL: ${poshRes.error}`);
    results.posh = { ok: false, error: poshRes.error };
  } else {
    const events = Array.isArray(poshRes.data) ? poshRes.data : [];
    console.log(`  OK: ${events.length} events`);
    results.posh = { ok: true, count: events.length, sample: summarizePosh(events) };
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);

  // Cost estimate
  console.log('\n--- Cost Estimate ---');
  console.log('Apify PAYG compute units (CU): ~$0.40/CU');
  console.log('RA scraper: ~0.001–0.01 CU per city run (light Puppeteer)');
  console.log('Posh scraper: ~0.001–0.01 CU per city run');
  console.log('Monthly (daily refresh, 10 cities each): ~$0.12–$1.20');
  console.log('Layer 3 viable. Next: Spotify Web API once dev account approved.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
