import { Text, TextProps } from './Themed';

export function MonoText(props: TextProps) {
  // 🔥 SATTI FIX: Rendering high-fidelity consultant-grade monospace typography.
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}