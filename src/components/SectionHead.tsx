import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

interface Props {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionHead({ title, action, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction}>
          <Text style={styles.more}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: {
    ...typography.serifItalic,
    fontFamily: 'CormorantGaramond_500Medium',
    color: colors.ink,
    fontSize: 22,
  },
  more: {
    ...typography.bodyMedium,
    fontSize: 13,
    color: colors.violet2,
  },
});
