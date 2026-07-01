// Pure. Display helper for tonight's event-posts on Discover — the server-owned
// `events` model (see lib/events/event-payload). Mirrors feed-display's
// buildFeedItemDisplay but for events, which carry imminence (a start time) rather
// than recency. Firebase-free so it can be unit-tested without the SDK.

const { CITIES, COHORT_LABELS } = require('../constants');

const CATEGORY_LABELS = {
  live_music: 'Live Music',
  dj_set: 'DJ Set',
  open_mic: 'Open Mic',
  one_time_promo: 'Tonight Only',
};

const CATEGORY_ICONS = {
  live_music: '🎸',
  dj_set: '🎧',
  open_mic: '🎤',
  one_time_promo: '✨',
};

const SOURCE_LABELS = {
  eventbrite: 'Eventbrite',
  posh: 'Posh',
  ra: 'Resident Advisor',
  ticketsdata: 'TicketsData',
  'venue-site': 'Venue calendar',
  'manual-seed': 'Beta sample',
};

// startTime is a UTC ISO string (pure modules can't emit Firestore Timestamps);
// render it in the device's local time as a clock label, e.g. "9:30 PM".
function formatStartTime(startTimeISO) {
  if (!startTimeISO) return '';
  const d = new Date(startTimeISO);
  if (Number.isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours}:${mm} ${ampm}`;
}

function buildEventItemDisplay(event = {}) {
  const categoryLabel = CATEGORY_LABELS[event.category] || 'Event';
  const icon = CATEGORY_ICONS[event.category] || '🎶';
  const cohortLabel = COHORT_LABELS[event.cohort] || null;
  const area = CITIES[event.city] || null;
  const metadata = [categoryLabel, cohortLabel, area].filter(Boolean).join(' · ');
  const sourceLabel = SOURCE_LABELS[event.source] || (event.source ? 'Source' : '');
  const lineupLabel = Array.isArray(event.lineup) ? event.lineup.filter(Boolean).join(', ') : '';
  const genreLabel = Array.isArray(event.genres) ? event.genres.filter(Boolean).join(', ') : '';
  const priceLabel = event.isFree === true ? 'Free' : event.price || '';

  return {
    title: event.title || 'Live tonight',
    venueName: event.venueName || 'a venue',
    categoryLabel,
    icon,
    time: formatStartTime(event.startTime),
    metadata,
    sourceLabel,
    lineupLabel,
    genreLabel,
    priceLabel,
  };
}

module.exports = { buildEventItemDisplay, formatStartTime, CATEGORY_LABELS, SOURCE_LABELS };
