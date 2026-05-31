import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { Chip, ChipTone } from './Chip';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';
import { shadows } from '@theme/shadows';
import type { Exchange } from '@data/types';

const tagToneMap: Record<string, ChipTone> = {
  'Soin contre soin': 'violet',
  'Service contre soin': 'gold',
  'Bénévolat': 'sage',
  'Formation contre formation': 'sky',
};

export function ExchangeCard({ exchange }: { exchange: Exchange }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/exchange/${exchange.id}` as any)}
      style={[styles.card, shadows.card]}
    >
      <View style={styles.head}>
        <View style={styles.who}>
          <Avatar gradient={exchange.avatar} size="sm" />
          <View>
            <Text style={styles.name}>{exchange.who}</Text>
            <Text style={styles.role}>{exchange.role}</Text>
          </View>
        </View>
        <Chip
          label={exchange.tag}
          tone={tagToneMap[exchange.tag] ?? 'sky'}
          size="sm"
        />
      </View>
      <View style={styles.flow}>
        <View style={styles.side}>
          <Text style={styles.flowLabel}>Propose</Text>
          <Text style={styles.flowValue}>{exchange.give}</Text>
        </View>
        <View style={styles.arrow}>
          <Icon name="chevron" size={16} color="#fff" />
        </View>
        <View style={styles.side}>
          <Text style={styles.flowLabel}>Cherche</Text>
          <Text style={styles.flowValue}>{exchange.want}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    backgroundColor: colors.white,
    borderRadius: 22,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { ...typography.bodyMedium, fontSize: 14 },
  role: { ...typography.tiny },
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  side: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.mist,
    borderRadius: radii.md,
  },
  flowLabel: {
    ...typography.tiny,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  flowValue: {
    ...typography.serif,
    fontSize: 15,
    fontFamily: 'CormorantGaramond_500Medium',
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
