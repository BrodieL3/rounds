const { COLORS } = require('../constants');

describe('Figma design tokens', () => {
  test('uses Rounds Figma color palette as global UI tokens', () => {
    expect(COLORS.bg).toBe('#F0F0F0');
    expect(COLORS.bgCard).toBe('#D9D9D9');
    expect(COLORS.textPrimary).toBe('#111827');
    expect(COLORS.accent).toBe('#084EB8');
    expect(COLORS.hero).toBe('#084EB8');
  });
});
