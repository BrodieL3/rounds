const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const readRoot = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Expo standard entry compliance', () => {
  test('package entry stays on Expo Router and exposes doctor script', () => {
    const pkg = JSON.parse(readRoot('package.json'));

    expect(pkg.main).toBe('expo-router/entry');
    expect(pkg.scripts['doctor:expo']).toBe('expo-doctor');
  });

  test('legacy root entry files are neutralized so contributors follow Expo Router', () => {
    const appJs = readRoot('App.js');
    const indexJs = readRoot('index.js');

    expect(appJs).toContain('Expo Router runtime entry is package.json main: expo-router/entry');
    expect(indexJs).toContain('Expo Router runtime entry is package.json main: expo-router/entry');
    expect(appJs).not.toContain('Open up App.js to start working on your app!');
    expect(indexJs).not.toContain("import App from './App'");
    expect(indexJs).not.toContain('registerRootComponent(App)');
  });
});
