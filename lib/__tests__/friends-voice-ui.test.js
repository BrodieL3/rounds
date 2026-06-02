const fs = require('fs');
const path = require('path');

describe('Voice attachment UI wiring', () => {
  test('conversation screen imports voice service and recorder', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("require('../../lib/friends/voice-service')");
    expect(source).toContain("require('../../lib/friends/voice-recorder')");
    expect(source).toContain('sendDirectVoiceMessage');
    expect(source).toContain('sendGroupVoiceMessage');
  });

  test('conversation screen renders voice messages via VoiceBubble', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'conversation', '[id].js'), 'utf8');

    expect(source).toContain("item.type === 'voice'");
    expect(source).toContain('<VoiceBubble');
    expect(source).toContain('voiceRecordingOverlay');
    expect(source).toContain('stopRecordingAndSend');
  });

  test('VoiceBubble component exists', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', 'components', 'VoiceBubble.js'), 'utf8');

    expect(source).toContain('isVoicePlayableForViewer');
    expect(source).toContain('Audio.Sound.createAsync');
    expect(source).toContain('playAsync');
    expect(source).toContain('pauseAsync');
    expect(source).toContain('Temp');
    expect(source).toContain('Expired');
  });
});
