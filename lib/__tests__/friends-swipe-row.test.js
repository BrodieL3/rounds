const {
  clampSwipeTranslate,
  resolveSwipeRest,
  shouldCaptureHorizontalSwipe,
} = require('../friends/swipe-row');

const OPEN = 152; // two 76px action buttons

describe('Swipe row math', () => {
  test('clamps live translate between -openWidth and 0', () => {
    expect(clampSwipeTranslate(0, -50, OPEN)).toBe(-50);
    expect(clampSwipeTranslate(0, 30, OPEN)).toBe(0); // cannot swing right of closed
    expect(clampSwipeTranslate(0, -300, OPEN)).toBe(-OPEN); // cannot pull past the actions
    expect(clampSwipeTranslate(-OPEN, 20, OPEN)).toBe(-132); // dragging back from open
    expect(clampSwipeTranslate(-OPEN, -10, OPEN)).toBe(-OPEN); // already fully open
  });

  test('snaps open from closed only past the threshold', () => {
    expect(resolveSwipeRest(0, -60, OPEN)).toBe(-OPEN); // past 35% of 152 (53.2)
    expect(resolveSwipeRest(0, -40, OPEN)).toBe(0); // under threshold
    expect(resolveSwipeRest(0, 50, OPEN)).toBe(0); // rightward from closed stays closed
  });

  test('snaps closed from open only past the threshold', () => {
    expect(resolveSwipeRest(-OPEN, 60, OPEN)).toBe(0); // dragged back past threshold
    expect(resolveSwipeRest(-OPEN, 40, OPEN)).toBe(-OPEN); // small drag back stays open
  });

  test('captures only intentional horizontal swipes', () => {
    expect(shouldCaptureHorizontalSwipe(12, 3)).toBe(true);
    expect(shouldCaptureHorizontalSwipe(4, 1)).toBe(false); // below min travel
    expect(shouldCaptureHorizontalSwipe(10, 20)).toBe(false); // mostly vertical -> let scroll win
  });
});
