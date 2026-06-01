const {
  DEFAULT_AUTHENTICATED_ROUTE,
  HIDDEN_TAB_ROUTES,
  PRIMARY_TABS,
  getPrimaryTabNames,
  getVisibleTabLabels,
} = require('../tab-config');

describe('friends-first tab config', () => {
  test('orders primary navigation as Friends, Feed, Add, List, Profile', () => {
    expect(getPrimaryTabNames()).toEqual([
      'friends',
      'feed',
      'add-tab-placeholder',
      'list',
      'profile',
    ]);

    expect(getVisibleTabLabels()).toEqual(['Friends', 'Feed', '', 'List', 'Profile']);
  });

  test('keeps Leaderboard/Rank out of primary navigation', () => {
    expect(PRIMARY_TABS.map((tab) => tab.name)).not.toContain('leaderboard');
    expect(PRIMARY_TABS.map((tab) => tab.label)).not.toContain('Rank');
    expect(HIDDEN_TAB_ROUTES).toContain('leaderboard');
  });

  test('routes onboarded users to Friends first', () => {
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe('/(tabs)/friends');
  });
});
