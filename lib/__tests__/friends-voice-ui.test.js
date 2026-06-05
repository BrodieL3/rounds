const fs = require('fs');
const path = require('path');

function read(...segments) {
  return fs.readFileSync(path.join(__dirname, '..', '..', ...segments), 'utf8');
}

describe('Voice attachment UI wiring', () => {
  test('conversation surface imports voice service and recorder', () => {
    const hook = read('hooks', 'useConversationSurface.js');

    expect(hook).toContain("require('../lib/friends/voice-service')");
    expect(hook).toContain("require('../lib/friends/voice-recorder')");
    expect(hook).toContain('sendDirectVoiceMessage');
    expect(hook).toContain('sendGroupVoiceMessage');
  });

  test('MessageBubble renders voice messages via VoiceBubble', () => {
    const bubble = read('components', 'conversation', 'MessageBubble.js');

    expect(bubble).toContain("message.type === 'voice'");
    expect(bubble).toContain('<VoiceBubble');
  });

  test('Composer renders voice recording overlay', () => {
    const composer = read('components', 'conversation', 'Composer.js');
    const hook = read('hooks', 'useConversationSurface.js');

    expect(composer).toContain('voiceRecordingOverlay');
    expect(composer).toContain('onStopRecording');
    expect(hook).toContain('stopRecordingAndSend');
  });

  test('VoiceBubble component exists', () => {
    const source = read('components', 'VoiceBubble.js');

    expect(source).toContain('isVoicePlayableForViewer');
    expect(source).toContain('createVoicePlaybackAsync');
    expect(source).toContain('play()');
    expect(source).toContain('pause()');
    expect(source).not.toContain('expo-av');
    expect(source).toContain('Temp');
    expect(source).toContain('Expired');
  });
});
