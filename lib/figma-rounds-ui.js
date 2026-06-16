const FIGMA_SOURCE = Object.freeze({
  fileKey: '8CcbpAdt4AMYS9hulRy15n',
  pageNodeId: '0:1',
  fileName: 'Rounds',
});

const FRAME_SPEC = Object.freeze({
  width: 402,
  height: 874,
  background: '#F0F0F0',
  colors: Object.freeze({
    hero: '#084EB8',
    text: '#111827',
    placeholder: '#D9D9D9',
    secondaryGray: '#A0A0A0',
    tertiaryGray: '#B9B9B9',
  }),
  title: Object.freeze({ y: 68, fontSize: 20 }),
  bottomNav: Object.freeze({
    iconY: 810,
    iconSize: 30,
    iconX: Object.freeze([34, 110, 186, 262, 338]),
  }),
});

const PLUS_MENU_SPEC = Object.freeze({
  sheet: Object.freeze({ x: 0, y: 437, width: 402, height: 437, radius: 30 }),
  handle: Object.freeze({ x: 141, y: 450, width: 120, height: 4, radius: 10 }),
  tile: Object.freeze({ width: 76, height: 76, radius: 16, color: '#084EB8' }),
  tiles: Object.freeze([
    Object.freeze({ id: 'create-group-chat', x: 22, y: 487, icon: 'plus.group-chat' }),
    Object.freeze({ id: 'rate-venue', x: 24, y: 597, icon: 'plus.rate-venue' }),
    Object.freeze({ id: 'create-post', x: 24, y: 707, icon: 'plus.create-post' }),
  ]),
});

const SCREEN_SPECS = Object.freeze([
  Object.freeze({
    name: 'Friends',
    nodeId: '4:380',
    title: Object.freeze({ text: 'Friends', x: 26, y: 68, fontSize: 20 }),
    actionIcon: Object.freeze({ semantic: 'action.compose', x: 346, y: 68, size: 30 }),
    placeholders: Object.freeze([
      Object.freeze({ type: 'conversation-avatar', x: 23, y: 129, width: 52, height: 52 }),
      Object.freeze({ type: 'conversation-avatar', x: 23, y: 203, width: 52, height: 52 }),
      Object.freeze({ type: 'conversation-avatar', x: 23, y: 280, width: 52, height: 52 }),
      Object.freeze({ type: 'conversation-avatar', x: 23, y: 357, width: 52, height: 52 }),
      Object.freeze({ type: 'conversation-avatar', x: 23, y: 431, width: 52, height: 52 }),
      Object.freeze({ type: 'conversation-avatar', x: 23, y: 508, width: 52, height: 52 }),
    ]),
  }),
  Object.freeze({
    name: 'Plus Menu',
    nodeId: '10:1773',
    title: Object.freeze({ text: 'Friends', x: 26, y: 68, fontSize: 20, opacity: 0.7 }),
    plusMenu: PLUS_MENU_SPEC,
  }),
  Object.freeze({
    name: 'Discover',
    nodeId: '7:48',
    title: Object.freeze({ text: 'Discover', x: 25, y: 68, fontSize: 20 }),
    actionIcon: Object.freeze({ semantic: 'action.search', x: 351, y: 68, size: 21 }),
  }),
  Object.freeze({
    name: 'My List',
    figmaName: 'List',
    nodeId: '12:227',
    title: Object.freeze({ text: 'My List', x: 26, y: 68, fontSize: 20 }),
    actionIcon: Object.freeze({ semantic: 'action.filter', x: 352, y: 68, size: 24 }),
  }),
  Object.freeze({
    name: 'Profile',
    nodeId: '7:65',
    avatar: Object.freeze({ x: 159, y: 73, width: 84, height: 84 }),
    actions: Object.freeze([
      Object.freeze({ semantic: 'action.share', x: 306, y: 68, size: 24 }),
      Object.freeze({ semantic: 'action.more', x: 352, y: 68, size: 24 }),
    ]),
    title: Object.freeze({ text: 'First &. Last', x: 139, y: 172, fontSize: 20 }),
    username: Object.freeze({ text: '@username', x: 152, y: 199, fontSize: 16, opacity: 0.6 }),
  }),
  Object.freeze({
    name: 'Chat',
    nodeId: '9:419',
    backIcon: Object.freeze({ semantic: 'chat.back', x: 15, y: 76, size: 24 }),
    avatarStack: Object.freeze({ x: 170, y: 59, width: 61, height: 58 }),
    headerTitle: Object.freeze({ text: 'Group Chat', x: 158, y: 122, fontSize: 14 }),
    composer: Object.freeze({ x: 98, y: 489, width: 253, height: 39, radius: 20 }),
    keyboard: Object.freeze({ x: 0, y: 532, width: 402 }),
    composerIcons: Object.freeze({ cameraX: 15, gridX: 60, micX: 316, sendX: 363, y: 494 }),
  }),
]);

const PLACEHOLDER_PLAN = Object.freeze({
  Friends: 'Use friends conversation and request summaries; fall back to gray avatar/conversation placeholders.',
  Discover: 'Use posts public projection/feed view-model data while user-facing copy says Discover.',
  'My List': 'Use saved/rated venue and ranking data where available; otherwise show empty gray rows.',
  Profile: 'Use current profile stats and ranked venues where available; keep public follower language out of Friendship.',
  Chat: 'Use conversation messages and native keyboard; extension tray replaces keyboard-height area.',
});

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
  }
  return value;
}

function getFigmaFrameSpec() {
  return clone(FRAME_SPEC);
}

function getFigmaScreenSpecs() {
  return clone(SCREEN_SPECS);
}

function getFigmaScreenSpec(name) {
  const screen = SCREEN_SPECS.find((entry) => entry.name === name || entry.figmaName === name);
  return screen ? clone(screen) : null;
}

function getFigmaPlusMenuSpec() {
  return clone(PLUS_MENU_SPEC);
}

function getFigmaPlaceholderPlan() {
  return clone(PLACEHOLDER_PLAN);
}

module.exports = {
  FIGMA_SOURCE,
  getFigmaFrameSpec,
  getFigmaPlaceholderPlan,
  getFigmaPlusMenuSpec,
  getFigmaScreenSpec,
  getFigmaScreenSpecs,
};
module.exports.__esModule = true;
