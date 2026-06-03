import { Ionicons } from '@expo/vector-icons';

export default function AppIcon({ name, size = 22, color, ...props }) {
  if (!name) return null;
  return <Ionicons name={name} size={size} color={color} {...props} />;
}
