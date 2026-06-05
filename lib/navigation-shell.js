const DEFAULT_AUTHENTICATED_ROUTE = '/(tabs)/friends';
const ADD_ENTRY_ROUTE = '/add';

const PRIMARY_TABS = Object.freeze([
  Object.freeze({
    name: 'friends',
    label: 'Friends',
    title: 'Friends',
    role: 'planning',
    routeHref: '/(tabs)/friends',
    icon: Object.freeze({
      semantic: 'tab.friends',
      sfDefault: 'bubble.left.and.bubble.right',
      sfSelected: 'bubble.left.and.bubble.right.fill',
      fallbackDefault: 'chatbubbles-outline',
      fallbackSelected: 'chatbubbles',
    }),
  }),
  Object.freeze({
    name: 'feed',
    label: 'Feed',
    title: 'Feed',
    role: 'activity',
    routeHref: '/(tabs)/feed',
    icon: Object.freeze({
      semantic: 'tab.feed',
      sfDefault: 'newspaper',
      sfSelected: 'newspaper.fill',
      fallbackDefault: 'newspaper-outline',
      fallbackSelected: 'newspaper',
    }),
  }),
  Object.freeze({
    name: 'add-tab-placeholder',
    label: '',
    title: 'Add',
    role: 'create-rating',
    kind: 'add',
    routeHref: '/(tabs)/add-tab-placeholder',
    entryHref: ADD_ENTRY_ROUTE,
    icon: Object.freeze({
      semantic: 'tab.add',
      sfDefault: 'plus.circle',
      sfSelected: 'plus.circle.fill',
      fallbackDefault: 'add',
      fallbackSelected: 'add',
    }),
  }),
  Object.freeze({
    name: 'list',
    label: 'List',
    title: 'List',
    role: 'discovery',
    routeHref: '/(tabs)/list',
    icon: Object.freeze({
      semantic: 'tab.list',
      sfDefault: 'list.bullet',
      sfSelected: 'list.bullet',
      fallbackDefault: 'list-outline',
      fallbackSelected: 'list',
    }),
  }),
  Object.freeze({
    name: 'profile',
    label: 'Profile',
    title: 'Profile',
    role: 'identity',
    routeHref: '/(tabs)/profile',
    icon: Object.freeze({
      semantic: 'tab.profile',
      sfDefault: 'person.crop.circle',
      sfSelected: 'person.crop.circle.fill',
      fallbackDefault: 'person-outline',
      fallbackSelected: 'person',
    }),
  }),
]);

const HIDDEN_ROUTE_POLICIES = Object.freeze({
  leaderboard: Object.freeze({
    name: 'leaderboard',
    hidden: true,
    reason: 'deprecated-primary-navigation',
    replacement: '/(tabs)/friends',
  }),
});

const HIDDEN_TAB_ROUTES = Object.freeze(Object.keys(HIDDEN_ROUTE_POLICIES));

const TAB_IMPLEMENTATION_DECISION = Object.freeze({
  implementation: 'javascript-tabs',
  evaluatedAlternative: 'expo-router-unstable-native-tabs',
  decision: 'keep-javascript-tabs',
  blocker: 'center-add-must-open-add-modal-without-selecting-blank-primary-route',
  reevaluateWhen: 'native-tabs-supports-custom-tab-bar-button-or-non-selecting-modal-trigger-in-expo-go',
});

