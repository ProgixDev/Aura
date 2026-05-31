import React from 'react';
import { ImageBackground, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

const grainSrc = require('../../assets/images/grain.png');

interface Props {
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Full-cover noise overlay.
 *
 * Notes on rendering:
 *   - We DO NOT use `resizeMode="repeat"` because it's unreliable on iOS
 *     when combined with `StyleSheet.absoluteFillObject` (the tile renders
 *     once in the top-left instead of tiling).
 *   - Instead, the source is large enough (512×512 mono noise) to stretch
 *     across any phone surface via `resizeMode="cover"`. The slight scale-up
 *     produces softer, more film-like grain particles than tiny tiled noise.
 */
export function Grain({ opacity = 0.07, style }: Props) {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { opacity }, style]}
    >
      <ImageBackground
        source={grainSrc}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
