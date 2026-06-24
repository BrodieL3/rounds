const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Conversation surface modules', () => {
  test('hook imports all send services and safety services', () => {
    const hook = read('hooks', 'useConversationSurface.js');

    expect(hook).toContain('sendDirectTextMessage');
    expect(hook).toContain('sendGroupTextMessage');
    expect(hook).toContain('sendDirectPhotoMessage');
    expect(hook).toContain('sendGroupPhotoMessage');
    expect(hook).toContain('sendDirectPollMessage');
    expect(hook).toContain('sendGroupPollMessage');
    expect(hook).toContain('sendDirectLocationMessage');
    expect(hook).toContain('sendGroupLocationMessage');
    expect(hook).toContain('sendDirectVoiceMessage');
    expect(hook).toContain('sendGroupVoiceMessage');
    expect(hook).toContain('hideMessageForSelf');
    expect(hook).toContain('deleteMessageForEveryone');
    expect(hook).toContain('reportTarget');
    expect(hook).toContain('castPollVote');
  });

  test('hook manages conversation load, messages, sender profiles, photo URLs, reactions', () => {
    const hook = read('hooks', 'useConversationSurface.js');

    expect(hook).toContain('loadConversation');
    expect(hook).toContain('subscribeConversationMessages');
    expect(hook).toContain('markConversationSeen');
    expect(hook).toContain('setSenderProfiles');
    expect(hook).toContain('setPhotoUrls');
    expect(hook).toContain('setMessageReactions');
    expect(hook).toContain('onSnapshot');
  });

  test('MessageBubble renders text, photo, poll, location, voice, venue link, review link, deleted tombstone', () => {
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(bubble).toContain('message.text');
    expect(bubble).toContain("message.type === 'photo'");
    expect(bubble).toContain("message.type === 'poll'");
    expect(bubble).toContain("message.type === 'location'");
    expect(bubble).toContain("message.type === 'voice'");
    expect(bubble).toContain("message.type === 'venue_link'");
    expect(bubble).toContain("message.type === 'review_link'");
    expect(bubble).toContain('Message deleted.');
    expect(bubble).toContain('replyToMessageId');
    expect(bubble).toContain('replyToPreview');
    expect(bubble).toContain('reactionsBar');
    expect(bubble).toContain('reactionPill');
  });

  test('Composer is the input row; attachment flows live in keyboard-height panels', () => {
    const composer = read('components', 'conversation', 'Composer.js');

    expect(composer).toContain('Message...');
    expect(composer).toContain('replyComposerBar');
    expect(composer).toContain('Replying to');
    expect(composer).toContain('AttachmentMenu');
    // poll/voice composers moved out of the Composer into keyboard-height panels
    expect(composer).not.toContain('pollComposer');
    expect(composer).not.toContain('voiceRecordingOverlay');
  });

  test('AttachmentMenu exposes Photo, Voice, Venue (and group-only Poll) as animated circles', () => {
    const menu = read('components', 'conversation', 'AttachmentMenu.js');

    expect(menu).toContain("label: 'Photo'");
    expect(menu).toContain("label: 'Poll'");
    expect(menu).toContain("label: 'Voice'");
    expect(menu).toContain("label: 'Venue'");
    // Poll is gated to group chats; selecting an option opens a panel via onSelect.
    expect(menu).toMatch(/key:\s*'poll'[\s\S]*groupOnly:\s*true/);
    expect(menu).toContain('onSelect');
    expect(menu).toContain('Animated');
    expect(menu).toContain('optionCircle');
    expect(menu).not.toContain('Alert.alert');
  });

  test('AttachmentPanel hosts panels at the measured keyboard height', () => {
    const route = read('app', 'conversation', '[id].js');
    const host = read('components', 'conversation', 'panels', 'AttachmentPanel.js');

    expect(route).toContain('AttachmentPanel');
    expect(route).toMatch(/endCoordinates\?\.height/);
    expect(route).toContain('setActivePanel');
    expect(route).toContain('Keyboard.dismiss()');
    expect(host).toContain('height');
    expect(host).toMatch(/PhotoPanel|PollPanel|VoicePanel|VenuePanel/);
  });

  test('composer docks above the safe area when the keyboard is down', () => {
    const route = read('app', 'conversation', '[id].js');
    const composer = read('components', 'conversation', 'Composer.js');

    // Route tracks keyboard visibility and passes a collapsing bottom inset.
    expect(route).toContain('useSafeAreaInsets');
    expect(route).toMatch(/Keyboard\.addListener/);
    expect(route).toMatch(/keyboardShown \|\| activePanel\)\s*\?\s*0\s*:\s*insets\.bottom/);
    expect(route).toContain('bottomInset={composerBottomInset}');
    // Composer docks the buttons row at the safe-area inset, floored at the base 12px.
    expect(composer).toContain('bottomInset');
    expect(composer).toMatch(/paddingBottom:\s*Math\.max\(12,\s*bottomInset\)/);
  });

  test('route delegates to hook and components rather than owning send logic', () => {
    const route = read('app', 'conversation', '[id].js');

    expect(route).toContain('useConversationSurface');
    expect(route).toContain('MessageList');
    expect(route).toContain('MessageBubble');
    expect(route).toContain('Composer');
    expect(route).toContain('onSelectAttachment');
    expect(route).toContain('AttachmentPanel');
    expect(route).not.toContain('sendDirectTextMessage');
    expect(route).not.toContain('sendGroupTextMessage');
    expect(route).not.toContain('subscribeConversationMessages');
  });

  test('MessageList wraps FlatList with empty state', () => {
    const list = read('components', 'conversation', 'MessageList.js');

    expect(list).toContain('FlatList');
    expect(list).toContain('ListEmptyComponent');
    expect(list).toContain('emptyTitle');
    expect(list).toContain('emptyBody');
  });
});
