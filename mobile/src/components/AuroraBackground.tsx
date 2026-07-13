import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  auroraGradient,
  auroraGradientDeep,
  auroraSoft,
  auroraWarm,
  auroraLight,
  auroraSoftLight,
} from '@theme/colors';
import { Grain } from './Grain';

type Variant = 'soft' | 'deep' | 'warm' | 'soft-card' | 'light' | 'soft-light';

const palette: Record<Variant, readonly [string, string, ...string[]]> = {
  soft: auroraGradient,         // dark default
  deep: auroraGradientDeep,     // darkest
  warm: auroraWarm,
  'soft-card': auroraSoft,
  light: auroraLight,           // old pastel preserved for opt-in
  'soft-light': auroraSoftLight,
};

interface Props {
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  rounded?: number;
  /** Grain intensity 0..1 (default 0.18 — subtle film grain). */
  grainOpacity?: number;
  /** Disable the grain overlay entirely. */
  noGrain?: boolean;
}

/**
 * Deep, grainy aurora gradient. Two-pass:
 *   1. LinearGradient with dark stops.
 *   2. Tiled noise PNG overlay at high opacity → tactile, filmic.
 */
export function AuroraBackground({
  variant = 'soft',
  style,
  children,
  rounded = 0,
  grainOpacity = 0.07,
  noGrain = false,
}: Props) {
  const stops = palette[variant];
  return (
    <View
      style={[
        styles.container,
        rounded ? { borderRadius: rounded } : null,
        style,
      ]}
    >
      <LinearGradient
        colors={stops as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {!noGrain ? <Grain opacity={grainOpacity} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
});
