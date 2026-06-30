/**
 * Pure, UI-agnostic helpers for the onboarding flow (parent ISA ISC-2/3/4).
 *
 * Kept free of React and Firebase imports so age math, validation, and the
 * profile-write logic are unit-testable in the repo's node test environment
 * (no JSX transform), matching the slice-1 / lib-wide DI convention
 * (see auth-signup.js, auth-profile.js, venue-bookmark-service.js).
 */

const MIN_AGE = 18; // CONTEXT.md Age Policy: Rounds is 18+.
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_RE = /^[a-z0-9_]+$/;

/**
 * Parse a YYYY-MM-DD date string into a real calendar date, rejecting
 * impossible dates (e.g. 2000-02-30) that Date() would silently roll over.
 * @returns {{ y:number, m:number, d:number } | null}
 */
function parseCalendarDate(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Round-trip through Date in UTC and confirm no rollover occurred.
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

/**
 * Compute integer age at `now` from a YYYY-MM-DD date of birth.
 * Day-granular: subtract a year if this year's birthday hasn't happened yet.
 * Returns null for invalid OR future dates so callers fail closed (a bad DOB
 * is never accidentally treated as an adult).
 * @param {string} dob
 * @param {Date} now
 * @returns {number | null}
 */
function computeAge(dob, now) {
  const parsed = parseCalendarDate(dob);
  if (!parsed) return null;
  // DOB is a wall-clock calendar date (no timezone). Compare against "today" as
  // the user's LOCAL calendar day so the exact-18th-birthday boundary is correct
  // regardless of UTC offset (a UTC read would shift "today" by a day in the
  // evening for negative-offset zones). Tests pin local components explicitly.
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  const nd = now.getDate();

  // Future date of birth is invalid.
  if (parsed.y > ny || (parsed.y === ny && (parsed.m > nm || (parsed.m === nm && parsed.d > nd)))) {
    return null;
  }

  let age = ny - parsed.y;
  // Birthday not yet reached this year → not that old yet.
  if (nm < parsed.m || (nm === parsed.m && nd < parsed.d)) {
    age -= 1;
  }
  return age;
}

/**
 * Validate + normalize a username/handle.
 * @returns {{ ok:true, username:string } | { ok:false, error:string }}
 */
function validateUsername(raw) {
  const username = (raw || '').trim().toLowerCase();
  if (!username) return { ok: false, error: 'Choose a username.' };
  if (username.length < USERNAME_MIN) {
    return { ok: false, error: `Username must be at least ${USERNAME_MIN} characters.` };
  }
  if (username.length > USERNAME_MAX) {
    return { ok: false, error: `Username must be ${USERNAME_MAX} characters or fewer.` };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: 'Username can use only letters, numbers, and underscores.' };
  }
  return { ok: true, username };
}

/**
 * Compose the onboarding gate: age (18+), display name, username.
 * @returns {{ ok:true, age:number, username:string, displayName:string }
 *          | { ok:false, error:string }}
 */
function validateOnboardingInput({ dob, displayName, username }, now) {
  const age = computeAge(dob, now);
  if (age === null) {
    return { ok: false, error: 'Enter a valid date of birth.' };
  }
  if (age < MIN_AGE) {
    return { ok: false, error: `You must be ${MIN_AGE} or older to use Rounds.` };
  }
  const name = (displayName || '').trim();
  if (!name) {
    return { ok: false, error: 'Enter a display name.' };
  }
  const handle = validateUsername(username);
  if (!handle.ok) return handle;

  return { ok: true, age, username: handle.username, displayName: name };
}

/**
 * Build the Firestore profile patch persisted on onboarding completion.
 * `uid` is stored so downstream consumers that read profiles via `.data()`
 * (the auth cache, the public profile page) get a defined `profile.uid`.
 * @param {{ displayName:string, username:string, dob:string, uid:string }} fields
 * @param {{ serverTimestamp: () => unknown }} deps
 */
function buildOnboardingProfile({ displayName, username, dob, uid }, { serverTimestamp }) {
  return {
    uid,
    displayName,
    username,
    dateOfBirth: dob,
    onboardingComplete: true,
    updatedAt: serverTimestamp(),
  };
}

/**
 * Is `username` free, or owned by the current user (re-onboard is fine)?
 * Dependencies injected to stay Firebase-free in unit tests.
 * @returns {Promise<boolean>}
 */
async function isUsernameAvailable(username, uid, api) {
  const { db, collection, query, where, limit, getDocs } = api;
  const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return true;
  // Available only if the single match is the same user re-running onboarding.
  return snap.docs.every((d) => d.id === uid);
}

/**
 * Validate, check uniqueness, and write the onboarding profile.
 * Never returns ok:true unless setDoc actually succeeded — so the caller must
 * not flip the app into an "onboarded" state on a failed write.
 * @returns {Promise<{ ok:true } | { ok:false, error:string }>}
 */
async function persistOnboarding(input, api) {
  const now = api.now || new Date();
  const validation = validateOnboardingInput(input, now);
  if (!validation.ok) return validation;

  try {
    const available = await isUsernameAvailable(validation.username, api.uid, api);
    if (!available) {
      return { ok: false, error: 'That username is taken. Try another.' };
    }
    const profile = buildOnboardingProfile(
      { displayName: validation.displayName, username: validation.username, dob: input.dob, uid: api.uid },
      api,
    );
    await api.setDoc(api.doc(api.db, 'users', api.uid), profile, { merge: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: 'Could not save your profile. Please try again.' };
  }
}

module.exports = {
  MIN_AGE,
  USERNAME_MIN,
  USERNAME_MAX,
  parseCalendarDate,
  computeAge,
  validateUsername,
  validateOnboardingInput,
  buildOnboardingProfile,
  isUsernameAvailable,
  persistOnboarding,
};
module.exports.__esModule = true;
