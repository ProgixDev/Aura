import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  PressableProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, auroraGradientDeep } from '@theme/colors';
import { radii } from '@theme/spacing';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';

type Variant = 'primary' | 'aurora' | 'ghost' | 'soft';
type Size = 'md' | 'sm';

interface Props extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
  disabled,
  ...rest
}: Props) {
  const h = size === 'sm' ? 40 : 52;
  const padH = size === 'sm' ? 16 : 22;
  const fontSize = size === 'sm' ? 13 : 15;

  const content = (
    <View style={styles.inner}>
      {leftIcon}
      <Text
        style={[
          typography.button,
          { fontSize, color: textColor(variant) },
        ]}
      >
        {label}
      </Text>
      {rightIcon}
    </View>
  );

  const base: ViewStyle = {
    height: h,
    paddingHorizontal: padH,
    borderRadius: radii.pill,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: disabled ? 0.55 : 1,
  };

  if (variant === 'aurora') {
    return (
      <Pressable
        disabled={disabled}
        {...rest}
        style={({ pressed }) => [
          base,
          shadows.glow,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
          style,
        ]}
      >
        <LinearGradient
          colors={auroraGradientDeep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radii.pill }]}
        />
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        base,
        variantStyle(variant),
        variant === 'primary' && shadows.button,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

function variantStyle(v: Variant): ViewStyle {
  switch (v) {
    case 'primary':
      return { backgroundColor: colors.ink };
    case 'ghost':
      return { backgroundColor: colors.inkAlpha06 };
    case 'soft':
      return {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.line,
      };
    default:
      return {};
  }
}

function textColor(v: Variant) {
  switch (v) {
    case 'primary':
    case 'aurora':
      return colors.pearl;
    case 'ghost':
    case 'soft':
      return colors.ink;
  }
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
  },
});
