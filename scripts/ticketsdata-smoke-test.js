/**
 * TicketsData Layer 4 smoke test.
 *
 * Usage:
 *   TICKETSDATA_USERNAME=xxx TICKETSDATA_PASSWORD=xxx node scripts/ticketsdata-smoke-test.js <platform> <event_url>
 *   TICKETSDATA_USERNAME=xxx TICKETSDATA_PASSWORD=xxx node scripts/ticketsdata-smoke-test.js ticketmaster "https://www.ticketmaster.com/..."
 *
 * Also tests /events if a second arg looks like a performer URL.
 */

const { fetchEventInventory, fetchPerformerEvents, createTicketsDataClient } = require('../lib/ticketsdata');

const username = process.env.TICKETSDATA_USERNAME;
const password = process.env.TICKETSDATA_PASSWORD;

async function main() {
  if (!username || !password) {
    console.error('Set TICKETSDATA_USERNAME and TICKETSDATA_PASSWORD env vars.');
    process.exit(1);
  }

  const platform = process.argv[2];
  const url = process.argv[3];

  if (!platform || !url) {
    console.error('Usage: node scripts/ticketsdata-smoke-test.js <platform> <event_url>');
    process.exit(1);
  }

  console.log('=== TicketsData Layer 4 Smoke Test ===\n');

  console.log(`[1] GET /fetch — platform=${platform}`);
  const inv = await fetchEventInventory(username, password, platform, url);
  if (inv.ok) {
    console.log('  → OK');
    console.log(JSON.stringify(inv.data, null, 2).slice(0, 2000));
  } else {
    console.log(`  → FAIL: ${inv.error}`);
  }

  // If URL contains "/artist/" or "/dj/" treat as performer test
  if (/\/(artist|dj|performer)\//i.test(url)) {
    console.log(`\n[2] GET /events — performer_url`);
    const ev = await fetchPerformerEvents(username, password, url);
    if (ev.ok) {
      console.log('  → OK');
      console.log(JSON.stringify(ev.data, null, 2).slice(0, 2000));
    } else {
      console.log(`  → FAIL: ${ev.error}`);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
