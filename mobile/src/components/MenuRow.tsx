import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

interface Props {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  rightSlot?: React.ReactNode;
}

export function MenuRow({ icon, label, value, onPress, rightSlot }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.ic}>{icon}</View>
      <Text style={styles.lbl}>{label}</Text>
      {value ? <Text style={styles.v}>{value}</Text> : null}
      {rightSlot ?? <Icon name="chevron" size={18} color={colors.muted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  ic: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mist,
  },
  lbl: {
    flex: 1,
    ...typography.body,
    fontSize: 14.5,
  },
  v: { ...typography.small, fontSize: 13 },
});
