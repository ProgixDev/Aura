import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, StyleProp } from 'react-native';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';

export type ChipTone = 'neutral' | 'sky' | 'violet' | 'sage' | 'gold' | 'active';
type Size = 'md' | 'sm' | 'lg';

interface Props {
  label: string;
  tone?: ChipTone;
  active?: boolean;
  size?: Size;
  leftIcon?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  tone = 'neutral',
  active = false,
  size = 'md',
  leftIcon,
  onPress,
  style,
}: Props) {
  const palette = active ? toneFor('active') : toneFor(tone);
  const h = size === 'sm' ? 28 : size === 'lg' ? 42 : 34;
  const padH = size === 'sm' ? 10 : 14;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          height: h,
          paddingHorizontal: padH,
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      {leftIcon}
      <Text
        style={[
          typography.bodyMedium,
          { fontSize: size === 'sm' ? 11 : 12, color: palette.fg },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function toneFor(t: ChipTone) {
  switch (t) {
    case 'sky':
      return { bg: colors.chipSky, fg: colors.chipSkyText };
    case 'violet':
      return { bg: colors.chipViolet, fg: colors.chipVioletText };
    case 'sage':
      return { bg: colors.chipSage, fg: colors.chipSageText };
    case 'gold':
      return { bg: colors.chipGold, fg: colors.chipGoldText };
    case 'active':
      return { bg: colors.ink, fg: colors.pearl };
    default:
      return { bg: colors.inkAlpha06, fg: colors.ink };
  }
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
  },
});
