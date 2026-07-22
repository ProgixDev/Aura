import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Grain } from '@components/Grain';
import { colors } from '@theme/colors';
import { useSession } from '@store/session';
import { api } from '@data/api/client';

const MIN_SPLASH_MS = 1400;

// A stale/expired token must never fall through to `/(tabs)` just because
// `hasSeenOnboarding` is still true from a past session — that was the
// original bug (app "logged in directly" with no real check). This always
// re-verifies the persisted token against the backend before deciding.
async function resolveDestination(): Promise<string> {
  const { token, userType, hasSeenOnboarding, signOut } = useSession.getState();
  if (!token || !userType) {
    return hasSeenOnboarding ? '/onboarding/auth?mode=login' : '/onboarding';
  }
  const path = userType === 'praticien' ? '/praticien/check-token' : '/client/check-token';
  const valid = await api.get(path).then(() => true).catch(() => false);
  // Praticiens get the dashboard; clients get the seeker tabs. Routing both to
  // '/(tabs)' showed praticiens the client experience.
  if (valid) return userType === 'praticien' ? '/dashboard' : '/(tabs)';
  signOut();
  return '/onboarding/auth?mode=login';
}

const { width } = Dimensions.get('window');

/**
 * Splash — "GuériEnergies" wordmark over a deep-violet → ink gradient with
 * subtle film grain. The mark breathes (opacity + 1px scale) and a hair-thin
 * underline draws in once on mount. Tap anywhere to advance; otherwise it
 * navigates once resolveDestination() (a real token check) resolves, no
 * sooner than MIN_SPLASH_MS so the animation never flashes by instantly.
 */
export default function SplashRoute() {
  const router = useRouter();
  const navigated = useRef(false);
  const advance = () => {
    if (navigated.current) return;
    navigated.current = true;
    resolveDestination().then((dest) => router.replace(dest as any));
  };

  // Mount-in: opacity + slight y-rise for the wordmark.
  const enter = useRef(new Animated.Value(0)).current;
  // Slow breath: scale 1.00 ⇄ 1.015 + opacity 1 ⇄ 0.92.
  const breath = useRef(new Animated.Value(0)).current;
  // Underline width: animates from 0 → 80% of wordmark width.
  const underline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enter, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(underline, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const t = setTimeout(advance, MIN_SPLASH_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enter, breath, underline]);

  const enterTransform = enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });
  const underlineW = underline.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.42] });

  return (
    <Pressable style={{ flex: 1 }} onPress={advance}>
      <StatusBar style="light" />
      {/* Deep violet → ink, diagonal. */}
      <LinearGradient
        colors={['#2A1F4A', '#11091C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Subtle film grain. */}
      <Grain opacity={0.07} />

      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: Animated.multiply(enter, breathOpacity),
            transform: [{ translateY: enterTransform }, { scale: breathScale }],
            alignItems: 'center',
          }}
        >
          <Text style={styles.wordmark}>GuériEnergies</Text>
          <Animated.View style={[styles.underline, { width: underlineW }]} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  wordmark: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 46,
    lineHeight: 52,
    color: '#FBF9F6',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingHorizontal: 24,
    // Soft halo so the mark sits in the gradient rather than on top of it.
    textShadowColor: 'rgba(196,176,232,0.18)',
    textShadowRadius: 40,
  },
  underline: {
    height: 1,
    marginTop: 18,
    backgroundColor: 'rgba(251,249,246,0.55)',
  },
});
