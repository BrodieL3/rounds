const PRIMARY_TABS = [
  {
    name: 'friends',
    label: 'Friends',
    icon: 'chatbubbles-outline',
    focusedIcon: 'chatbubbles',
  },
  {
    name: 'feed',
    label: 'Feed',
    icon: 'newspaper-outline',
    focusedIcon: 'newspaper',
  },
  {
    name: 'add-tab-placeholder',
    label: '',
    kind: 'add',
  },
  {
    name: 'list',
    label: 'List',
    icon: 'list-outline',
    focusedIcon: 'list',
  },
  {
    name: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    focusedIcon: 'person',
  },
];

const HIDDEN_TAB_ROUTES = ['leaderboard'];
const DEFAULT_AUTHENTICATED_ROUTE = '/(tabs)/friends';

function getPrimaryTabNames() {
  return PRIMARY_TABS.map((tab) => tab.name);
}

function getVisibleTabLabels() {
  return PRIMARY_TABS.map((tab) => tab.label);
}

function getTabConfig(name) {
  return PRIMARY_TABS.find((tab) => tab.name === name) || null;
}

function getTabIconName(name, focused = false) {
  const tab = getTabConfig(name);
  if (!tab || tab.kind === 'add') return null;
  return focused ? tab.focusedIcon : tab.icon;
}

module.exports = {
  DEFAULT_AUTHENTICATED_ROUTE,
  HIDDEN_TAB_ROUTES,
  PRIMARY_TABS,
  getPrimaryTabNames,
  getTabConfig,
  getTabIconName,
  getVisibleTabLabels,
};
module.exports.__esModule = true;
