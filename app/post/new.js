import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function CreatePostScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Create a post</Text>
      <Text style={styles.copy}>Post composer placeholder for Figma Plus Menu action.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  copy: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