const ROUTE_METADATA = Object.freeze({
  index: Object.freeze({ name: 'index', title: 'Rounds', role: 'entry', header: Object.freeze({ shown: false }) }),
  onboarding: Object.freeze({ name: 'onboarding', title: 'Onboarding', role: 'onboarding', header: Object.freeze({ shown: false }) }),
  '(tabs)': Object.freeze({ name: '(tabs)', title: 'Rounds', role: 'app-shell', header: Object.freeze({ shown: false }) }),
  add: Object.freeze({ name: 'add', title: 'Add rating', role: 'create-rating', presentation: 'modal', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  'edit-profile': Object.freeze({ name: 'edit-profile', title: 'Edit profile', role: 'profile-edit', presentation: 'modal', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  venue: Object.freeze({ name: 'venue', title: 'Venue', role: 'venue', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  search: Object.freeze({ name: 'search', title: 'Search', role: 'search', header: Object.freeze({ shown: false, search: true, customHeaderException: true }) }),
  post: Object.freeze({ name: 'post', title: 'Review', role: 'post-projection', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  user: Object.freeze({ name: 'user', title: 'Profile', role: 'public-profile', header: Object.freeze({ shown: false, customHeaderException: true }) }),
});

const ONBOARDING_ROUTE_METADATA = Object.freeze({
  phone: Object.freeze({ name: 'phone', title: 'Phone', role: 'onboarding-phone', header: Object.freeze({ shown: false }) }),
  email: Object.freeze({ name: 'email', title: 'Email', role: 'onboarding-email', header: Object.freeze({ shown: false }) }),
  name: Object.freeze({ name: 'name', title: 'Name', role: 'onboarding-name', header: Object.freeze({ shown: false }) }),
  username: Object.freeze({ name: 'username', title: 'Username', role: 'onboarding-username', header: Object.freeze({ shown: false }) }),
  photo: Object.freeze({ name: 'photo', title: 'Photo', role: 'onboarding-photo', header: Object.freeze({ shown: false }) }),
  city: Object.freeze({ name: 'city', title: 'City', role: 'onboarding-city', header: Object.freeze({ shown: false }) }),
  preferences: Object.freeze({ name: 'preferences', title: 'Preferences', role: 'onboarding-preferences', header: Object.freeze({ shown: false }) }),
  spotify: Object.freeze({ name: 'spotify', title: 'Spotify', role: 'onboarding-spotify', header: Object.freeze({ shown: false }) }),
});

const ROOT_STACK_ROUTE_NAMES = Object.freeze(['index', 'onboarding', '(tabs)', 'add', 'edit-profile', 'venue']);
const ONBOARDING_STACK_ROUTE_NAMES = Object.freeze(['phone', 'email', 'name', 'username', 'photo', 'city', 'preferences', 'spotify']);

function cloneRouteMetadata(route) {
  return {
    ...route,
    header: route.header ? { ...route.header } : undefined,
  };
}

function buildStackScreen(route) {
  const metadata = cloneRouteMetadata(route);
  const options = {
    headerShown: metadata.header?.shown ?? false,
    title: metadata.title,
  };
  if (metadata.presentation) options.presentation = metadata.presentation;
  return { name: metadata.name, options, role: metadata.role };
}

function cloneTab(tab) {
  return {
    ...tab,
    icon: tab.icon ? { ...tab.icon } : null,
  };
}

function getPrimaryTabDescriptors() {
  return PRIMARY_TABS.map(cloneTab);
}

function getPrimaryTabNames() {
  return PRIMARY_TABS.map((tab) => tab.name);
}

function getVisibleTabLabels() {
  return PRIMARY_TABS.map((tab) => tab.label);
}

function getTabConfig(name) {
  const tab = PRIMARY_TABS.find((entry) => entry.name === name);
  return tab ? cloneTab(tab) : null;
}

function getNativeTabIcon(name) {
  const tab = PRIMARY_TABS.find((entry) => entry.name === name);
  if (!tab?.icon) return null;
  const { semantic: _semantic, ...nativeIcon } = tab.icon;
  return { ...nativeIcon };
}

function getTabIconName(name, focused = false) {
  const icon = getNativeTabIcon(name);
  if (!icon) return null;
  return focused ? icon.fallbackSelected : icon.fallbackDefault;
}

function getAddEntryRoute() {
  return ADD_ENTRY_ROUTE;
}

function getHiddenTabRouteNames() {
  return [...HIDDEN_TAB_ROUTES];
}

function getHiddenRoutePolicy(name) {
  const policy = HIDDEN_ROUTE_POLICIES[name];
  return policy ? { ...policy } : { name, hidden: false, reason: null };
}

function shouldHideTabRoute(name) {
  return Boolean(HIDDEN_ROUTE_POLICIES[name]?.hidden);
}

function getRouteMetadata(name) {
  const route = ROUTE_METADATA[name] || ONBOARDING_ROUTE_METADATA[name];
  return route ? cloneRouteMetadata(route) : null;
}

function getTabImplementationDecision() {
  return { ...TAB_IMPLEMENTATION_DECISION };
}

function getRootStackScreens() {
  return ROOT_STACK_ROUTE_NAMES.map((name) => buildStackScreen(ROUTE_METADATA[name]));
}

function getOnboardingStackScreens() {
  return ONBOARDING_STACK_ROUTE_NAMES.map((name) => buildStackScreen(ONBOARDING_ROUTE_METADATA[name]));
}

module.exports = {
  ADD_ENTRY_ROUTE,
  DEFAULT_AUTHENTICATED_ROUTE,
  HIDDEN_ROUTE_POLICIES,
  HIDDEN_TAB_ROUTES,
  ONBOARDING_ROUTE_METADATA,
  PRIMARY_TABS,
  ROOT_STACK_ROUTE_NAMES,
  ROUTE_METADATA,
  TAB_IMPLEMENTATION_DECISION,
  getAddEntryRoute,
  getHiddenRoutePolicy,
  getHiddenTabRouteNames,
  getNativeTabIcon,
  getOnboardingStackScreens,
  getPrimaryTabDescriptors,
  getPrimaryTabNames,
  getRootStackScreens,
  getRouteMetadata,
  getTabConfig,
  getTabIconName,
  getTabImplementationDecision,
  getVisibleTabLabels,
  shouldHideTabRoute,
};
module.exports.__esModule = true;
