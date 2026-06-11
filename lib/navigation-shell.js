const DEFAULT_AUTHENTICATED_ROUTE = '/(tabs)/friends';
const ADD_ENTRY_ROUTE = '/add';
const PLUS_MENU_ROUTE = '/plus-menu';

const PRIMARY_TABS = Object.freeze([
  Object.freeze({
    name: 'friends',
    label: '',
    title: 'Friends',
    role: 'planning',
    routeHref: '/(tabs)/friends',
    icon: Object.freeze({
      semantic: 'tab.friends',
      sfDefault: 'person.2',
      sfSelected: 'person.2.fill',
      heroOutline: 'UsersIcon',
      heroSolid: 'UsersIcon',
      visual: Object.freeze({ size: 30, translateY: 0 }),
    }),
  }),
  Object.freeze({
    name: 'discover',
    label: '',
    title: 'Discover',
    role: 'discovery',
    routeHref: '/(tabs)/discover',
    icon: Object.freeze({
      semantic: 'tab.discover',
      sfDefault: 'globe.europe.africa',
      sfSelected: 'globe.europe.africa.fill',
      heroOutline: 'GlobeEuropeAfricaIcon',
      heroSolid: 'GlobeEuropeAfricaIcon',
      visual: Object.freeze({ size: 30, translateY: 0 }),
    }),
  }),
  Object.freeze({
    name: 'plus',
    label: '',
    title: 'Plus',
    role: 'plus-menu',
    kind: 'formSheet',
    opens: '/plus-menu',
    routeHref: '/(tabs)/plus',
    icon: Object.freeze({
      semantic: 'tab.plus',
      sfDefault: 'plus',
      sfSelected: 'plus',
      heroOutline: 'PlusIcon',
      heroSolid: 'PlusIcon',
      visual: Object.freeze({ size: 30, translateY: 0 }),
    }),
  }),
  Object.freeze({
    name: 'list',
    label: '',
    title: 'My List',
    role: 'my-list',
    routeHref: '/(tabs)/list',
    icon: Object.freeze({
      semantic: 'tab.list',
      sfDefault: 'line.3.horizontal',
      sfSelected: 'line.3.horizontal',
      heroOutline: 'Bars3Icon',
      heroSolid: 'Bars3Icon',
      visual: Object.freeze({ size: 30, translateY: 0 }),
    }),
  }),
  Object.freeze({
    name: 'profile',
    label: '',
    title: 'Profile',
    role: 'identity',
    routeHref: '/(tabs)/profile',
    icon: Object.freeze({
      semantic: 'tab.profile',
      sfDefault: 'person.circle',
      sfSelected: 'person.circle.fill',
      heroOutline: 'UserCircleIcon',
      heroSolid: 'UserCircleIcon',
      visual: Object.freeze({ size: 30, translateY: 0 }),
    }),
  }),
]);

const PLUS_MENU_ACTIONS = Object.freeze([
  Object.freeze({
    id: 'rate-venue',
    label: 'Rate a venue',
    subtext: 'Add a new venue rating',
    href: ADD_ENTRY_ROUTE,
    iconSemantic: 'plus.rate-venue',
  }),
  Object.freeze({
    id: 'create-group-chat',
    label: 'Create group chat',
    subtext: 'Start a conversation with friends',
    href: '/conversation/new',
    iconSemantic: 'plus.group-chat',
  }),
  Object.freeze({
    id: 'create-post',
    label: 'Create a post',
    subtext: 'Share to the Discover feed',
    href: '/post/new',
    iconSemantic: 'plus.create-post',
  }),
]);

const HIDDEN_ROUTE_POLICIES = Object.freeze({
  leaderboard: Object.freeze({
    name: 'leaderboard',
    hidden: true,
    reason: 'deprecated-primary-navigation',
    replacement: '/(tabs)/friends',
  }),
  feed: Object.freeze({
    name: 'feed',
    hidden: true,
    reason: 'discover-replaces-feed-ui',
    replacement: '/(tabs)/discover',
  }),
  'add-tab-placeholder': Object.freeze({
    name: 'add-tab-placeholder',
    hidden: true,
    reason: 'plus-drawer-replaces-add-placeholder-tab',
    replacement: '/(tabs)/plus',
  }),
});

const HIDDEN_TAB_ROUTES = Object.freeze([]);

const TAB_IMPLEMENTATION_DECISION = Object.freeze({
  implementation: 'expo-router-formSheet-for-plus-menu',
  evaluatedAlternative: 'javascript-tabs-with-centered-plus-drawer',
  decision: 'use-formSheet-for-native-sheet-behavior-and-fit-to-content',
  blocker: null,
  reevaluateWhen: null,
});

