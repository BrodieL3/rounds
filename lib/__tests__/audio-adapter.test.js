let mockLastPlaybackListener;
let mockLastPlaybackSubscription;

jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setAudioModeAsync: jest.fn(async () => undefined),
  IOSOutputFormat: { MPEG4AAC: 'aac ' },
  AudioQuality: { MEDIUM: 64 },
  RecordingPresets: {
    HIGH_QUALITY: {
      extension: '.m4a',
      android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
      ios: { outputFormat: 'aac ', audioQuality: 127 },
      web: { mimeType: 'audio/webm' },
    },
  },
  AudioRecorder: jest.fn().mockImplementation(() => ({
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    uri: 'file:///voice.m4a',
    currentTime: 2.5,
    getStatus: jest.fn(() => ({ durationMillis: 1234, url: 'file:///voice.m4a' })),
  })),
  createAudioPlayer: jest.fn(() => {
    mockLastPlaybackSubscription = { remove: jest.fn() };
    return {
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      addListener: jest.fn((eventName, listener) => {
        mockLastPlaybackListener = listener;
        return mockLastPlaybackSubscription;
      }),
      currentTime: 1.5,
      duration: 3,
    };
  }),
}));

const ExpoAudio = require('expo-audio');
const {
  createVoicePlaybackAsync,
  startAdapterVoiceRecordingAsync,
  stopAdapterVoiceRecordingAsync,
} = require('../audio/audio-adapter');

describe('audio adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLastPlaybackListener = null;
    mockLastPlaybackSubscription = null;
  });

  test('starts m4a voice recording through expo-audio', async () => {
    const { recording } = await startAdapterVoiceRecordingAsync();

    expect(ExpoAudio.requestRecordingPermissionsAsync).toHaveBeenCalled();
    expect(ExpoAudio.setAudioModeAsync).toHaveBeenCalledWith({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    expect(ExpoAudio.AudioRecorder).toHaveBeenCalledWith(expect.objectContaining({
      extension: '.m4a',
      numberOfChannels: 1,
      bitRate: 64000,
      ios: expect.objectContaining({ outputFormat: 'aac ', audioQuality: 64 }),
    }));
    expect(recording.prepareToRecordAsync).toHaveBeenCalled();
    expect(recording.record).toHaveBeenCalled();
  });

  test('stops recording and reports uri/duration', async () => {
    const { recording } = await startAdapterVoiceRecordingAsync();
    const result = await stopAdapterVoiceRecordingAsync(recording);

    expect(recording.stop).toHaveBeenCalled();
    expect(result).toEqual({ uri: 'file:///voice.m4a', durationMs: 1234 });
  });

  test('creates playback wrapper for play, pause, cleanup, position, and finish status', async () => {
    const onStatus = jest.fn();
    const playback = await createVoicePlaybackAsync('https://example.com/voice.m4a', onStatus);

    playback.play();
    playback.pause();
    mockLastPlaybackListener({ currentTime: 3, duration: 3, playing: false, didJustFinish: true });

    expect(ExpoAudio.createAudioPlayer).toHaveBeenCalledWith('https://example.com/voice.m4a', { updateInterval: 250 });
    expect(playback.getPositionMs()).toBe(1500);
    expect(playback.getDurationMs()).toBe(3000);
    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({
      positionMillis: 3000,
      durationMillis: 3000,
      didJustFinish: true,
      playing: false,
    }));

    await playback.unload();
    expect(mockLastPlaybackSubscription.remove).toHaveBeenCalled();
  });

  test('playback no-ops when player is unavailable', async () => {
    ExpoAudio.createAudioPlayer.mockReturnValueOnce(null);
    const playback = await createVoicePlaybackAsync('bad');

    await expect(playback.play()).resolves.toBeUndefined();
    await expect(playback.pause()).resolves.toBeUndefined();
    await expect(playback.unload()).resolves.toBeUndefined();
  });
});
