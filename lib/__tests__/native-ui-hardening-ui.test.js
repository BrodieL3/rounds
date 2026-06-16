const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('native UI hardening source wiring', () => {
  test('tab layout consumes centralized shell config and avoids fixed tab height', () => {
    const source = read('app', '(tabs)', '_layout.js');

    expect(source).toContain('getPrimaryTabDescriptors');
    expect(source).toContain("router.push('/plus-menu')");
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

  test('Discover and profile scroll roots use automatic native content insets without fake header padding', () => {
    const discoverSource = read('app', '(tabs)', 'discover.js');
    const profileSource = read('app', '(tabs)', 'profile.js');

    expect(discoverSource).toContain('contentInsetAdjustmentBehavior="automatic"');
    expect(profileSource).toContain('contentInsetAdjustmentBehavior="automatic"');
    expect(discoverSource).not.toContain('marginTop: 48');
    expect(profileSource).not.toContain('paddingTop: 48');
  });

  test('conversation route uses safe-area header and inset-aware message list without manual top padding', () => {
    const conversationSource = read('app', 'conversation', '[id].js');
    const messageListSource = read('components', 'conversation', 'MessageList.js');

    expect(conversationSource).toContain("import { SafeAreaView } from 'react-native-safe-area-context';");
    expect(conversationSource).toContain("<SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}>");
    expect(conversationSource).not.toContain('paddingTop: 54');
    expect(messageListSource).toContain('contentInsetAdjustmentBehavior="automatic"');
  });

  test('venue detail and rating scroll roots use automatic native content insets without fake header padding', () => {
    const venueSource = read('app', 'venue', '[id]', 'index.js');
    const rateSource = read('app', 'venue', '[id]', 'rate.js');

    expect(venueSource).toContain('contentInsetAdjustmentBehavior="automatic"');
    expect(rateSource).toContain('contentInsetAdjustmentBehavior="automatic"');
    expect(rateSource).not.toContain('marginTop: 48');
  });

  test('conversation companion routes avoid manual top padding and use native content insets', () => {
    const newConversationSource = read('app', 'conversation', 'new.js');
    const infoSource = read('app', 'conversation', '[id]', 'info.js');
    const shareVenueSource = read('app', 'conversation', 'share-venue.js');
    const shareReviewSource = read('app', 'conversation', 'share-review.js');

    for (const source of [newConversationSource, infoSource, shareVenueSource, shareReviewSource]) {
      expect(source).toContain('contentInsetAdjustmentBehavior="automatic"');
      expect(source).not.toContain('paddingTop: 54');
    }
  });

  test('remaining audited route scroll and list roots use native content insets without fake header spacing', () => {
    const sources = [
      read('app', '(tabs)', 'friends.js'),
      read('app', '(tabs)', 'list.js'),
      read('app', 'add.js'),
      read('app', 'edit-profile.js'),
      read('app', 'post', '[id].js'),
      read('app', 'search.js'),
      read('app', 'user', '[username].js'),
    ];

    for (const source of sources) {
      expect(source).toContain('contentInsetAdjustmentBehavior="automatic"');
      expect(source).not.toContain('paddingTop: 54');
      expect(source).not.toContain('marginTop: 48');
    }
  });
});
