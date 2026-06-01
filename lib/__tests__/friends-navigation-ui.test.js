const fs = require('fs');
const path = require('path');
const { getPrimaryTabNames } = require('../tab-config');

const tabsDir = path.join(__dirname, '../../app/(tabs)');
const tabLayoutPath = path.join(tabsDir, '_layout.js');

describe('friends-first tab routes', () => {
  test('each primary tab has a file-based Expo route', () => {
    expect(getPrimaryTabNames().map((name) => `${name}.js`)).toEqual([
      'friends.js',
      'feed.js',
      'add-tab-placeholder.js',
      'list.js',
      'profile.js',
    ]);

    getPrimaryTabNames().forEach((name) => {
      expect(fs.existsSync(path.join(tabsDir, `${name}.js`))).toBe(true);
    });
  });

  test('tab layout renders config-driven primary nav and hides deprecated leaderboard route', () => {
    const source = fs.readFileSync(tabLayoutPath, 'utf8');

    expect(source).toContain('PRIMARY_TABS.map');
    expect(source).toContain('HIDDEN_TAB_ROUTES.map');
    expect(source).toContain('href: null');
    expect(source).not.toContain("tabBarLabel: 'Rank'");
  });
});
