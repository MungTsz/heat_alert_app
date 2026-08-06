import React, { PropsWithChildren } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

const SettingsSection = ({ title, subtitle, children }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.card}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555',
    marginBottom: 2,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
});

export default SettingsSection;
