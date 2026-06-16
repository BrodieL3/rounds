const {
  DEFAULT_AUTHENTICATED_ROUTE,
  getAddEntryRoute,
  getHiddenRoutePolicy,
  getHiddenTabRouteNames,
  getNativeTabIcon,
  getPrimaryTabDescriptors,
  getPrimaryTabNames,
  getTabIconName,
  getTabImplementationDecision,
  getVisibleTabLabels,
  getRootStackScreens,
  getRouteMetadata,
  shouldHideTabRoute,
} = require('../navigation-shell');

describe('native UI navigation shell', () => {
  test('keeps Friends-first Figma tab order and labels stable', () => {
    expect(getPrimaryTabNames()).toEqual([
      'friends',
      'discover',
      'plus',
      'list',
      'profile',
    ]);
    expect(getVisibleTabLabels()).toEqual(['', '', '', '', '']);
    expect(getPrimaryTabDescriptors().map((tab) => tab.title)).toEqual([
      'Friends',
      'Discover',
      'Plus',
      'My List',
      'Profile',
    ]);
  });

  test('models Plus as a tab-bar entry that opens the formSheet modal', () => {
    const plus = getPrimaryTabDescriptors().find((tab) => tab.kind === 'formSheet');

    expect(plus).toMatchObject({
      name: 'plus',
      label: '',
      title: 'Plus',
      role: 'plus-menu',
      opens: '/plus-menu',
    });
    expect(plus).not.toHaveProperty('entryHref');
    expect(getAddEntryRoute()).toBe('/add');
  });

  test('exposes native icon metadata with Heroicons component names', () => {
    expect(getNativeTabIcon('friends')).toEqual({
      sfDefault: 'person.2',
      sfSelected: 'person.2.fill',
      heroOutline: 'UsersIcon',
      heroSolid: 'UsersIcon',
    });
    expect(getNativeTabIcon('discover')).toEqual({
      sfDefault: 'globe.europe.africa',
      sfSelected: 'globe.europe.africa.fill',
      heroOutline: 'GlobeEuropeAfricaIcon',
      heroSolid: 'GlobeEuropeAfricaIcon',
    });
    expect(getPrimaryTabDescriptors().find((tab) => tab.name === 'discover').icon.visual).toEqual({ size: 30, translateY: 0 });
    expect(getPrimaryTabDescriptors().find((tab) => tab.name === 'plus').icon.visual).toEqual({ size: 30, translateY: 0 });
    expect(getTabIconName('friends')).toBe('UsersIcon');
    expect(getTabIconName('friends', true)).toBe('UsersIcon');
    expect(getTabIconName('discover')).toBe('GlobeEuropeAfricaIcon');
    expect(getTabIconName('discover', true)).toBe('GlobeEuropeAfricaIcon');
  });

  test('documents formSheet evaluation and JavaScript tabs exception', () => {
    expect(getTabImplementationDecision()).toEqual({
      implementation: 'expo-router-formSheet-for-plus-menu',
      evaluatedAlternative: 'javascript-tabs-with-centered-plus-drawer',
      decision: 'use-formSheet-for-native-sheet-behavior-and-fit-to-content',
      blocker: null,
      reevaluateWhen: null,
    });
  });

  test('documents hidden deprecated primary-nav routes', () => {
    expect(getHiddenTabRouteNames()).toEqual([]);
    expect(shouldHideTabRoute('leaderboard')).toBe(true);
    expect(getHiddenRoutePolicy('leaderboard')).toMatchObject({
      hidden: true,
      reason: 'deprecated-primary-navigation',
    });
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe('/(tabs)/friends');
  });

  test('centralizes low-risk Figma root stack metadata', () => {
    expect(getRootStackScreens()).toEqual([
      { name: 'index', options: { headerShown: false, title: 'Rounds' }, role: 'entry' },
      { name: '(tabs)', options: { headerShown: false, title: 'Rounds' }, role: 'app-shell' },
      { name: 'add', options: { headerShown: false, presentation: 'modal', title: 'Rate a venue' }, role: 'rate-venue' },
      { name: 'edit-profile', options: { headerShown: false, presentation: 'modal', title: 'Edit profile' }, role: 'profile-edit' },
      { name: 'post', options: { headerShown: false, title: 'Post' }, role: 'post' },
      { name: 'conversation', options: { headerShown: false, title: 'Conversation' }, role: 'conversation' },
      { name: 'venue', options: { headerShown: false, title: 'Venue' }, role: 'venue' },
      { name: 'search', options: { headerShown: false, title: 'Search' }, role: 'search' },
      { name: 'user', options: { headerShown: false, title: 'Profile' }, role: 'public-profile' },
      { name: 'plus-menu', options: { headerShown: false, presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, sheetCornerRadius: 30, contentStyle: { backgroundColor: 'transparent' }, title: 'Plus' }, role: 'plus-menu' },
    ]);
    expect(getRouteMetadata('onboarding')).toBeNull();
    expect(getRouteMetadata('search')).toMatchObject({
      name: 'search',
      title: 'Search',
      role: 'search',
      header: { shown: false, search: true, customHeaderException: true },
    });
  });
});
