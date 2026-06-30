const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const readRoot = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Expo standard path aliases', () => {
  test('editor tooling exposes @/* from project root', () => {
    const jsconfig = JSON.parse(readRoot('jsconfig.json'));

    expect(jsconfig.compilerOptions.baseUrl).toBe('.');
    expect(jsconfig.compilerOptions.paths['@/*']).toEqual(['*']);
  });

  test('Jest resolves @/* aliases and ignores local agent worktrees', () => {
    const jestConfig = require('../../jest.config');

    expect(jestConfig.moduleNameMapper['^@/(.*)$']).toBe('<rootDir>/$1');
    expect(jestConfig.testPathIgnorePatterns).toContain('<rootDir>/.claude/');
    expect(jestConfig.modulePathIgnorePatterns).toContain('<rootDir>/.claude/');
    expect(require('@/package.json').name).toBe('rounds');
  });

  test('Metro runtime resolves @/* aliases without changing Expo SDK target', () => {
    const metroConfig = require('../../metro.config');
    const pkg = JSON.parse(readRoot('package.json'));

    expect(pkg.dependencies.expo).toBe('~54.0.0');
    expect(metroConfig.resolver.extraNodeModules['@']).toBe(root);
  });

  test('entry route resolves auth + onboarding state (auth-gated on-ramp)', () => {
    const indexRoute = readRoot('app/index.js');

    // The pre-auth Figma shell (static Redirect to /friends) was superseded by the
    // F1 on-ramp: index resolves where the user belongs from auth + onboarding state.
    expect(indexRoute).toContain('auth-routing');
    expect(indexRoute).toContain('resolveRoute');
    expect(indexRoute).not.toContain('<Redirect href="/(tabs)/friends" />');
  });
});
