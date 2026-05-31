import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Icon } from '@components/Icon';
import { Rating } from '@components/Rating';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { exchangeRepo } from '@data/repos';

export default function ExchangeDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: x } = useQuery({
    queryKey: ['exchange', id],
    queryFn: () => exchangeRepo.byId(String(id)),
  });

  if (!x) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Échange" rightAction={<Icon name="share" size={18} color={colors.ink} />} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24 }}>
          <View style={styles.who}>
            <Avatar gradient={x.avatar} size="xl" />
            <View>
              <Text style={styles.name}>{x.who}</Text>
              <Text style={styles.role}>{x.role}</Text>
              <View style={{ marginTop: 4 }}>
                <Rating value={4.95} size={12} />
              </View>
            </View>
          </View>

          <View style={styles.flow}>
            <View style={styles.side}>
              <Text style={styles.flowL}>{x.who.split(' ')[0]} PROPOSE</Text>
              <Text style={styles.flowV}>{x.give}</Text>
            </View>
            <View style={styles.arrow}>
              <Icon name="chevron" size={14} color="#fff" />
            </View>
            <View style={styles.side}>
              <Text style={styles.flowL}>{x.who.split(' ')[0]} CHERCHE</Text>
              <Text style={styles.flowV}>{x.want}</Text>
            </View>
          </View>

          <Text style={[typography.eyebrow, { marginVertical: 12 }]}>SON MESSAGE</Text>
          <Card style={{ padding: 16 }}>
            <Text style={[typography.body, { fontSize: 14.5 }]}>
              "{x.message ?? "Un échange dans la confiance — au plaisir d'en parler ensemble."}"
            </Text>
          </Card>

          <Text style={[typography.eyebrow, { marginTop: 24, marginBottom: 12 }]}>CONDITIONS</Text>
          <View style={styles.condGrid}>
            <CondCell label="Mode" value={x.mode ?? 'Visio'} />
            <CondCell label="Délai" value={x.delay ?? "D'ici 3 semaines"} />
            <CondCell label="Engagement" value="Réciproque" />
            <CondCell label="Publié" value={x.publishedAgo ?? 'il y a 2 jours'} />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button label="Sauvegarder" variant="soft" style={{ flex: 1 }} />
        <Button label="Proposer un échange" style={{ flex: 1.4 }} onPress={() => router.push('/chat/m1' as any)} />
      </View>
    </View>
  );
}

function CondCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.condCell, shadows.card]}>
      <Text style={styles.condL}>{label}</Text>
      <Text style={styles.condV}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  name: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 22 },
  role: { ...typography.small, fontSize: 13 },

  flow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  side: { flex: 1, padding: 18, backgroundColor: colors.mist, borderRadius: 14 },
  flowL: { ...typography.tiny, fontSize: 10, letterSpacing: 1.6, marginBottom: 4 },
  flowV: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 16, lineHeight: 20 },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condCell: {
    width: '48%',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  condL: { ...typography.small, fontSize: 12 },
  condV: { ...typography.bodyMedium, fontSize: 14 },

  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    gap: 10,
  },
});
