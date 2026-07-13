import React from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@theme/colors';

interface Props {
  value: boolean;
  onValueChange?: (v: boolean) => void;
}

export function Toggle({ value, onValueChange }: Props) {
  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const left = anim.interpolate({ inputRange: [0, 1], outputRange: [3, 21] });
  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#D8D0C4', colors.sage2],
  });

  return (
    <Pressable onPress={() => onValueChange?.(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: bg }]}>
        <Animated.View style={[styles.thumb, { left }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 28,
    borderRadius: 14,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
});
