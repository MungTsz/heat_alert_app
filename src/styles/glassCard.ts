// src/styles/glassCard.ts
import { ViewStyle, TextStyle } from 'react-native';

export const glassCardStyle: ViewStyle = {
  backgroundColor: 'rgba(70, 78, 88, 0.42)', // more opaque gray — improves text contrast
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.25)',
  borderRadius: 16,
};

export const glassLabelText: TextStyle = {
  color: '#FFFFFF',
};
