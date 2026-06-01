const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error('Set GOOGLE_PLACES_API_KEY env var');
  process.exit(1);
}

const CITIES = {
  nyc: { name: 'New York', lat: 40.7282, lng: -73.9942 },
  boston: { name: 'Boston', lat: 42.3601, lng: -71.0589 },
  chicago: { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  sf: { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
};

const COHORTS = [
  {
    key: 'cocktail_bar',
    includedTypes: ['cocktail_bar'],
  },
  {
    key: 'wine_bar',
    includedTypes: ['wine_bar'],
  },
  {
    key: 'sports_bar',
    includedTypes: ['sports_bar'],
  },
  {
    key: 'pub',
    includedTypes: ['pub'],
  },
  {
    key: 'night_club',
    includedTypes: ['night_club'],
  },
  {
    key: 'dive_bar',
    includedTypes: ['bar'],
    excludedTypes: ['cocktail_bar', 'wine_bar', 'restaurant', 'cafe', 'night_club', 'pub'],
  },
];

const FIELD_MASK = 'places.id,places.displayName,places.types,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function searchNearby(lat, lng, radius, includedTypes, excludedTypes) {
  const body = {
    maxResultCount: 15,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
    includedTypes,
  };
  if (excludedTypes && excludedTypes.length > 0) {
    body.excludedTypes = excludedTypes;
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places:searchNearby?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.places || [];
}

function normalizeVenue(raw, cohortKey) {
  const types = raw.types || [];
  return {
    id: raw.id,
    name: raw.displayName?.text || 'Unknown',
    cohort: cohortKey,
    types,
    location: raw.location || null,
    address: raw.formattedAddress || null,
    rating: raw.rating ?? null,
    userRatingCount: raw.userRatingCount ?? null,
    priceLevel: raw.priceLevel || null,
    photos: (raw.photos || []).slice(0, 3).map(p => ({
      name: p.name,
      widthPx: p.widthPx,
      heightPx: p.heightPx,
    })),
    hours: raw.currentOpeningHours
      ? {
          openNow: raw.currentOpeningHours.openNow ?? null,
          weekdayDescriptions: raw.currentOpeningHours.weekdayDescriptions || null,
        }
      : null,
  };
}

async function main() {
  const output = { cities: {} };

  for (const [cityKey, city] of Object.entries(CITIES)) {
    console.log(`\n=== ${city.name} ===`);
    const seen = new Map();

    for (const cohort of COHORTS) {
      console.log(`  Fetching ${cohort.key}...`);
      try {
        const places = await searchNearby(
          city.lat,
          city.lng,
          2000,
          cohort.includedTypes,
          cohort.excludedTypes
        );
        console.log(`    Got ${places.length} places`);

        for (const p of places) {
          if (!seen.has(p.id)) {
            seen.set(p.id, normalizeVenue(p, cohort.key));
          }
        }
      } catch (err) {
        console.error(`    ERROR: ${err.message}`);
      }

      await sleep(300); // gentle rate limit
    }

    const venues = Array.from(seen.values());
    console.log(`  Total unique venues: ${venues.length}`);
    output.cities[cityKey] = {
      name: city.name,
      lat: city.lat,
      lng: city.lng,
      venues,
    };
  }

  const outPath = path.join(__dirname, '..', 'assets', 'venues.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
