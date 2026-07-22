import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EscrowNotice } from '@components/EscrowNotice';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useBooking } from '@store/booking';
import { practitionerRepo, rendezVousRepo } from '@data/repos';
import { buildDateHeureIso } from '@utils/booking';
import { errorMessage } from '@data/api/client';

type Mode = 'présentiel' | 'visio';

interface PendingBooking {
  id: number;
  clientSecret: string;
  tarif: number;
}

export default function BookPayment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const draft = useBooking((s) => s.draft);
  const [mode, setMode] = useState<Mode>('présentiel');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const confirmingRef = useRef(false);

  const { data: praticien } = useQuery({
    queryKey: ['practitioner', draft?.practitionerId],
    queryFn: () => practitionerRepo.byId(draft?.practitionerId ?? ''),
    enabled: !!draft?.practitionerId,
  });

  const subtotal = pending?.tarif ?? praticien?.price ?? 0;

  const confirm = async () => {
    if (!draft || !draft.day || !draft.slot) return;
    // Guards against a double-tap firing two POSTs before `submitting` state commits — the
    // real per-booking dedup is server-side, this just avoids an easily-avoidable duplicate.
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      let booking = pending;
      if (!booking) {
        const { rendez_vous, client_secret } = await rendezVousRepo.create({
          praticien_id: Number(draft.practitionerId),
          date_heure: buildDateHeureIso(draft.day.date, draft.slot),
          mode,
        });
        // Seeds the query cache confirmation.tsx reads from, so its useQuery resolves
        // instantly with data we already have instead of flashing a loading state.
        queryClient.setQueryData(['rendezVous', String(rendez_vous.id)], rendez_vous);
        booking = { id: rendez_vous.id, clientSecret: client_secret, tarif: rendez_vous.tarif };
        setPending(booking);
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'GuériEnergies',
        paymentIntentClientSecret: booking.clientSecret,
      });
      if (initError) {
        setError(initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        // A user-dismissed sheet isn't a failure — nothing to show, just let them retry.
        if (presentError.code !== 'Canceled') setError(presentError.message);
        return;
      }

      router.replace(`/booking/confirmation?id=${booking.id}` as any);
    } catch (e) {
      setError(errorMessage(e, 'Impossible de créer la réservation'));
    } finally {
      setSubmitting(false);
      confirmingRef.current = false;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Confirmer la séance" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.section}>Mode de séance</Text>

          <Pressable
            style={[styles.tile, mode === 'présentiel' && styles.tileActive]}
            onPress={() => setMode('présentiel')}
            disabled={!!pending}
          >
            <View style={styles.tileIcon}>
              <Icon name="inperson" size={22} color={colors.ink} />
            </View>
            <View>
              <Text style={styles.tileH}>En présentiel</Text>
              <Text style={styles.tileP}>Au cabinet, {praticien?.city ?? 'près de vous'}</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.tile, mode === 'visio' && styles.tileActive]}
            onPress={() => setMode('visio')}
            disabled={!!pending}
          >
            <View style={styles.tileIcon}>
              <Icon name="video" size={22} color={colors.ink} />
            </View>
            <View>
              <Text style={styles.tileH}>En visio</Text>
              <Text style={styles.tileP}>Lien sécurisé envoyé 30 min avant</Text>
            </View>
          </Pressable>

          <View style={{ height: 14 }} />
          <EscrowNotice
            title="Paiement sécurisé, via Stripe."
            body="Vos coordonnées bancaires ne transitent jamais par nos serveurs. Le prélèvement est confirmé dès la validation du paiement."
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Text style={[styles.section, { marginTop: 24 }]}>Récapitulatif</Text>
          <Card style={{ padding: 18, marginBottom: 24 }}>
            <SummaryRow
              label={`Séance${praticien?.specialties?.[0] ? ` — ${praticien.specialties[0]}` : ''}`}
              value={`${subtotal.toFixed(2)} €`}
            />
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Total à régler</Text>
              <Text style={styles.totalValue}>{subtotal.toFixed(2)} €</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          variant="aurora"
          label={submitting ? 'Paiement en cours…' : `Régler ${subtotal.toFixed(2)} € en toute sécurité`}
          leftIcon={<Icon name="shield" size={18} color="#fff" />}
          onPress={confirm}
          disabled={submitting || !draft || !praticien}
        />
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryL}>{label}</Text>
      <Text style={styles.summaryV}>{value}</Text>
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
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 10,
  },
  tileActive: { borderColor: colors.violet2, backgroundColor: '#FBF7FF' },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileH: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18 },
  tileP: { ...typography.tiny, fontSize: 12 },

  error: { ...typography.small, color: colors.danger, fontSize: 13, marginTop: 10 },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  summaryL: { ...typography.small, fontSize: 14 },
  summaryV: { ...typography.body, fontSize: 14 },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 6,
    paddingTop: 14,
  },
  totalLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  totalValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },

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
  },
});
