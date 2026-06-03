import { Alert } from 'react-native';

export default function showAttachmentMenu({ onPhoto, onPoll, onVoice, onLocation }) {
  Alert.alert('Attach', undefined, [
    { text: 'Photo', onPress: onPhoto },
    { text: 'Poll', onPress: onPoll },
    { text: 'Voice', onPress: onVoice },
    {
      text: 'Location',
      onPress: () => {
        Alert.alert('Share location', undefined, [
          {
            text: 'Current location',
            onPress: onLocation,
          },
          { text: 'Cancel', style: 'cancel' },
        ]);
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
