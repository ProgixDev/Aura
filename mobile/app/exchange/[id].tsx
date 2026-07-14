import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Chip, ChipTone } from '@components/Chip';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { exchangeRepo } from '@data/repos';
import { dateFr } from '@utils/format';
import { errorMessage } from '@data/api/client';

// Chip has no dedicated "danger" tone, so `signale` borrows `violet` to stay
// visually distinct from the warm/positive statuses.
const STATUT_FR: Record<string, string> = {
  en_attente: 'En attente',
  lu: 'Lu',
  en_cours: 'En cours',
  traite: 'Traité',
  signale: 'Signalé',
  archive: 'Archivé',
};
const STATUT_TONE: Record<string, ChipTone> = {
  en_attente: 'gold',
  lu: 'sky',
  en_cours: 'sky',
  traite: 'sage',
  signale: 'violet',
  archive: 'neutral',
};

export default function ExchangeDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: x } = useQuery({
    queryKey: ['exchange', id],
    queryFn: () => exchangeRepo.byId(Number(id)),
  });

  if (!x) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const editable = x.statut === 'en_attente' || x.statut === 'lu';
  const hasFlow = Boolean(x.ce_que_je_propose || x.ce_que_je_recherche);

  const handleDelete = () => {
    Alert.alert('Supprimer ?', 'Cet échange sera définitivement retiré.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await exchangeRepo.remove(x.id);
            await queryClient.invalidateQueries({ queryKey: ['exchanges'] });
            router.replace('/exchange' as any);
          } catch (err) {
            Alert.alert('Suppression impossible', errorMessage(err));
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Échange" rightAction={<Icon name="share" size={18} color={colors.ink} />} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: editable ? 140 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24 }}>
          <View style={styles.head}>
            <Text style={styles.name}>{x.sujet}</Text>
            <Chip
              label={STATUT_FR[x.statut] ?? x.statut}
              tone={STATUT_TONE[x.statut] ?? 'neutral'}
              size="sm"
            />
          </View>

          {hasFlow && (
            <View style={styles.flow}>
              {x.ce_que_je_propose ? (
                <View style={styles.side}>
                  <Text style={styles.flowL}>JE PROPOSE</Text>
                  <Text style={styles.flowV}>{x.ce_que_je_propose}</Text>
                </View>
              ) : null}
              {x.ce_que_je_propose && x.ce_que_je_recherche ? (
                <View style={styles.arrow}>
                  <Icon name="chevron" size={14} color="#fff" />
                </View>
              ) : null}
              {x.ce_que_je_recherche ? (
                <View style={styles.side}>
                  <Text style={styles.flowL}>JE RECHERCHE</Text>
                  <Text style={styles.flowV}>{x.ce_que_je_recherche}</Text>
                </View>
              ) : null}
            </View>
          )}

          <Text style={[typography.eyebrow, { marginVertical: 12 }]}>MESSAGE</Text>
          <Card style={{ padding: 16 }}>
            <Text style={[typography.body, { fontSize: 14.5 }]}>« {x.message} »</Text>
          </Card>

          <Text style={[typography.eyebrow, { marginTop: 24, marginBottom: 12 }]}>CONDITIONS</Text>
          <View style={styles.condGrid}>
            <CondCell label="Format" value={x.format ?? 'Peu importe'} />
            <CondCell label="Délai souhaité" value={dateFr(x.delai_souhaite) || 'Non précisé'} />
            <CondCell label="Publié" value={dateFr(x.created_at)} />
            <CondCell label="Statut" value={STATUT_FR[x.statut] ?? x.statut} />
          </View>
        </View>
      </ScrollView>

      {editable && (
        <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
          <Button
            label="Modifier"
            variant="soft"
            style={{ flex: 1 }}
            onPress={() => router.push(`/exchange/create?id=${x.id}` as any)}
          />
          <Button
            label="Supprimer"
            variant="soft"
            style={{ flex: 1, borderColor: colors.danger, backgroundColor: 'rgba(184,92,92,0.08)' }}
            onPress={handleDelete}
          />
        </View>
      )}
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
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  name: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 22, flex: 1 },

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
