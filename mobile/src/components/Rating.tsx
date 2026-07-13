import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lotus } from './Lotus';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

interface Props {
  value: number;
  count?: number;
  size?: number;
  showNumeric?: boolean;
  showCount?: boolean;
}

export function Rating({
  value,
  count,
  size = 14,
  showNumeric = true,
  showCount = true,
}: Props) {
  const rounded = Math.round(value);
  return (
    <View style={styles.row}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Lotus
          key={i}
          size={size}
          color={i < rounded ? colors.violet2 : 'rgba(120,110,140,0.22)'}
        />
      ))}
      {showNumeric ? (
        <Text style={styles.num}>{value.toFixed(1)}</Text>
      ) : null}
      {showCount && count != null ? (
        <Text style={styles.count}> · {count} avis</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  num: {
    ...typography.body,
    fontSize: 13,
    marginLeft: 4,
    color: colors.ink,
  },
  count: {
    ...typography.small,
    fontSize: 12,
  },
});
