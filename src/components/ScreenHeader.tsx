import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { Icon } from './Icon';

interface Props {
  title?: string;
  transparent?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  backIcon?: 'back' | 'close';
}

export function ScreenHeader({
  title,
  transparent = false,
  rightAction,
  onBack,
  backIcon = 'back',
}: Props) {
  const router = useRouter();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 4 },
        !transparent && styles.solid,
      ]}
    >
      <Pressable onPress={handleBack} style={styles.iconBtn}>
        <Icon name={backIcon} size={20} color={colors.ink} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title ?? ''}
      </Text>
      <View style={styles.rightSlot}>{rightAction ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    minHeight: 60,
  },
  solid: {
    backgroundColor: 'rgba(251,249,246,0.98)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...typography.serif,
    fontSize: 18,
    color: colors.ink,
  },
  rightSlot: {
    minWidth: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
