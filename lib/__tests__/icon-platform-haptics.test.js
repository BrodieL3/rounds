const fs = require('fs');
const path = require('path');
const { getSemanticIcon, getSemanticIconName } = require('../icon-platform');
const { createPlatformService } = require('../platform-service');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('semantic icon adapter', () => {
  test('resolves semantic tab icons to SF Symbols with Ionicons fallbacks', () => {
    expect(getSemanticIcon('tab.friends')).toEqual({
      sfDefault: 'bubble.left.and.bubble.right',
      sfSelected: 'bubble.left.and.bubble.right.fill',
      fallbackDefault: 'chatbubbles-outline',
      fallbackSelected: 'chatbubbles',
    });
    expect(getSemanticIcon('tab.discover')).toEqual({
      sfDefault: 'globe',
      sfSelected: 'globe',
      fallbackDefault: 'globe-outline',
      fallbackSelected: 'globe',
    });
    expect(getSemanticIconName('tab.friends', { focused: false })).toBe('chatbubbles-outline');
    expect(getSemanticIconName('tab.friends', { focused: true })).toBe('chatbubbles');
    expect(getSemanticIconName('tab.discover', { focused: false })).toBe('globe-outline');
    expect(getSemanticIconName('tab.discover', { focused: true })).toBe('globe');
  });

  test('preserves direct Ionicons fallback names and unknown semantics no-op', () => {
    expect(getSemanticIconName('add')).toBe('add');
    expect(getSemanticIconName('unknown.semantic')).toBe('unknown.semantic');
    expect(getSemanticIcon(null)).toBeNull();
  });

  test('AppIcon consumes semantic adapter while keeping Ionicons fallback renderer', () => {
    const source = read('components', 'ui', 'AppIcon.js');
    expect(source).toContain('getSemanticIconName');
    expect(source).toContain('Ionicons');
  });
});

describe('platform haptics service', () => {
  test('fires guarded haptics on iOS only', async () => {
    const impactAsync = jest.fn().mockResolvedValue(undefined);
    const service = createPlatformService({ platformOS: 'ios', haptics: { impactAsync, ImpactFeedbackStyle: { Light: 'Light' } } });

    await service.selectionHaptic();

    expect(impactAsync).toHaveBeenCalledWith('Light');
  });

  test('no-ops haptics on android/web and when dependency is missing', async () => {
    const impactAsync = jest.fn();
    await createPlatformService({ platformOS: 'android', haptics: { impactAsync } }).selectionHaptic();
    await createPlatformService({ platformOS: 'web', haptics: { impactAsync } }).selectionHaptic();
    await createPlatformService({ platformOS: 'ios', haptics: null }).selectionHaptic();

    expect(impactAsync).not.toHaveBeenCalled();
  });
});
