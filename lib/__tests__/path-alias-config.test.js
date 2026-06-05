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

  test('Jest resolves @/* aliases', () => {
    const jestConfig = require('../../jest.config');

    expect(jestConfig.moduleNameMapper['^@/(.*)$']).toBe('<rootDir>/$1');
    expect(require('@/package.json').name).toBe('rounds');
  });

  test('Metro runtime resolves @/* aliases without changing Expo SDK target', () => {
    const metroConfig = require('../../metro.config');
    const pkg = JSON.parse(readRoot('package.json'));

    expect(pkg.dependencies.expo).toBe('~54.0.0');
    expect(metroConfig.resolver.extraNodeModules['@']).toBe(root);
  });

  test('touched route source uses alias import without route behavior churn', () => {
    const indexRoute = readRoot('app/index.js');

    expect(indexRoute).toContain("from '@/contexts/AuthContext'");
    expect(indexRoute).toContain("from '@/lib/auth-routing'");
    expect(indexRoute).toContain("from '@/lib/constants'");
    expect(indexRoute).toContain("import { Redirect } from 'expo-router'");
  });
});
