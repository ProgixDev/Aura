import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ScreenHeader } from '@components/ScreenHeader';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { rendezVousRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';
import type { RendezVous } from '@data/types';

// Formatted in UTC to match the UTC-pinned slot the client booked
// (see mobile/src/utils/booking.ts), so 15:00 stays 15:00.
function formatRdv(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const STATUT: Record<RendezVous['statut'], { label: string; color: string }> = {
  en_attente: { label: 'En attente de paiement', color: colors.muted },
  confirme: { label: 'Confirmé', color: colors.sage2 },
  annule: { label: 'Annulé', color: colors.danger },
  termine: { label: 'Terminé', color: colors.muted },
};

const CANCELLABLE: RendezVous['statut'][] = ['en_attente', 'confirme'];

export default function MesSeances() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['rendez-vous', 'client'],
    queryFn: rendezVousRepo.list,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => rendezVousRepo.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rendez-vous', 'client'] }),
    onError: (err) => Alert.alert('Annulation impossible', errorMessage(err)),
  });

  const now = Date.now();
  // Endpoint returns newest-first; split into upcoming vs past for clarity.
  const upcoming = list
    .filter((r) => r.statut !== 'annule' && new Date(r.date_heure).getTime() >= now)
    .sort((a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime());
  const past = list.filter(
    (r) => r.statut === 'annule' || new Date(r.date_heure).getTime() < now,
  );

  const confirmCancel = (r: RendezVous) => {
    Alert.alert(
      'Annuler la séance ?',
      'Cette action est définitive. Selon le délai, un remboursement pourra être demandé.',
      [
        { text: 'Retour', style: 'cancel' },
        { text: 'Annuler la séance', style: 'destructive', onPress: () => cancelMutation.mutate(r.id) },
      ],
    );
  };

  const renderCard = (r: RendezVous, cancellable: boolean) => {
    const st = STATUT[r.statut];
    const praticienName = r.praticien
      ? `${r.praticien.firstname} ${r.praticien.lastname}`.trim()
      : 'Praticien';
    return (
      <View key={r.id} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.icon}>
            <Icon name="cal" size={18} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{praticienName}</Text>
            <Text style={styles.meta}>
              {r.praticien?.specialite ? `${r.praticien.specialite} · ` : ''}
              {r.mode === 'visio' ? 'Visio' : 'Présentiel'}
            </Text>
          </View>
          <Text style={styles.price}>{r.tarif}€</Text>
        </View>
        <Text style={styles.when}>{formatRdv(r.date_heure)}</Text>
        <View style={styles.cardFoot}>
          <Text style={[styles.statut, { color: st.color }]}>{st.label}</Text>
          {cancellable && CANCELLABLE.includes(r.statut) && (
            <Pressable onPress={() => confirmCancel(r)} disabled={cancelMutation.isPending}>
              <Text style={styles.cancel}>Annuler</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Mes séances" />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : list.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Aucune séance pour l'instant</Text>
            <Text style={styles.empty}>
              Vos réservations apparaîtront ici. Trouvez un praticien pour commencer.
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <Text style={styles.section}>À venir</Text>
                {upcoming.map((r) => renderCard(r, true))}
              </>
            )}
            {past.length > 0 && (
              <>
                <Text style={[styles.section, { marginTop: upcoming.length ? 20 : 0 }]}>Historique</Text>
                {past.map((r) => renderCard(r, false))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: colors.ink,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 17 },
  meta: { ...typography.tiny, fontSize: 12 },
  price: { ...typography.price, fontSize: 16 },
  when: {
    ...typography.small,
    fontSize: 13,
    color: colors.ink,
    marginTop: 10,
    textTransform: 'capitalize',
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  statut: { fontFamily: 'Outfit_500Medium', fontSize: 12 },
  cancel: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.danger },
  empty: { ...typography.small, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: colors.ink },
});
