const {
  DEFAULT_AUTHENTICATED_ROUTE,
  getAddEntryRoute,
  getHiddenRoutePolicy,
  getHiddenTabRouteNames,
  getNativeTabIcon,
  getPrimaryTabDescriptors,
  getPrimaryTabNames,
  getTabIconName,
  getVisibleTabLabels,
  shouldHideTabRoute,
} = require('../navigation-shell');

describe('native UI navigation shell', () => {
  test('keeps Friends-first primary tab order and labels stable', () => {
    expect(getPrimaryTabNames()).toEqual([
      'friends',
      'feed',
      'add-tab-placeholder',
      'list',
      'profile',
    ]);
    expect(getVisibleTabLabels()).toEqual(['Friends', 'Feed', '', 'List', 'Profile']);
    expect(getPrimaryTabDescriptors().map((tab) => tab.title)).toEqual([
      'Friends',
      'Feed',
      'Add',
      'List',
      'Profile',
    ]);
  });

  test('models Add as a tab-bar entry that opens the rating modal route', () => {
    const add = getPrimaryTabDescriptors().find((tab) => tab.kind === 'add');

    expect(add).toMatchObject({
      name: 'add-tab-placeholder',
      label: '',
      title: 'Add',
      role: 'create-rating',
      entryHref: '/add',
    });
    expect(getAddEntryRoute()).toBe('/add');
  });

  test('exposes native icon metadata with Ionicons fallback names', () => {
    expect(getNativeTabIcon('friends')).toEqual({
      sfDefault: 'bubble.left.and.bubble.right',
      sfSelected: 'bubble.left.and.bubble.right.fill',
      fallbackDefault: 'chatbubbles-outline',
      fallbackSelected: 'chatbubbles',
    });
    expect(getTabIconName('friends')).toBe('chatbubbles-outline');
    expect(getTabIconName('friends', true)).toBe('chatbubbles');
  });

  test('documents hidden deprecated primary-nav routes', () => {
    expect(getHiddenTabRouteNames()).toEqual(['leaderboard']);
    expect(shouldHideTabRoute('leaderboard')).toBe(true);
    expect(getHiddenRoutePolicy('leaderboard')).toMatchObject({
      hidden: true,
      reason: 'deprecated-primary-navigation',
    });
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe('/(tabs)/friends');
  });
});
