const {
  computeAge,
  validateUsername,
  validateOnboardingInput,
  buildOnboardingProfile,
  isUsernameAvailable,
  persistOnboarding,
  MIN_AGE,
} = require('../onboarding');

// Fixed "now" so age math is deterministic: 2026-06-17, built from LOCAL
// components (Date(year, monthIndex, day, hour)) so the assertions hold in any
// timezone — computeAge intentionally compares against the local calendar day.
const NOW = new Date(2026, 5, 17, 12, 0, 0); // month index 5 = June

describe('computeAge (ISC-1..4: day-granular, fail-closed age math)', () => {
  test('exact 18th birthday today is 18 (boundary inclusive)', () => {
    expect(computeAge('2008-06-17', NOW)).toBe(18);
  });

  test('one day short of 18 is 17 (blocked downstream)', () => {
    expect(computeAge('2008-06-18', NOW)).toBe(17);
  });

  test('birthday already passed this year counts the full year', () => {
    expect(computeAge('2000-01-01', NOW)).toBe(26);
  });

  test('birthday later this year has not happened yet', () => {
    expect(computeAge('2000-12-31', NOW)).toBe(25);
  });

  test('a clearly-adult DOB computes a sane age', () => {
    expect(computeAge('1990-06-17', NOW)).toBe(36);
  });

  test('future DOB returns null (invalid, never treated as adult)', () => {
    expect(computeAge('2030-01-01', NOW)).toBeNull();
  });

  test('unparseable / empty DOB returns null', () => {
    expect(computeAge('not-a-date', NOW)).toBeNull();
    expect(computeAge('', NOW)).toBeNull();
    expect(computeAge(undefined, NOW)).toBeNull();
  });

  test('impossible calendar date (Feb 30) returns null', () => {
    expect(computeAge('2000-02-30', NOW)).toBeNull();
  });

  test('exact 18th birthday is correct at a late-evening LOCAL now (TZ-boundary regression)', () => {
    // 23:30 local on the user's 18th birthday. A UTC-based read in a negative
    // offset would roll to the next day and still read 18, but in a positive
    // offset could roll back a day and wrongly read 17 — local comparison is stable.
    const lateLocal = new Date(2026, 5, 17, 23, 30, 0);
    expect(computeAge('2008-06-17', lateLocal)).toBe(18);
  });

  test('leap-day birthday (Feb 29) computes a sane adult age', () => {
    expect(computeAge('2004-02-29', NOW)).toBe(22);
  });
});

describe('validateUsername (ISC-5: format + normalization)', () => {
  test('accepts and lowercases a clean handle', () => {
    expect(validateUsername('Marcus_Webb')).toEqual({ ok: true, username: 'marcus_webb' });
  });

  test('rejects empty', () => {
    expect(validateUsername('').ok).toBe(false);
  });

  test('rejects too short (< 3)', () => {
    expect(validateUsername('ab').ok).toBe(false);
  });

  test('rejects too long (> 20)', () => {
    expect(validateUsername('a'.repeat(21)).ok).toBe(false);
  });

  test('rejects spaces and punctuation', () => {
    expect(validateUsername('marc us').ok).toBe(false);
    expect(validateUsername('marc.us').ok).toBe(false);
    expect(validateUsername('marc@us').ok).toBe(false);
  });

  test('accepts digits and underscores', () => {
    expect(validateUsername('night_owl_22')).toEqual({ ok: true, username: 'night_owl_22' });
  });
});

