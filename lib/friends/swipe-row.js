// Pure math for the inbox swipe-to-reveal rows (iMessage-style). Kept framework-free so it
// can be unit-tested without React Native; the SwipeableRow component wires it to PanResponder.

// Live translateX during a drag, clamped so the row can only open leftward (never past the
// action width, never swing right of closed).
function clampSwipeTranslate(lastOffset, dx, openWidth) {
  const next = lastOffset + dx;
  if (next > 0) return 0;
  if (next < -openWidth) return -openWidth;
  return next;
}

// Resting position on release. From the closed state a leftward drag past the threshold opens;
// from the open state a rightward drag past the threshold closes. Threshold is a fraction of
// the revealed action width so a deliberate flick snaps either way.
function resolveSwipeRest(lastOffset, dx, openWidth, threshold = 0.35) {
  const trigger = openWidth * threshold;
  if (lastOffset === 0) {
    return dx < -trigger ? -openWidth : 0;
  }
  return dx > trigger ? 0 : -openWidth;
}

// Only claim the gesture for an intentional horizontal swipe, so vertical list scrolling and
// taps pass straight through to the ScrollView / row Pressable.
function shouldCaptureHorizontalSwipe(dx, dy, minDx = 8) {
  return Math.abs(dx) > minDx && Math.abs(dx) > Math.abs(dy);
}

module.exports = {
  clampSwipeTranslate,
  resolveSwipeRest,
  shouldCaptureHorizontalSwipe,
};
module.exports.__esModule = true;
