import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Grain } from './Grain';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import type { Circle } from '@data/types';

export function CircleCard({ circle }: { circle: Circle }) {
  const router = useRouter();
  const accent = circle.color ?? colors.violet;
  const gradient = [accent, colors.ink] as const;

  return (
    <Pressable
      onPress={() => router.push(`/cercles/${circle.id}` as any)}
      style={[styles.card, shadows.card]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.img}
      >
        <Grain opacity={0.18} />
        <Text style={styles.name}>{circle.nom}</Text>
      </LinearGradient>
      <View style={styles.body}>
        {circle.animateur ? (
          <View style={styles.animateurRow}>
            <Icon name="inperson" size={13} color={colors.muted} />
            <Text style={styles.animateur}>Animé par {circle.animateur}</Text>
          </View>
        ) : null}
        {circle.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {circle.description}
          </Text>
        ) : null}
        <Text style={styles.cta}>Découvrir →</Text>
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
    height: 120,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 16,
  },
  name: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 21,
    color: '#fff',
    lineHeight: 24,
  },
  body: { paddingHorizontal: 16, paddingVertical: 14 },
  animateurRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  animateur: { ...typography.small, fontSize: 12 },
  description: { ...typography.small, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cta: {
    ...typography.bodyMedium,
    color: colors.violet2,
    fontSize: 13,
  },
});