describe('validateOnboardingInput (ISC-6: composed gate)', () => {
  test('blocks under-18 with a clear error', () => {
    const r = validateOnboardingInput({ dob: '2010-01-01', displayName: 'Kid', username: 'kiddo' }, NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/18/);
  });

  test('blocks blank display name', () => {
    const r = validateOnboardingInput({ dob: '1990-01-01', displayName: '   ', username: 'adult' }, NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/name/i);
  });

  test('blocks bad username', () => {
    const r = validateOnboardingInput({ dob: '1990-01-01', displayName: 'Adult', username: 'no good' }, NOW);
    expect(r.ok).toBe(false);
  });

  test('blocks invalid DOB (fail closed)', () => {
    const r = validateOnboardingInput({ dob: '2030-01-01', displayName: 'Adult', username: 'adult' }, NOW);
    expect(r.ok).toBe(false);
  });

  test('passes a valid adult and returns normalized username + age', () => {
    const r = validateOnboardingInput({ dob: '1990-06-17', displayName: '  Marcus  ', username: 'Marcus_Webb' }, NOW);
    expect(r.ok).toBe(true);
    expect(r.age).toBe(36);
    expect(r.username).toBe('marcus_webb');
    expect(r.displayName).toBe('Marcus');
  });

  test('allows a user who turns 18 exactly today (boundary inclusive through the full gate)', () => {
    const r = validateOnboardingInput({ dob: '2008-06-17', displayName: 'Eighteen', username: 'just18' }, NOW);
    expect(r.ok).toBe(true);
    expect(r.age).toBe(18);
  });

  test('blocks a user who turns 18 tomorrow (one day short)', () => {
    const r = validateOnboardingInput({ dob: '2008-06-18', displayName: 'Almost', username: 'almost18' }, NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/18/);
  });

  test('MIN_AGE is 18', () => {
    expect(MIN_AGE).toBe(18);
  });
});

describe('buildOnboardingProfile (ISC-7: persisted payload shape)', () => {
  test('builds the canonical profile patch with onboardingComplete + timestamp', () => {
    const serverTimestamp = () => 'SERVER_TS';
    const profile = buildOnboardingProfile(
      { displayName: 'Marcus', username: 'marcus_webb', dob: '1990-06-17' },
      { serverTimestamp },
    );
    expect(profile.displayName).toBe('Marcus');
    expect(profile.username).toBe('marcus_webb');
    expect(profile.dateOfBirth).toBe('1990-06-17');
    expect(profile.onboardingComplete).toBe(true);
    expect(profile.updatedAt).toBe('SERVER_TS');
  });
});

describe('isUsernameAvailable (ISC-8: uniqueness query)', () => {
  function fakeApi(existingUid) {
    return {
      db: {},
      collection: () => 'usersCol',
      query: (...a) => a,
      where: (...a) => a,
      limit: (...a) => a,
      getDocs: async () => ({
        empty: existingUid === null,
        docs: existingUid === null ? [] : [{ id: existingUid }],
      }),
    };
  }

  test('free username is available', async () => {
    await expect(isUsernameAvailable('freehandle', 'me', fakeApi(null))).resolves.toBe(true);
  });

  test('username owned by another user is unavailable', async () => {
    await expect(isUsernameAvailable('taken', 'me', fakeApi('someoneElse'))).resolves.toBe(false);
  });

  test('username owned by the SAME user (re-onboard) is available', async () => {
    await expect(isUsernameAvailable('mine', 'me', fakeApi('me'))).resolves.toBe(true);
  });
});

describe('persistOnboarding (ISC-9: no false success on write failure)', () => {
  const baseInput = { dob: '1990-06-17', displayName: 'Marcus', username: 'marcus_webb' };

  function deps({ available = true, setDocThrows = false } = {}) {
    const calls = { setDoc: 0 };
    return {
      calls,
      api: {
        db: {},
        uid: 'me',
        doc: () => 'userRef',
        collection: () => 'usersCol',
        query: (...a) => a,
        where: (...a) => a,
        limit: (...a) => a,
        getDocs: async () => ({ empty: available, docs: available ? [] : [{ id: 'other' }] }),
        setDoc: async () => {
          calls.setDoc += 1;
          if (setDocThrows) throw new Error('firestore down');
        },
        serverTimestamp: () => 'SERVER_TS',
        now: NOW,
      },
    };
  }

  test('writes profile and resolves ok for a valid adult with a free username', async () => {
    const { api, calls } = deps({ available: true });
    const res = await persistOnboarding(baseInput, api);
    expect(res.ok).toBe(true);
    expect(calls.setDoc).toBe(1);
  });

  test('does NOT write and returns error for under-18', async () => {
    const { api, calls } = deps();
    const res = await persistOnboarding({ ...baseInput, dob: '2015-01-01' }, api);
    expect(res.ok).toBe(false);
    expect(calls.setDoc).toBe(0);
  });

  test('does NOT write when username is taken', async () => {
    const { api, calls } = deps({ available: false });
    const res = await persistOnboarding(baseInput, api);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/username|taken/i);
    expect(calls.setDoc).toBe(0);
  });

  test('returns ok:false (no false onboarded state) when setDoc throws', async () => {
    const { api } = deps({ available: true, setDocThrows: true });
    const res = await persistOnboarding(baseInput, api);
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
