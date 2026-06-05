const ExpoAudio = require('expo-audio');

const HIGH_QUALITY_PRESET = ExpoAudio.RecordingPresets.HIGH_QUALITY;

const RECORDING_OPTIONS = {
  ...HIGH_QUALITY_PRESET,
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  android: {
    ...(HIGH_QUALITY_PRESET?.android || {}),
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    ...(HIGH_QUALITY_PRESET?.ios || {}),
    outputFormat: ExpoAudio.IOSOutputFormat?.MPEG4AAC || HIGH_QUALITY_PRESET?.ios?.outputFormat,
    audioQuality: ExpoAudio.AudioQuality?.MEDIUM || HIGH_QUALITY_PRESET?.ios?.audioQuality,
  },
  web: {
    ...(HIGH_QUALITY_PRESET?.web || {}),
    mimeType: 'audio/mp4',
    bitsPerSecond: 64000,
  },
};

function getAudioRecorderConstructor() {
  return ExpoAudio.AudioRecorder || ExpoAudio.AudioModule?.AudioRecorder;
}

async function startAdapterVoiceRecordingAsync() {
  const permission = await ExpoAudio.requestRecordingPermissionsAsync();
  if (permission && permission.granted === false) {
    throw new Error('Microphone permission denied');
  }

  await ExpoAudio.setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  const Recorder = getAudioRecorderConstructor();
  if (!Recorder) {
    throw new Error('Expo audio recorder unavailable');
  }

  const recording = new Recorder(RECORDING_OPTIONS);
  await recording.prepareToRecordAsync();
  recording.record();
  return { recording };
}

async function stopAdapterVoiceRecordingAsync(recording) {
  if (!recording) return { uri: null, durationMs: 0 };
  await recording.stop();
  const status = typeof recording.getStatus === 'function' ? recording.getStatus() : null;
  const uri = recording.uri || status?.url || null;
  const durationMs = status?.durationMillis || recording.durationMillis || secondsToMs(recording.currentTime) || 0;
  return { uri, durationMs };
}

function secondsToMs(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) : 0;
}

function emitPlaybackStatus(player, onStatus, overrides = {}) {
  if (!onStatus) return;
  onStatus({
    playing: Boolean(player?.playing),
    positionMillis: secondsToMs(player?.currentTime),
    durationMillis: secondsToMs(player?.duration),
    didJustFinish: false,
    ...overrides,
  });
}

async function createVoicePlaybackAsync(uri, onStatus) {
  let player = null;
  let statusSubscription = null;
  try {
    player = ExpoAudio.createAudioPlayer(uri, { updateInterval: 250 });
    statusSubscription = player?.addListener?.('playbackStatusUpdate', (status) => {
      onStatus?.({
        playing: Boolean(status.playing),
        positionMillis: secondsToMs(status.currentTime),
        durationMillis: secondsToMs(status.duration),
        didJustFinish: Boolean(status.didJustFinish),
      });
    });
  } catch (err) {
    console.error('Voice playback setup error:', err);
  }

  return {
    play: async () => {
      if (!player) return;
      player.play?.();
      emitPlaybackStatus(player, onStatus, { playing: true });
    },
    pause: async () => {
      if (!player) return;
      player.pause?.();
      emitPlaybackStatus(player, onStatus, { playing: false });
    },
    unload: async () => {
      if (!player) return;
      statusSubscription?.remove?.();
      player.remove?.();
      statusSubscription = null;
      player = null;
    },
    getPositionMs: () => secondsToMs(player?.currentTime),
    getDurationMs: () => secondsToMs(player?.duration),
  };
}

module.exports = {
  RECORDING_OPTIONS,
  createVoicePlaybackAsync,
  startAdapterVoiceRecordingAsync,
  stopAdapterVoiceRecordingAsync,
};
module.exports.__esModule = true;
