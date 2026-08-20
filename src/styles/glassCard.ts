// src/styles/glassCard.ts
import { ViewStyle, TextStyle } from 'react-native';

export const glassCardStyle: ViewStyle = {
  backgroundColor: 'rgba(255,255,255,0.18)', // lighter, cleaner glass — was dark gray
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.35)',
  borderRadius: 16,
};

export const glassLabelText: TextStyle = {
  color: '#FFFFFF',
};
