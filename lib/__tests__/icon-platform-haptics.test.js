const fs = require('fs');
const path = require('path');
const { getSemanticIcon, getSemanticIconName } = require('../icon-platform');
const { createPlatformService } = require('../platform-service');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('semantic icon adapter', () => {
  test('resolves semantic tab icons to SF Symbols with Heroicons component names', () => {
    expect(getSemanticIcon('tab.friends')).toEqual({
      sfDefault: 'person.2',
      sfSelected: 'person.2.fill',
      heroOutline: 'UsersIcon',
      heroSolid: 'UsersIcon',
    });
    expect(getSemanticIcon('tab.discover')).toEqual({
      sfDefault: 'globe.europe.africa',
      sfSelected: 'globe.europe.africa.fill',
      heroOutline: 'GlobeEuropeAfricaIcon',
      heroSolid: 'GlobeEuropeAfricaIcon',
    });
    expect(getSemanticIconName('tab.friends', { focused: false })).toBe('UsersIcon');
    expect(getSemanticIconName('tab.friends', { focused: true })).toBe('UsersIcon');
    expect(getSemanticIconName('tab.discover', { focused: false })).toBe('GlobeEuropeAfricaIcon');
    expect(getSemanticIconName('tab.discover', { focused: true })).toBe('GlobeEuropeAfricaIcon');
  });

  test('maps direct legacy icon names to Heroicons and unknown semantics no-op', () => {
    expect(getSemanticIconName('add')).toBe('PlusIcon');
    expect(getSemanticIconName('paper-plane-outline')).toBe('PaperAirplaneIcon');
    expect(getSemanticIconName('unknown.semantic')).toBeNull();
    expect(getSemanticIcon(null)).toBeNull();
  });

  test('AppIcon consumes semantic adapter through Heroicons renderer only', () => {
    const source = read('components', 'ui', 'AppIcon.js');
    expect(source).toContain('getSemanticIconName');
    expect(source).toContain('@heroicons/react/24/outline');
    expect(source).toContain('@heroicons/react/24/solid');
    expect(source).not.toContain('Ionicons');
    expect(source).not.toContain('@expo/vector-icons');
  });

  test('app and component source no longer import Expo vector icon pack', () => {
    const roots = ['app', 'components', 'lib'];
    const offenders = [];
    const visit = (dir) => {
      for (const entry of fs.readdirSync(path.join(__dirname, '..', '..', dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(rel);
        if (entry.isFile() && entry.name.endsWith('.js') && !rel.includes('__tests__')) {
          const source = read(rel);
          if (source.includes('@expo/vector-icons') || source.includes('Ionicons')) offenders.push(rel);
        }
      }
    };
    roots.forEach(visit);

    expect(offenders).toEqual([]);
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
