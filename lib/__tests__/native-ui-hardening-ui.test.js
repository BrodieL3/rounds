const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('native UI hardening source wiring', () => {
  test('tab layout consumes centralized shell config and avoids fixed tab height', () => {
    const source = read('app', '(tabs)', '_layout.js');

    expect(source).toContain('getPrimaryTabDescriptors');
    expect(source).toContain('getAddEntryRoute');
    expect(source).toContain('AppIcon');
    expect(source).toContain('tabBarHideOnKeyboard: true');
    expect(source).not.toContain('height: 80');
    expect(source).not.toContain('Ionicons');
  });

  test('chat secondary actions live behind long-press action surface', () => {
    const source = read('components', 'conversation', 'MessageBubble.js');

    expect(source).toContain('showMessageActions');
    expect(source).toContain('onLongPress={showMessageActions}');
    expect(source).toContain("Alert.alert('Message actions'");
    expect(source).toContain("style: 'destructive'");
    expect(source).not.toContain('styles.messageActions');
    expect(source).not.toContain('messageActionText');
  });

  test('venue address is copyable and report UI is modal/sheet-like', () => {
    const source = read('app', 'venue', '[id]', 'index.js');

    expect(source).toContain('Modal');
    expect(source).toContain('CopyableText');
    expect(source).toContain('presentationStyle="pageSheet"');
    expect(source).toContain('onRequestClose={() => setReportModal(false)}');
    expect(source).toContain('accessibilityLabel="Venue address"');
  });

  test('profile handle and member-since metadata are selectable', () => {
    const source = read('app', '(tabs)', 'profile.js');

    expect(source).toContain('CopyableText');
    expect(source).toContain('profileMemberSince');
    expect(source).toContain('accessibilityLabel="Profile username"');
    expect(source).toContain('accessibilityLabel="Profile member since"');
  });
});
