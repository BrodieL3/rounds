import { writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
] as const;
const OVERPASS_TIMEOUT_SECONDS = 60;
const FETCH_TIMEOUT_MS = 75_000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2_000;
const VENUES_PATH = path.resolve(import.meta.dir, '../assets/venues.json');
const TMP_VENUES_PATH = `${VENUES_PATH}.tmp`;

const BOSTON = {
  key: 'boston',
  name: 'Boston',
  lat: 42.3601,
  lng: -71.0589,
  bbox: { south: 42.227, west: -71.191, north: 42.397, east: -70.986 },
} as const;

const CAMBRIDGE = {
  key: 'cambridge',
  name: 'Cambridge',
  lat: 42.3736,
  lng: -71.1097,
  bbox: { south: 42.352, west: -71.16, north: 42.404, east: -71.064 },
} as const;

const CITIES = [BOSTON, CAMBRIDGE] as const;
const AMENITIES = ['bar', 'pub', 'nightclub'] as const;
const COHORTS = ['cocktail_bar', 'wine_bar', 'sports_bar', 'pub', 'night_club', 'dive_bar'] as const;

type OsmType = 'node' | 'way' | 'relation';
type CityKey = (typeof CITIES)[number]['key'];
type Cohort = (typeof COHORTS)[number];
type CohortConfidence = 'high' | 'low';

