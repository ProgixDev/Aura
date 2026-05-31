import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';

type Tone = 'gold' | 'violet';

interface Props {
  title: string;
  body: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reassuring escrow / safety strip used at booking, exchange creation
 * and on domain pages ("ne remplace pas un avis médical").
 */
export function EscrowNotice({ title, body, tone = 'gold', style }: Props) {
  const palette =
    tone === 'gold'
      ? { bg: '#F4F0E6', icBg: colors.gold, fg: '#5D4F2E', strong: '#3D3015', icColor: '#3D3015' }
      : { bg: colors.chipViolet, icBg: colors.violet2, fg: '#5A3F8E', strong: '#3F2A6E', icColor: '#fff' };

  return (
    <View style={[styles.row, { backgroundColor: palette.bg }, style]}>
      <View style={[styles.ic, { backgroundColor: palette.icBg }]}>
        <Icon name="shield" size={14} color={palette.icColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: palette.strong }]}>{title}</Text>
        <Text style={[styles.body, { color: palette.fg }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radii.md + 2,
    alignItems: 'flex-start',
  },
  ic: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.bodyMedium,
    fontSize: 12,
    marginBottom: 2,
  },
  body: {
    ...typography.small,
    fontSize: 12,
    lineHeight: 17,
  },
});
