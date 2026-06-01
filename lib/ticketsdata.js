/**
 * TicketsData API client for Rounds Layer 4 (ticketing & reservations).
 *
 * Consolidated inventory + pricing from Ticketmaster, Eventbrite, and Dice.
 *
 * Endpoints:
 *   - GET /fetch   → inventory, pricing tiers, fees, status, transfer rules, previews
 *   - GET /events  → real-time event list from a performer URL
 */

const API_BASE = 'https://ticketsdata.com';

/**
 * Shared fetch wrapper.
 * @param {string} endpoint  — '/fetch' or '/events'
 * @param {Record<string,string>} params
 * @returns {Promise<{ok:true,data:object}|{ok:false,error:string}>}
 */
async function tdGet(endpoint, params) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}?${qs}`;

  try {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        error: json.message || json.error || `HTTP ${res.status}`,
      };
    }

    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: err.message || 'Network error' };
  }
}

/**
 * Fetch ticket inventory & pricing for a single event.
 *
 * Critical fields in response:
 *   - listings[].tier, face_value, fees, status (On Sale / Sold Out)
 *   - transfer_rules
 *   - preview_links (Spotify / Apple Music)
 *
 * @param {string} username
 * @param {string} password
 * @param {string} platform   — ticketmaster | eventbrite | dice
 * @param {string} eventUrl   — canonical event page URL
 */
async function fetchEventInventory(username, password, platform, eventUrl) {
  return tdGet('/fetch', {
    username,
    password,
    platform,
    event_url: eventUrl,
  });
}

/**
 * Fetch full real-time event list for a performer.
 *
 * @param {string} username
 * @param {string} password
 * @param {string} performerUrl  — performer profile URL
 */
async function fetchPerformerEvents(username, password, performerUrl) {
  return tdGet('/events', {
    username,
    password,
    performer_url: performerUrl,
  });
}

/**
 * Factory that bakes credentials into convenience methods.
 *
 * @param {{username:string,password:string}} cfg
 * @returns {{
 *   fetchEventInventory: (platform:string,eventUrl:string) => Promise<...>,
 *   fetchPerformerEvents: (performerUrl:string) => Promise<...>
 * }}
 */
function createTicketsDataClient({ username, password }) {
  if (!username) throw new Error('TicketsData client requires username');
  if (!password) throw new Error('TicketsData client requires password');

  return {
    fetchEventInventory: (platform, eventUrl) =>
      fetchEventInventory(username, password, platform, eventUrl),
    fetchPerformerEvents: (performerUrl) =>
      fetchPerformerEvents(username, password, performerUrl),
  };
}

module.exports = {
  fetchEventInventory,
  fetchPerformerEvents,
  createTicketsDataClient,
};
