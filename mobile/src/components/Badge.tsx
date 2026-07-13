import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';

type Variant = 'verified' | 'online' | 'novice' | 'featured' | 'soft';

interface Props {
  label: string;
  variant?: Variant;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'soft', leftIcon, style }: Props) {
  const palette = paletteFor(variant);
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      {leftIcon}
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

function paletteFor(v: Variant) {
  switch (v) {
    case 'verified':
      return { bg: colors.chipSage, fg: colors.chipSageText };
    case 'online':
      return { bg: colors.chipSky, fg: colors.chipSkyText };
    case 'novice':
      return { bg: colors.chipGold, fg: colors.chipGoldText };
    case 'featured':
      return { bg: colors.inkAlpha85, fg: '#fff' };
    case 'soft':
      return { bg: colors.inkAlpha06, fg: colors.ink };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.tiny,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
