const {
  FIGMA_SOURCE,
  getFigmaFrameSpec,
  getFigmaPlaceholderPlan,
  getFigmaPlusMenuSpec,
  getFigmaScreenSpec,
  getFigmaScreenSpecs,
} = require('../figma-rounds-ui');
const {
  getPlusMenuActions,
  getPrimaryTabDescriptors,
  getPrimaryTabNames,
  getRootStackScreens,
  getRouteMetadata,
  getTabImplementationDecision,
  getVisibleTabLabels,
} = require('../navigation-shell');
const { getSemanticIcon } = require('../icon-platform');

const PRIMARY_SCREEN_NAMES = ['Friends', 'Plus Menu', 'Discover', 'My List', 'Profile', 'Chat'];

describe('Figma UI overhaul extracted design contract', () => {
  test('captures approved Figma file, frame, colors, and shared geometry', () => {
    expect(FIGMA_SOURCE).toEqual({
      fileKey: '8CcbpAdt4AMYS9hulRy15n',
      pageNodeId: '0:1',
      fileName: 'Rounds',
    });

    expect(getFigmaFrameSpec()).toEqual({
      width: 402,
      height: 874,
      background: '#F0F0F0',
      colors: {
        hero: '#084EB8',
        text: '#111827',
        placeholder: '#D9D9D9',
        secondaryGray: '#A0A0A0',
        tertiaryGray: '#B9B9B9',
      },
      title: { y: 68, fontSize: 20 },
      bottomNav: {
        iconY: 810,
        iconSize: 30,
        iconX: [34, 110, 186, 262, 338],
      },
    });
  });

  test('keeps screen inventory and precise Plus/Chat geometry from Figma', () => {
    expect(getFigmaScreenSpecs().map((screen) => screen.name)).toEqual(PRIMARY_SCREEN_NAMES);
    expect(getFigmaScreenSpec('Friends')).toMatchObject({
      title: { text: 'Friends', x: 26, y: 68 },
      actionIcon: { semantic: 'action.compose', x: 346, y: 68, size: 30 },
    });
    expect(getFigmaPlusMenuSpec()).toMatchObject({
      sheet: { x: 0, y: 437, width: 402, height: 437, radius: 30 },
      handle: { x: 141, y: 450, width: 120, height: 4, radius: 10 },
      tile: { width: 76, height: 76, radius: 16, color: '#084EB8' },
    });
    expect(getFigmaScreenSpec('Chat')).toMatchObject({
      headerTitle: { text: 'Group Chat', x: 158, y: 122, fontSize: 14 },
      composer: { x: 98, y: 489, width: 253, height: 39, radius: 20 },
      keyboard: { x: 0, y: 532, width: 402 },
    });
  });

  test('documents data-informed placeholder choices for sparse frames', () => {
    expect(getFigmaPlaceholderPlan()).toEqual({
      Friends: 'Use friends conversation and request summaries; fall back to gray avatar/conversation placeholders.',
      Discover: 'Use posts public projection/feed view-model data while user-facing copy says Discover.',
      'My List': 'Use saved/rated venue and ranking data where available; otherwise show empty gray rows.',
      Profile: 'Use current profile stats and ranked venues where available; keep public follower language out of Friendship.',
      Chat: 'Use conversation messages and native keyboard; extension tray replaces keyboard-height area.',
    });
  });
});

describe('Figma UI overhaul route shell contract', () => {
  test('models icon-only primary surfaces with Discover and formSheet Plus menu', () => {
    expect(getPrimaryTabNames()).toEqual(['friends', 'discover', 'plus', 'list', 'profile']);
    expect(getVisibleTabLabels()).toEqual(['', '', '', '', '']);
    expect(getPrimaryTabDescriptors().map((tab) => tab.title)).toEqual([
      'Friends',
      'Discover',
      'Plus',
      'My List',
      'Profile',
    ]);

    const plus = getPrimaryTabDescriptors().find((tab) => tab.name === 'plus');
    expect(plus).toMatchObject({
      kind: 'formSheet',
      opens: '/plus-menu',
      icon: { semantic: 'tab.plus' },
    });
    expect(plus).not.toHaveProperty('entryHref');
  });

  test('exposes approved Plus Menu actions and icon semantics', () => {
    expect(getPlusMenuActions()).toEqual([
      {
        id: 'rate-venue',
        label: 'Rate a venue',
        subtext: 'Add a new venue rating',
        href: '/add',
        iconSemantic: 'plus.rate-venue',
      },
      {
        id: 'create-group-chat',
        label: 'Create group chat',
        subtext: 'Start a conversation with friends',
        href: '/conversation/new',
        iconSemantic: 'plus.group-chat',
      },
      {
        id: 'create-post',
        label: 'Create a post',
        subtext: 'Share to the Discover feed',
        href: '/post/new',
        iconSemantic: 'plus.create-post',
      },
    ]);

    expect(getSemanticIcon('plus.group-chat')).toMatchObject({ heroOutline: 'ChatBubbleLeftRightIcon' });
    expect(getSemanticIcon('plus.rate-venue')).toMatchObject({ heroOutline: 'HandThumbUpIcon' });
    expect(getSemanticIcon('plus.create-post')).toMatchObject({ heroOutline: 'MegaphoneIcon' });
  });

  test('keeps Plus formSheet inside app shell and removes auth/onboarding shell dependencies', () => {
    expect(getRouteMetadata('plus-menu')).not.toBeNull();
    expect(getRootStackScreens().map((screen) => screen.name)).toContain('plus-menu');
    expect(getRootStackScreens().map((screen) => screen.name)).not.toContain('onboarding');
    expect(getRouteMetadata('onboarding')).toBeNull();
  });

  test('documents formSheet decision for the center Plus sheet', () => {
    expect(getTabImplementationDecision()).toEqual({
      implementation: 'expo-router-formSheet-for-plus-menu',
      evaluatedAlternative: 'javascript-tabs-with-centered-plus-drawer',
      decision: 'use-formSheet-for-native-sheet-behavior-and-fit-to-content',
      blocker: null,
      reevaluateWhen: null,
    });
  });
});
