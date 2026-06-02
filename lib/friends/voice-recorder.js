const { Audio } = require('expo-av');

const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

const MAX_DURATION_MS = 60000;

async function startVoiceRecordingAsync() {
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
  return { recording };
}

async function stopVoiceRecordingAsync(recording) {
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  const status = await recording.getStatusAsync();
  const durationMs = status?.durationMillis || 0;
  return { uri, durationMs };
}

function startRecordingTimer(onTick, maxDurationMs = MAX_DURATION_MS) {
  const startTime = Date.now();
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    onTick(elapsed);
    if (elapsed >= maxDurationMs) {
      clearInterval(interval);
    }
  }, 100);

  return {
    stop: () => clearInterval(interval),
    getElapsed: () => Date.now() - startTime,
  };
}

module.exports = {
  MAX_DURATION_MS,
  startRecordingTimer,
  startVoiceRecordingAsync,
  stopVoiceRecordingAsync,
};
module.exports.__esModule = true;