const ROUTE_METADATA = Object.freeze({
  index: Object.freeze({ name: 'index', title: 'Rounds', role: 'entry', header: Object.freeze({ shown: false }) }),
  '(tabs)': Object.freeze({ name: '(tabs)', title: 'Rounds', role: 'app-shell', header: Object.freeze({ shown: false }) }),
  add: Object.freeze({ name: 'add', title: 'Rate a venue', role: 'rate-venue', presentation: 'modal', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  'edit-profile': Object.freeze({ name: 'edit-profile', title: 'Edit profile', role: 'profile-edit', presentation: 'modal', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  post: Object.freeze({ name: 'post', title: 'Post', role: 'post', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  conversation: Object.freeze({ name: 'conversation', title: 'Conversation', role: 'conversation', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  venue: Object.freeze({ name: 'venue', title: 'Venue', role: 'venue', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  search: Object.freeze({ name: 'search', title: 'Search', role: 'search', header: Object.freeze({ shown: false, search: true, customHeaderException: true }) }),
  'plus-menu': Object.freeze({ name: 'plus-menu', title: 'Plus', role: 'plus-menu', presentation: 'formSheet', sheet: Object.freeze({ allowedDetents: 'fitToContents', grabberVisible: true, cornerRadius: 30 }), header: Object.freeze({ shown: false, customHeaderException: true }), contentStyle: Object.freeze({ backgroundColor: 'transparent' }) }),
  user: Object.freeze({ name: 'user', title: 'Profile', role: 'public-profile', header: Object.freeze({ shown: false, customHeaderException: true }) }),
  login: Object.freeze({ name: 'login', title: 'Sign in', role: 'auth', header: Object.freeze({ shown: false }) }),
});

const ROOT_STACK_ROUTE_NAMES = Object.freeze(['index', '(tabs)', 'add', 'edit-profile', 'post', 'conversation', 'venue', 'search', 'user', 'plus-menu', 'login']);
const ONBOARDING_STACK_ROUTE_NAMES = Object.freeze([]);

function cloneRouteMetadata(route) {
  return {
    ...route,
    header: route.header ? { ...route.header } : undefined,
    sheet: route.sheet ? {
      ...route.sheet,
      allowedDetents: Array.isArray(route.sheet.allowedDetents)
        ? [...route.sheet.allowedDetents]
        : route.sheet.allowedDetents,
    } : undefined,
    contentStyle: route.contentStyle ? { ...route.contentStyle } : undefined,
  };
}

function buildStackScreen(route) {
  const metadata = cloneRouteMetadata(route);
  const options = {
    headerShown: metadata.header?.shown ?? false,
    title: metadata.title,
  };
  if (metadata.presentation) options.presentation = metadata.presentation;
  if (metadata.sheet) {
    if (Array.isArray(metadata.sheet.allowedDetents)) {
      options.sheetAllowedDetents = [...metadata.sheet.allowedDetents];
    } else {
      options.sheetAllowedDetents = metadata.sheet.allowedDetents;
    }
    options.sheetGrabberVisible = metadata.sheet.grabberVisible;
    options.sheetCornerRadius = metadata.sheet.cornerRadius;
  }
  if (metadata.contentStyle) options.contentStyle = { ...metadata.contentStyle };
  return { name: metadata.name, options, role: metadata.role };
}

function cloneTab(tab) {
  return {
    ...tab,
    icon: tab.icon ? {
      ...tab.icon,
      visual: tab.icon.visual ? { ...tab.icon.visual } : undefined,
    } : null,
  };
}

function clonePlusAction(action) {
  return { ...action };
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
  const { semantic: _semantic, visual: _visual, ...nativeIcon } = tab.icon;
  return { ...nativeIcon };
}

function getTabIconName(name, focused = false) {
  const icon = getNativeTabIcon(name);
  if (!icon) return null;
  return focused ? icon.heroSolid : icon.heroOutline;
}

function getAddEntryRoute() {
  return ADD_ENTRY_ROUTE;
}

function getPlusMenuActions() {
  return PLUS_MENU_ACTIONS.map(clonePlusAction);
}

function getPlusMenuRoute() {
  return PLUS_MENU_ROUTE;
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
  const route = ROUTE_METADATA[name];
  return route ? cloneRouteMetadata(route) : null;
}

function getTabImplementationDecision() {
  return { ...TAB_IMPLEMENTATION_DECISION };
}

function getRootStackScreens() {
  return ROOT_STACK_ROUTE_NAMES.map((name) => buildStackScreen(ROUTE_METADATA[name]));
}

function getOnboardingStackScreens() {
  return [];
}

module.exports = {
  ADD_ENTRY_ROUTE,
  DEFAULT_AUTHENTICATED_ROUTE,
  HIDDEN_ROUTE_POLICIES,
  HIDDEN_TAB_ROUTES,
  ONBOARDING_STACK_ROUTE_NAMES,
  PRIMARY_TABS,
  PLUS_MENU_ACTIONS,
  PLUS_MENU_ROUTE,
  ROOT_STACK_ROUTE_NAMES,
  ROUTE_METADATA,
  TAB_IMPLEMENTATION_DECISION,
  getAddEntryRoute,
  getHiddenRoutePolicy,
  getHiddenTabRouteNames,
  getNativeTabIcon,
  getOnboardingStackScreens,
  getPlusMenuActions,
  getPlusMenuRoute,
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
