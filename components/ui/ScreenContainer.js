import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function ScreenContainer({ children, style, edges = ['top', 'left', 'right'], ...props }) {
  return (
    <SafeAreaView edges={edges} style={[styles.container, style]} {...props}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