type OsmElement = {
  type: OsmType;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type Venue = {
  id: string;
  name: string;
  cohort: Cohort;
  city: CityKey;
  address: string;
  latitude: number;
  longitude: number;
  location: { latitude: number; longitude: number };
  types: string[];
  source: 'openstreetmap';
  osmType: OsmType;
  osmId: number;
  cohortConfidence: CohortConfidence;
};

type DroppedCounts = {
  noName: number;
  noCoords: number;
  duplicate: number;
  outsideCity: number;
};

type LowConfidence = {
  name: string;
  city: CityKey;
  cohort: Cohort;
  reason: string;
};

const query = `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];
(
${CITIES.flatMap((city) =>
  AMENITIES.map((amenity) =>
    `  nwr["amenity"="${amenity}"](${city.bbox.south},${city.bbox.west},${city.bbox.north},${city.bbox.east});`
  )
).join('\n')}
);
out center tags;`;

class OverpassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OverpassError';
  }
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOverpass(endpoint: string): Promise<OsmElement[]> {
  const body = new URLSearchParams({ data: query });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'user-agent': 'Rounds venue seed script (https://github.com/earendil-works/rounds; OSM ODbL attribution)',
    },
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const text = await response.text();

  if (!response.ok) {
    throw new OverpassError(
      `Overpass HTTP ${response.status} from ${endpoint}. Body: ${text.slice(0, 500)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new OverpassError(
      `Overpass JSON parse failed from ${endpoint} (HTTP ${response.status}): ${(error as Error).message}. Body: ${text.slice(0, 500)}`
    );
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { elements?: unknown }).elements)) {
    throw new OverpassError(`Overpass response missing elements[] from ${endpoint} (HTTP ${response.status}). Body: ${text.slice(0, 500)}`);
  }

  return (parsed as { elements: OsmElement[] }).elements;
}

async function fetchWithRetries(): Promise<{ endpoint: string; elements: OsmElement[] }> {
  const errors: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        console.log(`Overpass attempt ${attempt}/${MAX_ATTEMPTS}: ${endpoint}`);
        return { endpoint, elements: await fetchOverpass(endpoint) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`[attempt ${attempt}] ${endpoint}: ${message}`);
        console.warn(`Overpass fetch failed: ${message}`);
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  throw new OverpassError(`Overpass failed after ${MAX_ATTEMPTS} attempts.\n${errors.join('\n')}`);
}

function coordsFor(element: OsmElement) {
  const latitude = element.type === 'node' ? element.lat : element.center?.lat;
  const longitude = element.type === 'node' ? element.lon : element.center?.lon;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude: Number(latitude), longitude: Number(longitude) };
}

function inBbox(latitude: number, longitude: number, bbox: (typeof BOSTON)['bbox']) {
  return latitude >= bbox.south && latitude <= bbox.north && longitude >= bbox.west && longitude <= bbox.east;
}

function distanceSquared(latitude: number, longitude: number, city: typeof BOSTON | typeof CAMBRIDGE) {
  return (latitude - city.lat) ** 2 + (longitude - city.lng) ** 2;
}

function assignCity(latitude: number, longitude: number): CityKey | null {
  const matches = CITIES.filter((city) => inBbox(latitude, longitude, city.bbox));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].key;

  // Boston and Cambridge bboxes overlap near the Charles; assign overlap points to nearest city center.
  return matches
    .slice()
    .sort((a, b) => distanceSquared(latitude, longitude, a) - distanceSquared(latitude, longitude, b))[0].key;
}

function cleanText(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeComparableText(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasAnyText(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function hasTag(tags: Record<string, string>, key: string, value?: string) {
  if (!(key in tags)) return false;
  return value === undefined || cleanText(tags[key]).toLowerCase() === value;
}

function mapCohort(tags: Record<string, string>, name: string): { cohort: Cohort; confidence: CohortConfidence; reason: string } {
  const amenity = cleanText(tags.amenity).toLowerCase();
  const bar = cleanText(tags.bar).toLowerCase();
  const searchable = normalizeComparableText(`${name} ${tags.description ?? ''}`);

  // Deterministic cohort heuristic, strongest signals first:
  // explicit nightclub amenity, explicit drink/bar tags, then name/description guesses.
  // Bare amenity=bar has no reliable OSM subtype; default it to cocktail_bar with low confidence so owners can re-bucket flagged records.
  if (amenity === 'nightclub') return { cohort: 'night_club', confidence: 'high', reason: 'amenity=nightclub' };

  if (hasTag(tags, 'drink:cocktails', 'yes') || bar === 'cocktail') {
    return { cohort: 'cocktail_bar', confidence: 'high', reason: 'explicit cocktail tag' };
  }
  if (hasAnyText(searchable, ['cocktail', 'lounge', 'speakeasy', 'mixology'])) {
    return { cohort: 'cocktail_bar', confidence: 'low', reason: 'name/description cocktail signal' };
  }

  if (hasTag(tags, 'drink:wine', 'yes') || bar === 'wine') {
    return { cohort: 'wine_bar', confidence: 'high', reason: 'explicit wine tag' };
  }
  if (hasAnyText(searchable, ['wine', 'vino', 'enoteca'])) {
    return { cohort: 'wine_bar', confidence: 'low', reason: 'name/description wine signal' };
  }

  if (hasTag(tags, 'sport') || (hasTag(tags, 'tv', 'yes') && amenity === 'bar')) {
    return { cohort: 'sports_bar', confidence: 'high', reason: 'sports/tv tag signal' };
  }
  if (hasAnyText(searchable, ['sports', 'sportsbar', 'tavern grill', 'tavern and grill'])) {
    return { cohort: 'sports_bar', confidence: 'low', reason: 'name sports signal' };
  }

  if (hasAnyText(searchable, ['dive'])) {
    return { cohort: 'dive_bar', confidence: 'low', reason: 'name dive signal' };
  }

  if (amenity === 'pub') return { cohort: 'pub', confidence: 'high', reason: 'amenity=pub' };

  return { cohort: 'cocktail_bar', confidence: 'low', reason: 'bare amenity=bar default' };
}

function buildAddress(tags: Record<string, string>) {
  const streetLine = [cleanText(tags['addr:housenumber']), cleanText(tags['addr:street'])].filter(Boolean).join(' ');
  const city = cleanText(tags['addr:city']);
  const state = cleanText(tags['addr:state']);
  const postcode = cleanText(tags['addr:postcode']);
  const locality = [city, state, postcode].filter(Boolean).join(' ');
  return [streetLine, locality].filter(Boolean).join(', ');
}

function buildTypes(tags: Record<string, string>) {
  const keys = ['amenity', 'bar', 'cuisine', 'drink:cocktails', 'drink:wine', 'sport', 'tv'];
  return keys
    .filter((key) => cleanText(tags[key]))
    .map((key) => `${key}:${cleanText(tags[key]).toLowerCase()}`)
    .sort();
}

function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function dedupeKey(name: string, latitude: number, longitude: number) {
  // Physical duplicate rule: same normalized name and coordinates rounded to 4 decimals (~11m) collapse to one venue.
  // This catches venues mapped both as a POI node and a building way while keeping nearby distinct venues separate.
  return `${normalizeComparableText(name)}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
}

function identityRank(type: OsmType) {
  return type === 'node' ? 0 : type === 'way' ? 1 : 2;
}

function preferVenue(a: Venue, b: Venue) {
  const byType = identityRank(a.osmType) - identityRank(b.osmType);
  if (byType !== 0) return byType <= 0 ? a : b;
  return a.id <= b.id ? a : b;
}

function normalizeElements(elements: OsmElement[]) {
  const dropped: DroppedCounts = { noName: 0, noCoords: 0, duplicate: 0, outsideCity: 0 };
  const lowConfidence: LowConfidence[] = [];
  const byDedupeKey = new Map<string, Venue>();

  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = cleanText(tags.name);
    if (!name) {
      dropped.noName += 1;
      continue;
    }

    const coords = coordsFor(element);
    if (!coords) {
      dropped.noCoords += 1;
      continue;
    }

    const latitude = roundCoordinate(coords.latitude);
    const longitude = roundCoordinate(coords.longitude);
    const city = assignCity(latitude, longitude);
    if (!city) {
      dropped.outsideCity += 1;
      continue;
    }

    const cohort = mapCohort(tags, name);
    const venue: Venue = {
      id: `osm:${element.type}/${element.id}`,
      name,
      cohort: cohort.cohort,
      city,
      address: buildAddress(tags),
      latitude,
      longitude,
      location: { latitude, longitude },
      types: buildTypes(tags),
      source: 'openstreetmap',
      osmType: element.type,
      osmId: element.id,
      cohortConfidence: cohort.confidence,
    };

    const key = dedupeKey(name, latitude, longitude);
    const existing = byDedupeKey.get(key);
    if (existing) {
      byDedupeKey.set(key, preferVenue(existing, venue));
      dropped.duplicate += 1;
    } else {
      byDedupeKey.set(key, venue);
    }
  }

  const venues = Array.from(byDedupeKey.values()).sort((a, b) => a.id.localeCompare(b.id));
  for (const venue of venues) {
    if (venue.cohortConfidence === 'low') {
      const element = elements.find((candidate) => `osm:${candidate.type}/${candidate.id}` === venue.id);
      const reason = element ? mapCohort(element.tags ?? {}, venue.name).reason : 'low-confidence heuristic';
      lowConfidence.push({ name: venue.name, city: venue.city, cohort: venue.cohort, reason });
    }
  }

  const bostonVenues = venues.filter((venue) => venue.city === 'boston');
  const cambridgeVenues = venues.filter((venue) => venue.city === 'cambridge');

  return {
    seed: {
      attribution: '© OpenStreetMap contributors, ODbL. https://www.openstreetmap.org/copyright',
      source: 'openstreetmap-overpass',
      license: 'ODbL',
      cities: {
        boston: {
          name: BOSTON.name,
          lat: BOSTON.lat,
          lng: BOSTON.lng,
          venues: bostonVenues,
        },
        cambridge: {
          name: CAMBRIDGE.name,
          lat: CAMBRIDGE.lat,
          lng: CAMBRIDGE.lng,
          venues: cambridgeVenues,
        },
      },
    },
    dropped,
    lowConfidence: lowConfidence.sort((a, b) => `${a.city}:${a.name}`.localeCompare(`${b.city}:${b.name}`)),
  };
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<T, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

function printSummary(args: {
  endpoint: string;
  rawCount: number;
  seed: ReturnType<typeof normalizeElements>['seed'];
  dropped: DroppedCounts;
  lowConfidence: LowConfidence[];
}) {
  const { endpoint, rawCount, seed, dropped, lowConfidence } = args;
  const venues = [...seed.cities.boston.venues, ...seed.cities.cambridge.venues];
  const cohortDistribution = countBy(venues.map((venue) => venue.cohort));

  console.log('\nOSM venue seed complete');
  console.log(`Source endpoint: ${endpoint}`);
  console.log(`Raw Overpass elements: ${rawCount}`);
  console.log(`Written file: ${VENUES_PATH}`);
  console.log(`City counts: boston=${seed.cities.boston.venues.length}, cambridge=${seed.cities.cambridge.venues.length}, total=${venues.length}`);
  console.log(`Dropped: noName=${dropped.noName}, noCoords=${dropped.noCoords}, duplicate=${dropped.duplicate}, outsideCity=${dropped.outsideCity}`);
  console.log(`Cohort distribution: ${JSON.stringify(cohortDistribution)}`);

  console.log('\nLow-confidence cohort guesses:');
  if (lowConfidence.length === 0) {
    console.log('  none');
  } else {
    for (const item of lowConfidence) {
      console.log(`  - ${item.name} (${item.city}) -> ${item.cohort}: ${item.reason}`);
    }
  }
}

async function main() {
  const { endpoint, elements } = await fetchWithRetries();
  const { seed, dropped, lowConfidence } = normalizeElements(elements);
  const totalVenues = seed.cities.boston.venues.length + seed.cities.cambridge.venues.length;

  if (totalVenues < 50) {
    throw new Error(`Expected at least 50 normalized venues, got ${totalVenues}. Refusing to overwrite ${VENUES_PATH}.`);
  }

  const json = `${JSON.stringify(seed, null, 2)}\n`;
  await writeFile(TMP_VENUES_PATH, json, 'utf8');
  await rename(TMP_VENUES_PATH, VENUES_PATH);
  printSummary({ endpoint, rawCount: elements.length, seed, dropped, lowConfidence });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
