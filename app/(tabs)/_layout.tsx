import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

const items: Array<{
  name: 'index' | 'recherche' | 'messages' | 'evenements' | 'profil';
  label: string;
  icon: (active: boolean) => React.ReactNode;
}> = [
  {
    name: 'index',
    label: 'Accueil',
    icon: (a) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={a ? colors.ink : '#9C93AB'} strokeWidth={a ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V11z" />
      </Svg>
    ),
  },
  {
    name: 'recherche',
    label: 'Recherche',
    icon: (a) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={a ? colors.ink : '#9C93AB'} strokeWidth={a ? 1.8 : 1.6} strokeLinecap="round">
        <Circle cx="11" cy="11" r="7" />
        <Path d="m20 20-3.5-3.5" />
      </Svg>
    ),
  },
  {
    name: 'messages',
    label: 'Messages',
    icon: (a) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={a ? colors.ink : '#9C93AB'} strokeWidth={a ? 1.8 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </Svg>
    ),
  },
  {
    name: 'evenements',
    label: 'Événements',
    icon: (a) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={a ? colors.ink : '#9C93AB'} strokeWidth={a ? 1.8 : 1.6} strokeLinecap="round">
        <Rect x="3" y="4" width="18" height="18" rx="2" />
        <Line x1="16" y1="2" x2="16" y2="6" />
        <Line x1="8" y1="2" x2="8" y2="6" />
        <Line x1="3" y1="10" x2="21" y2="10" />
      </Svg>
    ),
  },
  {
    name: 'profil',
    label: 'Profil',
    icon: (a) => (
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={a ? colors.ink : '#9C93AB'} strokeWidth={a ? 1.8 : 1.6} strokeLinecap="round">
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx="12" cy="7" r="4" />
      </Svg>
    ),
  },
];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {items.map((it) => (
        <Tabs.Screen key={it.name} name={it.name} options={{ title: it.label }} />
      ))}
    </Tabs>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          height: 64 + Math.max(insets.bottom, 8),
        },
      ]}
    >
      <BlurView intensity={Platform.OS === 'ios' ? 30 : 0} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.bg} />
      <View style={styles.row}>
        {state.routes.map((route: any, index: number) => {
          const it = items.find((i) => i.name === route.name);
          if (!it) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
            >
              {it.icon(focused)}
              <Text style={[styles.label, focused && styles.labelActive]}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(251,249,246,0.85)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
  },
  label: {
    ...typography.tiny,
    fontSize: 10,
    color: '#9C93AB',
  },
  labelActive: {
    color: colors.ink,
  },
});
