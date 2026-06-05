const {
  startAdapterVoiceRecordingAsync,
  stopAdapterVoiceRecordingAsync,
} = require('../audio/audio-adapter');

const MAX_DURATION_MS = 60000;

async function startVoiceRecordingAsync() {
  return startAdapterVoiceRecordingAsync();
}

async function stopVoiceRecordingAsync(recording) {
  return stopAdapterVoiceRecordingAsync(recording);
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
