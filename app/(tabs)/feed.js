import { StyleSheet, Text, View } from 'react-native';

export default function FeedScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Feed</Text>
      <Text style={styles.copy}>Friend activity, check-ins, and companion tags will live here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  copy: { fontSize: 16, marginTop: 12, color: '#475569' },
});
