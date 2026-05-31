import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { colors } from '@theme/colors';
import { radii, spacing } from '@theme/spacing';
import { shadows } from '@theme/shadows';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  flat?: boolean;
}

export function Card({ children, style, padded = true, flat = false }: Props) {
  return (
    <View
      style={[
        styles.card,
        !flat && shadows.card,
        padded && { padding: spacing.base },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
  },
});
