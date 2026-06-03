STATUS: ACTIVE — agents must read before touching event discovery APIs or scraper strategy.

# ADR 002: Eventbrite + Alternative Event API Assessment

## Goal
Determine if Eventbrite API or other free event APIs can replace Apify-hosted RA/Posh scrapers for Layer 3 event discovery.

## Tested APIs

### Eventbrite API v3
**Key:** `TIMV5VAGMIFJDEFGIQCI` (verified working for auth)

| Endpoint | Result | Usable? |
|---|---|---|
| `GET /v3/users/me/` | ✅ Returns user profile | Yes |
| `GET /v3/categories/` | ✅ Returns 21 high-level categories | Limited |
| `GET /v3/subcategories/` | ✅ Returns subcategories | Limited |
| `GET /v3/events/search` | ❌ **404 — endpoint removed** | **No** |
| `GET /v3/users/me/organizations/` | ✅ Empty (no orgs owned) | No |

**Verdict:** Eventbrite **deprecated their public event search API**. The only remaining endpoints are for managing your own events, not discovering others. The `categories` list is too coarse — "Music" is a single bucket with no nightlife-specific breakdown.

**Cost:** Free tier exists but useless for discovery.

---

### Bandsintown API
**Endpoint:** `GET /artists/{name}/events`

| Result | Usable? |
|---|---|
| ❌ 403 — "explicit deny in identity-based policy" | **No** |

Requires a registered app ID. Demo/research access blocked.

---

### Songkick API
**Endpoint:** `GET /api/3.0/search/locations.json`

| Result | Usable? |
|---|---|
| ❌ "Invalid or missing apikey" | **No** |

Requires API key application. No demo access.

---

### Ticketmaster Discovery API
**Endpoint:** `GET /discovery/v2/events.json`

| Result | Usable? |
|---|---|
| ❌ "Invalid ApiKey" | **No** |

Requires registered consumer key. No demo access.

---

### Resident Advisor (direct)
**Endpoint:** `POST /graphql`

| Result | Usable? |
|---|---|
| ❌ Cloudflare challenge page | **No** |

RA is aggressively protected. Direct scraping requires browser automation (Puppeteer/Playwright).

---

### Dice.fm (direct)
**Endpoint:** `GET /api/v2/events?city=new-york`

| Result | Usable? |
|---|---|
| ❌ Returns 404 HTML page | **No** |

No public API exposed.

---

### Meetup API
**Endpoint:** `GET /find/upcoming_events`

| Result | Usable? |
|---|---|
| ❌ 404 | **No** |

Requires OAuth-protected GraphQL API. No public demo.

---

## Summary Table

| Source | API Available? | Free? | Genre/Lineup Data? | Nightlife Coverage |
|---|---|---|---|---|
| Eventbrite | ❌ Removed | N/A | N/A | N/A |
| Bandsintown | ⚠️ Gated | Unknown | Artist-level | Mainstream concerts |
| Songkick | ⚠️ Gated | Unknown | Artist-level | Mainstream concerts |
| Ticketmaster | ⚠️ Gated | Unknown | Category-level | Mainstream |
| Resident Advisor | ❌ Cloudflare | N/A | Rich | Underground electronic |
| Dice.fm | ❌ No API | N/A | Unknown | UK/EU focused |
| Meetup | ⚠️ OAuth only | Unknown | Topic tags | Community events |
| **Apify RA scraper** | ✅ | ❌ ~$1/city | ✅ Lineup + genres | Underground electronic |
| **Apify Posh scraper** | ✅ | ❌ ~$1/city | ⚠️ Weak lineup | Local parties |

---

## Implications

**No free API exists** for discovering underground/local nightlife events with lineup and genre data. The market has converged on:
1. **Platform-owned APIs** (Eventbrite, Ticketmaster, Dice) that do not expose discovery endpoints to third parties.
2. **Artist-focused APIs** (Bandsintown, Songkick) that require proper registration and cover mainstream concerts, not club nights.
3. **Scraping** as the only way to get RA/Posh data, which requires browser automation and costs money on Apify or self-hosted infra.

---

## Recommendation for n8n Flow

Since APIs are dead, an **n8n workflow would need to scrape** rather than call APIs:

### Option A: Scrape Eventbrite website directly
Eventbrite still lists public events on `eventbrite.com/d/{city}/{category}/`. An n8n HTTP Request node + HTML extraction could pull:
- Event titles
- Dates/times
- Venue names
- Prices

**Limitations:** No structured lineup data. Genres are limited to Eventbrite's coarse taxonomy. Would need secondary enrichment (e.g., search event title on Spotify for artist names).

### Option B: Scrape RA website via n8n + Puppeteer
RA uses Cloudflare but n8n can run Puppeteer via the `n8n-nodes-puppeteer` community node or a self-hosted browserless/chrome container.

**Data quality:** Identical to Apify scraper (lineup, genres, venue, tickets).
**Cost:** Self-hosted infra (could run on existing server) instead of Apify per-run fees.

### Option C: Scrape Posh.vip website via n8n
Posh.vip has public event pages. Scraping the explore page + individual event pages would yield the same data as the Apify actor.

**Cost:** Same as Option B — self-hosted browser automation.

---

## Verdict

**Eventbrite API cannot supplement Apify data.** The search endpoint is gone.

**The viable free alternative is self-hosted scraping** (n8n + Puppeteer/Playwright on your own infra), not free APIs. This eliminates Apify's per-run markup but requires managing browser automation yourself.

For the prototype consolidation, recommend:
1. **Keep Apify for validation** (data schema is proven).
2. **Build n8n self-hosted scrapers** as the cost-reduction path.
3. **Do not invest time in Eventbrite API** — it provides zero event discovery capability.
