const { toggleRsvp, isInterested, rsvpCount } = require('../events/rsvp');

describe('rsvp', () => {
  test('toggle adds an uninterested user', () => {
    expect(toggleRsvp(['a'], 'b')).toEqual(['a', 'b']);
  });

  test('toggle removes an interested user', () => {
    expect(toggleRsvp(['a', 'b'], 'b')).toEqual(['a']);
  });

  test('toggle is its own inverse', () => {
    expect(toggleRsvp(toggleRsvp(['a'], 'b'), 'b')).toEqual(['a']);
  });

  test('isInterested and rsvpCount report state', () => {
    expect(isInterested(['a', 'b'], 'b')).toBe(true);
    expect(isInterested(['a'], 'b')).toBe(false);
    expect(rsvpCount(['a', 'b', 'c'])).toBe(3);
  });

  test('requires a uid to toggle', () => {
    expect(() => toggleRsvp(['a'])).toThrow(/uid/);
  });
});
