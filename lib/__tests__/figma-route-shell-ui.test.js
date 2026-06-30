const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

function exists(...segments) {
  return fs.existsSync(path.join(__dirname, '..', '..', ...segments));
}

describe('Figma route shell source contract', () => {
  test('index resolves auth + onboarding state before entering the app', () => {
    const source = read('app', 'index.js');

    // F1 on-ramp superseded the pre-auth Figma shell: index is now auth-gated.
    expect(source).toContain('useAuth');
    expect(source).toContain('resolveRoute');
    expect(source).not.toContain("<Redirect href=\"/(tabs)/friends\" />");
  });

  test('tab layout is icon-only and opens Plus formSheet from app shell', () => {
    const source = read('app', '(tabs)', '_layout.js');

    expect(source).toContain('getPrimaryTabDescriptors');
    expect(source).toContain('tabBarShowLabel: false');
    expect(source).toContain("tab.kind === 'formSheet'");
    expect(source).toContain('router.push(tab.opens)');
    expect(source).toContain('event.preventDefault()');
    expect(source).toContain('tabBarIcon: ({ focused }) => <TabIcon focused={focused} tab={tab} />');
    expect(source).not.toContain('tabBarButton');
    expect(source).not.toContain('PlusActionDrawer');
    expect(source).not.toContain('useState(false)');
    expect(source).not.toContain('ADD_ENTRY_ROUTE');
  });

  test('tab icons use one 44pt slot via the shared AppIcon visual', () => {
    const source = read('app', '(tabs)', '_layout.js');

    // Glyph rendering moved into components/ui/AppIcon; the slot geometry stays here.
    expect(source).toContain('getTabIconVisual');
    expect(source).toContain('style={[styles.tabGlyph, getTabIconVisual(tab)]}');
    expect(source).toContain('tabBarIconStyle: styles.tabIconSlot');
    expect(source).toContain('width: 44');
    expect(source).toContain('height: 44');
    expect(source).toContain('lineHeight: size');
    expect(source).toContain('transform: translateY ? [{ translateY }] : undefined');
  });

  test('the auth on-ramp exists and legacy figma-shell routes are gone', () => {
    // F1 added a real on-ramp — login/signup/onboarding EXIST by design now.
    expect(exists('app', 'login.js')).toBe(true);
    expect(exists('app', 'signup.js')).toBe(true);
    expect(exists('app', 'onboarding.js')).toBe(true);
    // Legacy figma-shell + deprecated tab routes stay gone.
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
