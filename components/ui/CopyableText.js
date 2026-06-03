import { Text } from 'react-native';

export default function CopyableText({ children, selectable = true, ...props }) {
  return (
    <Text selectable={selectable} {...props}>
      {children}
    </Text>
  );
}
