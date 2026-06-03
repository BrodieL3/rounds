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

  test('Composer renders normal, replying, poll composer, and voice recording overlay', () => {
    const composer = read('components', 'conversation', 'Composer.js');

    expect(composer).toContain('Message...');
    expect(composer).toContain('replyComposerBar');
    expect(composer).toContain('Replying to');
    expect(composer).toContain('pollComposer');
    expect(composer).toContain('Send poll');
    expect(composer).toContain('voiceRecordingOverlay');
    expect(composer).toContain('Recording');
  });

  test('AttachmentMenu exposes Photo, Poll, Voice, Location options', () => {
    const menu = read('components', 'conversation', 'AttachmentMenu.js');

    expect(menu).toContain("text: 'Photo'");
    expect(menu).toContain("text: 'Poll'");
    expect(menu).toContain("text: 'Voice'");
    expect(menu).toContain("text: 'Location'");
  });

  test('route delegates to hook and components rather than owning send logic', () => {
    const route = read('app', 'conversation', '[id].js');

    expect(route).toContain('useConversationSurface');
    expect(route).toContain('MessageList');
    expect(route).toContain('MessageBubble');
    expect(route).toContain('Composer');
    expect(route).toContain('showAttachmentMenu');
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
