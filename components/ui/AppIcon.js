import { Ionicons } from '@expo/vector-icons';
import { getSemanticIconName } from '../../lib/icon-platform';

export default function AppIcon({ name, focused = false, size = 22, color, ...props }) {
  const iconName = getSemanticIconName(name, { focused });
  if (!iconName) return null;
  return <Ionicons name={iconName} size={size} color={color} {...props} />;
}
