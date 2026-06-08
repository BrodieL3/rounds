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
  getOnboardingStackScreens,
  getRootStackScreens,
  getRouteMetadata,
  shouldHideTabRoute,
} = require('../navigation-shell');

describe('native UI navigation shell', () => {
  test('keeps Friends-first Figma tab order and labels stable', () => {
    expect(getPrimaryTabNames()).toEqual([
      'friends',
      'feed',
      'add-tab-placeholder',
      'list',
      'profile',
    ]);
    expect(getVisibleTabLabels()).toEqual(['Friends', 'Discover', '', 'List', 'Profile']);
    expect(getPrimaryTabDescriptors().map((tab) => tab.title)).toEqual([
      'Friends',
      'Discover',
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
    expect(getNativeTabIcon('feed')).toEqual({
      sfDefault: 'globe',
      sfSelected: 'globe',
      fallbackDefault: 'globe-outline',
      fallbackSelected: 'globe',
    });
    expect(getTabIconName('friends')).toBe('chatbubbles-outline');
    expect(getTabIconName('friends', true)).toBe('chatbubbles');
    expect(getTabIconName('feed')).toBe('globe-outline');
    expect(getTabIconName('feed', true)).toBe('globe');
  });

  test('documents native-tabs evaluation and JavaScript tabs exception', () => {
    expect(getTabImplementationDecision()).toEqual({
      implementation: 'javascript-tabs',
      evaluatedAlternative: 'expo-router-unstable-native-tabs',
      decision: 'keep-javascript-tabs',
      blocker: 'center-add-must-open-add-modal-without-selecting-blank-primary-route',
      reevaluateWhen: 'native-tabs-supports-custom-tab-bar-button-or-non-selecting-modal-trigger-in-expo-go',
    });
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

  test('centralizes low-risk root and onboarding stack metadata', () => {
    expect(getRootStackScreens()).toEqual([
      { name: 'index', options: { headerShown: false, title: 'Rounds' }, role: 'entry' },
      { name: 'onboarding', options: { headerShown: false, title: 'Onboarding' }, role: 'onboarding' },
      { name: '(tabs)', options: { headerShown: false, title: 'Rounds' }, role: 'app-shell' },
      { name: 'add', options: { headerShown: false, presentation: 'modal', title: 'Add rating' }, role: 'create-rating' },
      { name: 'edit-profile', options: { headerShown: false, presentation: 'modal', title: 'Edit profile' }, role: 'profile-edit' },
      { name: 'venue', options: { headerShown: false, title: 'Venue' }, role: 'venue' },
    ]);
    expect(getOnboardingStackScreens().map((screen) => screen.name)).toEqual([
      'phone',
      'email',
      'name',
      'username',
      'photo',
      'city',
      'preferences',
      'spotify',
    ]);
    expect(getRouteMetadata('search')).toMatchObject({
      name: 'search',
      title: 'Search',
      role: 'search',
      header: { shown: false, search: true, customHeaderException: true },
    });
  });
});
