const {
  DEFAULT_AUTHENTICATED_ROUTE,
  PRIMARY_TABS,
  shouldHideTabRoute,
  getPrimaryTabNames,
  getVisibleTabLabels,
} = require('../tab-config');

describe('friends-first tab config', () => {
  test('orders icon-only primary navigation as Friends, Discover, Plus, My List, Profile', () => {
    expect(getPrimaryTabNames()).toEqual([
      'friends',
      'discover',
      'plus',
      'list',
      'profile',
    ]);

    expect(getVisibleTabLabels()).toEqual(['', '', '', '', '']);
  });

  test('keeps Leaderboard/Rank out of primary navigation', () => {
    expect(PRIMARY_TABS.map((tab) => tab.name)).not.toContain('leaderboard');
    expect(PRIMARY_TABS.map((tab) => tab.label)).not.toContain('Rank');
    expect(shouldHideTabRoute('leaderboard')).toBe(true);
  });

  test('routes onboarded users to Friends first', () => {
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe('/(tabs)/friends');
  });
});
