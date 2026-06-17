const {
  getRouteMetadata,
  getRootStackScreens,
  ROOT_STACK_ROUTE_NAMES,
} = require('../navigation-shell');

describe('onboarding route registration (ISC-19, ISC-20)', () => {
  test('onboarding is registered in ROUTE_METADATA like login/signup (auth role, header hidden)', () => {
    const meta = getRouteMetadata('onboarding');
    expect(meta).not.toBeNull();
    expect(meta.name).toBe('onboarding');
    expect(meta.role).toBe('auth');
    expect(meta.header.shown).toBe(false);
  });

  test('onboarding is part of the root stack route names', () => {
    expect(ROOT_STACK_ROUTE_NAMES).toContain('onboarding');
  });

  test('getRootStackScreens builds an onboarding screen', () => {
    const names = getRootStackScreens().map((s) => s.name);
    expect(names).toContain('onboarding');
    const onboarding = getRootStackScreens().find((s) => s.name === 'onboarding');
    expect(onboarding.options.headerShown).toBe(false);
  });
});
