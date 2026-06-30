/**
 * Ingest Overture Maps "places" (which now include Foursquare OS Places) into the
 * app's venue catalog (assets/venues.json), replacing the sparse OSM seed with
 * addressed Boston+Cambridge bars so BestTime forecasts geocode reliably.
 *
 * Requires the duckdb CLI (brew install duckdb). The remote Parquet is read
 * anonymously from Overture's public S3 bucket — no AWS credentials needed.
 *
 *   node scripts/overture-ingest.js              # overwrite assets/venues.json
 *   node scripts/overture-ingest.js --dry-run    # write assets/venues.overture.json instead
 *   node scripts/overture-ingest.js --refresh    # force a fresh S3 pull (ignore cache)
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildCatalog } = require('../lib/overture-ingest');

const OVERTURE_RELEASE = '2026-06-17.0';
const BBOX = { minLng: -71.20, maxLng: -71.00, minLat: 42.30, maxLat: 42.42 };
// City of Boston (incl. its neighborhoods) + Cambridge — beta scope per ADR 007.
const LOCALITIES = [
  'Boston', 'Allston', 'Brighton', 'Charlestown', 'Dorchester', 'East Boston',
  'Jamaica Plain', 'Roslindale', 'Roxbury', 'South Boston', 'Hyde Park',
  'Mattapan', 'West Roxbury', 'Cambridge',
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const refresh = args.has('--refresh');

const cachePath = path.join(os.tmpdir(), `overture-bos-cam-${OVERTURE_RELEASE}.ndjson`);
const outPath = path.join(__dirname, '..', 'assets', dryRun ? 'venues.overture.json' : 'venues.json');

function buildSql() {
  const localityList = LOCALITIES.map((l) => `'${l}'`).join(', ');
  return `
INSTALL httpfs; LOAD httpfs;
SET s3_region='us-west-2';
COPY (
  SELECT
    id,
    names.primary AS name,
    categories.primary AS category,
    categories.alternate AS alt_categories,
    bbox.ymin AS latitude,
    bbox.xmin AS longitude,
    addresses[1].freeform AS street,
    addresses[1].locality AS locality,
    addresses[1].region AS region,
    addresses[1].postcode AS postcode
  FROM read_parquet('s3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}/theme=places/type=place/*', hive_partitioning=1)
  WHERE bbox.xmin BETWEEN ${BBOX.minLng} AND ${BBOX.maxLng}
    AND bbox.ymin BETWEEN ${BBOX.minLat} AND ${BBOX.maxLat}
    AND categories.primary IS NOT NULL
    AND addresses[1].freeform IS NOT NULL AND trim(addresses[1].freeform) <> ''
    AND addresses[1].locality IN (${localityList})
    AND regexp_matches(categories.primary, 'bar|pub|brewery|brewpub|night_club|nightlife|cocktail|lounge|speakeasy|tavern')
    AND NOT regexp_matches(categories.primary, 'barber|barbecue|barbeque|juice|snack|sushi|salad|coffee|cafe|oxygen|nail|kava|milk|smoothie|cereal')
    AND NOT regexp_matches(lower(names.primary), 'paint|art studio|residence hall|dining hall|dormitory|student cent|food court|cafeteria')
) TO '${cachePath}' (FORMAT JSON);
`;
}

function pull() {
  console.log(`Pulling Overture ${OVERTURE_RELEASE} places for Boston+Cambridge bars (remote S3, ~1 min)…`);
  execFileSync('duckdb', ['-c', buildSql()], { stdio: ['ignore', 'inherit', 'inherit'] });
}

function loadRows() {
  if (refresh || !fs.existsSync(cachePath)) pull();
  else console.log(`Using cached pull: ${cachePath}  (pass --refresh to re-pull)`);
  const text = fs.readFileSync(cachePath, 'utf-8').trim();
  return text ? text.split('\n').map((line) => JSON.parse(line)) : [];
}

function summarize(catalog) {
  const cohortCounts = {};
  let withAddr = 0;
  let total = 0;
  for (const cityKey of Object.keys(catalog.cities)) {
    for (const v of catalog.cities[cityKey].venues) {
      total += 1;
      cohortCounts[v.cohort] = (cohortCounts[v.cohort] || 0) + 1;
      if (v.address && v.address.trim()) withAddr += 1;
    }
  }
  return { total, withAddr, cohortCounts };
}

function main() {
  const rows = loadRows();
  const catalog = buildCatalog(rows, { generatedAt: new Date().toISOString() });
  const { total, withAddr, cohortCounts } = summarize(catalog);

  fs.writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`);

  const pct = total ? ((100 * withAddr) / total).toFixed(1) : '0';
  console.log(`\nRows pulled:         ${rows.length}`);
  console.log(`Venues kept:         ${total}  (boston=${catalog.cities.boston.venues.length}, cambridge=${catalog.cities.cambridge.venues.length})`);
  console.log(`With street address: ${withAddr}/${total}  (${pct}%)`);
  console.log(`By cohort:           ${JSON.stringify(cohortCounts)}`);
  console.log(`\nWrote: ${outPath}${dryRun ? '  (dry run — assets/venues.json untouched)' : ''}`);
}

main();
