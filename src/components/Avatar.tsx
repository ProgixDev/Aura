import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@theme/colors';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
const sizes: Record<Size, number> = {
  sm: 36,
  md: 52,
  lg: 64,
  xl: 96,
  xxl: 128,
};

interface Props {
  /** Real photo. When provided it covers the gradient glyph fallback. */
  source?: ImageSourcePropType;
  gradient?: readonly [string, string, ...string[]];
  size?: Size;
  rounded?: boolean;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Avatar with a real photo when `source` is set, otherwise the abstract
 * gradient glyph placeholder. The gradient also acts as the loading state
 * behind the image.
 */
export function Avatar({
  source,
  gradient = [colors.violet, colors.sky] as const,
  size = 'lg',
  rounded = true,
  online = false,
  style,
}: Props) {
  const px = sizes[size];
  return (
    <View
      style={[
        {
          width: px,
          height: px,
          borderRadius: rounded ? px / 2 : 18,
          overflow: 'hidden',
          backgroundColor: colors.violet,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {source ? (
        <Image
          source={source}
          // Explicit dimensions (not just absoluteFill) guarantee the photo is
          // constrained to the frame — otherwise an Image can fall back to its
          // intrinsic resolution and only the top-left corner shows through the
          // overflow:hidden box. `100%` fills the *actual* frame even when its
          // size is overridden via `style` (e.g. the search card forces 72px),
          // so the photo never sits smaller than its container. `cover` fills
          // the circle without distortion; the square, centred source portraits
          // keep the full face visible with nothing meaningful cropped.
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <Svg
          viewBox="0 0 64 64"
          style={StyleSheet.absoluteFillObject as any}
          width="100%"
          height="100%"
        >
          <Defs>
            <RadialGradient id="hl" cx="35%" cy="30%">
              <Stop offset="0%" stopColor="#fff" stopOpacity={0.5} />
              <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={22} cy={22} r={14} fill="url(#hl)" opacity={0.6} />
          <Circle cx={32} cy={34} r={18} fill="rgba(255,255,255,0.18)" />
          <Circle cx={32} cy={34} r={8} fill="rgba(45,37,64,0.18)" />
        </Svg>
      )}
      {online ? (
        <View
          style={[
            styles.dot,
            { width: px * 0.18, height: px * 0.18, borderRadius: px * 0.18 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.sage2,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
