const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

function exists(...segments) {
  return fs.existsSync(path.join(__dirname, '..', '..', ...segments));
}

describe('Figma route shell source contract', () => {
  test('index enters rebuilt Friends shell without auth/onboarding gate', () => {
    const source = read('app', 'index.js');

    expect(source).toContain("<Redirect href=\"/(tabs)/friends\" />");
    expect(source).not.toContain('useAuth');
    expect(source).not.toContain('resolveRoute');
    expect(source).not.toContain('/welcome');
    expect(source).not.toContain('/onboarding');
  });

  test('tab layout is icon-only and opens Plus formSheet from app shell', () => {
    const source = read('app', '(tabs)', '_layout.js');

    expect(source).toContain('getPrimaryTabDescriptors');
    expect(source).toContain('tabBarShowLabel: false');
    expect(source).toContain("tab.kind === 'formSheet'");
    expect(source).toContain("router.push('/plus-menu')");
    expect(source).toContain('event.preventDefault()');
    expect(source).toContain('tabBarIcon: ({ focused }) => <TabIcon focused={focused} tab={tab} />');
    expect(source).not.toContain('tabBarButton');
    expect(source).not.toContain('PlusActionDrawer');
    expect(source).not.toContain('useState(false)');
    expect(source).not.toContain('ADD_ENTRY_ROUTE');
  });

  test('tab icons use one baseline-aligned slot so glyphs sit on the same horizontal', () => {
    const source = read('app', '(tabs)', '_layout.js');

    expect(source).toContain('getTabIconVisual');
    expect(source).toContain('style={[styles.tabGlyph, getTabIconVisual(tab)]}');
    expect(source).toContain('tabBarIconStyle: styles.tabIconSlot');
    expect(source).toContain('width: 44');
    expect(source).toContain('height: 44');
    expect(source).toContain('lineHeight: size');
    expect(source).toContain('includeFontPadding: false');
    expect(source).toContain('textAlignVertical: \'center\'');
    expect(source).toContain('transform: translateY ? [{ translateY }] : undefined');
  });

  test('stale auth/onboarding and legacy tab routes are removed from rebuilt shell', () => {
    expect(exists('app', 'login.js')).toBe(false);
    expect(exists('app', 'welcome.js')).toBe(false);
    expect(exists('app', 'onboarding', 'phone.js')).toBe(false);
    expect(exists('app', '(tabs)', 'feed.js')).toBe(false);
    expect(exists('app', '(tabs)', 'add-tab-placeholder.js')).toBe(false);
    expect(exists('app', '(tabs)', 'leaderboard.js')).toBe(false);
  });

  test('Discover and Plus routes exist for the new primary nav model', () => {
    expect(exists('app', '(tabs)', 'discover.js')).toBe(true);
    expect(exists('app', '(tabs)', 'plus.js')).toBe(true);
    expect(exists('app', 'plus-menu.js')).toBe(true);

    const discover = read('app', '(tabs)', 'discover.js');
    expect(discover).toContain('Discover');
    expect(discover).toContain('buildFeedViewItems');
    expect(discover).not.toContain('FeedScreen');

    const shell = read('lib', 'navigation-shell.js');
    expect(shell).toContain('Rate a venue');
    expect(shell).toContain('Create group chat');
    expect(shell).toContain('Create a post');
  });
});
