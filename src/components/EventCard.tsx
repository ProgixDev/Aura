import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Grain } from './Grain';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';
import { shadows } from '@theme/shadows';
import type { Event } from '@data/types';

export function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}` as any)}
      style={[styles.card, shadows.card]}
    >
      <LinearGradient
        colors={event.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.img}
      >
        <Grain opacity={0.18} />
        <View style={styles.pill}>
          <Text style={styles.pillTxt}>{event.kind.split('·')[0].trim()}</Text>
        </View>
        <View style={styles.when}>
          <Text style={styles.whenTxt}>{event.when}</Text>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.placeRow}>
          <Icon name="pin" size={13} color={colors.muted} />
          <Text style={styles.place}>{event.where}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.priceTxt}>{event.price}</Text>
          <Text style={styles.cta}>Découvrir →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  img: {
    height: 140,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(45,37,64,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillTxt: {
    ...typography.tiny,
    color: '#fff',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  when: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  whenTxt: {
    ...typography.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  body: { paddingHorizontal: 16, paddingVertical: 14 },
  title: {
    ...typography.serif,
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    lineHeight: 23,
    marginBottom: 4,
  },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  place: { ...typography.small, fontSize: 12 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  priceTxt: { ...typography.small, fontSize: 13 },
  cta: {
    ...typography.bodyMedium,
    color: colors.violet2,
    fontSize: 13,
  },
});
