import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Grain } from '@components/Grain';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { cercleRepo } from '@data/repos';

export default function CercleDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: c } = useQuery({
    queryKey: ['cercle', id],
    queryFn: () => cercleRepo.byId(String(id)),
  });

  if (!c) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const accent = c.color ?? colors.violet;
  const gradient = [accent, colors.ink] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top }]}>
          <Grain opacity={0.18} />
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <Pressable style={styles.iconCircle} onPress={() => router.back()}>
              <Icon name="back" size={20} color={colors.ink} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.iconCircle}>
                <Icon name="heart" size={18} color={colors.ink} />
              </Pressable>
              <Pressable style={styles.iconCircle}>
                <Icon name="share" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.title}>{c.nom}</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 24 }}>
          {c.description ? <Text style={styles.p}>{c.description}</Text> : null}

          <View style={[styles.aboutCard, shadows.card]}>
            <Text style={styles.eyebrow}>À PROPOS</Text>
            {c.animateur ? (
              <View style={styles.row}>
                <Text style={styles.label}>Animation</Text>
                <Text style={styles.value}>{c.animateur}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, position: 'relative', padding: 24, justifyContent: 'flex-end' },
  heroActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFoot: { gap: 12 },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 34,
    color: '#fff',
    lineHeight: 36,
  },
  p: { ...typography.body, lineHeight: 25, marginBottom: 20, fontSize: 14.5 },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },
  eyebrow: { ...typography.eyebrow, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { ...typography.small, fontSize: 13 },
  value: { ...typography.bodyMedium, fontSize: 13 },
});
