// Pure. Local calendar date ('YYYY-MM-DD') of a Date/timestamp. The seed AND the
// P4 scraper must derive localDate identically — it is a component of the dedup
// id — so both import this single helper rather than re-implementing it. Uses the
// local timezone; run ingestion in the venue metro's tz (America/New_York for the
// beta). Firebase-free.

function localDateOf(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) throw new Error('invalid date');
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

module.exports = { localDateOf };
