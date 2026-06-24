import { StyleSheet, View } from 'react-native';
import { COLORS } from '../../../lib/constants';
import PhotoPanel from './PhotoPanel';
import PollPanel from './PollPanel';
import VoicePanel from './VoicePanel';
import VenuePanel from './VenuePanel';

// Host for the keyboard-replacement panels. Renders a fixed-height (== measured keyboard
// height) container so every attachment panel occupies the exact space the keyboard vacated.
export default function AttachmentPanel({ activePanel, height, photo, poll, voice, venue }) {
  if (!activePanel) return null;
  return (
    <View style={[styles.panel, { height }]}>
      {activePanel === 'photo' ? <PhotoPanel {...photo} /> : null}
      {activePanel === 'poll' ? <PollPanel {...poll} /> : null}
      {activePanel === 'voice' ? <VoicePanel {...voice} /> : null}
      {activePanel === 'venue' ? <VenuePanel {...venue} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: COLORS.bg },
});
