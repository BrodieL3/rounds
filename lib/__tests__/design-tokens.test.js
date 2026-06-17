const { COLORS } = require('../constants');

// Slice 2: recolored to "05 Minimal Mono Luxe" (parent ISA ISC-45, 2026-06-17).
// Recolor is by ROLE — key NAMES preserved, only VALUES change.
describe('05 Minimal Mono Luxe design tokens (ISC-21)', () => {
  test('background role → #111111', () => {
    expect(COLORS.bg).toBe('#111111');
  });

  test('card / surface role → #1A1A1A', () => {
    expect(COLORS.bgCard).toBe('#1A1A1A');
  });

  test('primary text role → #E8E2D6', () => {
    expect(COLORS.textPrimary).toBe('#E8E2D6');
  });

  test('secondary / muted text role → #6F6F68', () => {
    expect(COLORS.textSecondary).toBe('#6F6F68');
  });

  test('accent role → lime #C0FF3E', () => {
    expect(COLORS.accent).toBe('#C0FF3E');
  });

  test('hero mirrors the accent role', () => {
    expect(COLORS.hero).toBe('#C0FF3E');
  });
});

describe('recolor preserves the token contract (ISC-23 anti-regression)', () => {
  const REQUIRED_KEYS = [
    'bg',
    'bgElevated',
    'bgCard',
    'textPrimary',
    'textSecondary',
    'textMuted',
    'textPlaceholder',
    'accent',
    'hero',
    'danger',
    'success',
  ];

  test('every pre-existing COLORS key still exists', () => {
    REQUIRED_KEYS.forEach((key) => {
      expect(COLORS).toHaveProperty(key);
      expect(typeof COLORS[key]).toBe('string');
    });
  });

  test('elevated surface and borders sit in the 05 charcoal range', () => {
    expect(COLORS.bgElevated).toBe('#1A1A1A');
    // hairline/border role mapped onto the placeholder/muted-structure tokens
    expect(COLORS.textPlaceholder).toBe('#6F6F68');
  });
});
