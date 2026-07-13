import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@components/Badge';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { EscrowNotice } from '@components/EscrowNotice';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useBooking } from '@store/booking';
import { bookingRepo } from '@data/repos';

type Mode = 'présentiel' | 'visio';
type Pay = 'visa' | 'apple' | 'add';

export default function BookPayment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useBooking((s) => s.draft);
  const patchDraft = useBooking((s) => s.patchDraft);
  const [mode, setMode] = useState<Mode>('présentiel');
  const [pay, setPay] = useState<Pay>('visa');
  const [submitting, setSubmitting] = useState(false);

  const subtotal = 75;
  const platform = 3.5;
  const total = subtotal + platform;

  const confirm = async () => {
    if (!draft) return;
    setSubmitting(true);
    try {
      patchDraft({ mode, total });
      const booking = await bookingRepo.hold({
        practitionerId: draft.practitionerId,
        when: `${draft.day?.label} · ${draft.slot}`,
        mode,
        total,
      });
      router.replace(`/booking/confirmation?ref=${booking.id}` as any);
    } finally {
      setSubmitting(false);
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
          >
            <View style={styles.tileIcon}>
              <Icon name="inperson" size={22} color={colors.ink} />
            </View>
            <View>
              <Text style={styles.tileH}>En présentiel</Text>
              <Text style={styles.tileP}>Atelier d'Élodie · Annecy-le-Vieux</Text>
            </View>
          </Pressable>
          <Pressable
            style={[styles.tile, mode === 'visio' && styles.tileActive]}
            onPress={() => setMode('visio')}
          >
            <View style={styles.tileIcon}>
              <Icon name="video" size={22} color={colors.ink} />
            </View>
            <View>
              <Text style={styles.tileH}>En visio</Text>
              <Text style={styles.tileP}>Lien sécurisé envoyé 30 min avant</Text>
            </View>
          </Pressable>

          <Text style={[styles.section, { marginTop: 24 }]}>Mode de paiement</Text>

          <Pressable
            onPress={() => setPay('visa')}
            style={[styles.payRow, pay === 'visa' && styles.tileActive]}
          >
            <View style={[styles.payLogo, { backgroundColor: '#1a1f71' }]}>
              <Text style={styles.payLogoTxt}>VISA</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.payN}>•••• •••• •••• 4242</Text>
              <Text style={styles.paySub}>Expire 04/27</Text>
            </View>
            <Badge label="Par défaut" variant="online" />
          </Pressable>

          <Pressable
            onPress={() => setPay('apple')}
            style={[styles.payRow, pay === 'apple' && styles.tileActive]}
          >
            <View style={[styles.payLogo, { backgroundColor: '#000' }]}>
              <Text style={[styles.payLogoTxt, { fontSize: 11 }]}> Pay</Text>
            </View>
            <Text style={styles.payN}>Apple Pay</Text>
          </Pressable>

          <Pressable
            onPress={() => setPay('add')}
            style={[styles.payRow, pay === 'add' && styles.tileActive]}
          >
            <View style={styles.payLogo}>
              <Text style={styles.payLogoTxt}>+</Text>
            </View>
            <Text style={[styles.payN, { color: colors.violet2 }]}>
              Ajouter une carte
            </Text>
          </Pressable>

          <View style={{ height: 14 }} />
          <EscrowNotice
            title="Paiement séquestré, via Stripe."
            body="Votre carte est débitée maintenant, mais les fonds ne sont reversés à la praticienne qu'après la séance, une fois validée par vous. Aura est tiers de confiance."
          />

          <Text style={[styles.section, { marginTop: 24 }]}>Récapitulatif</Text>
          <Card style={{ padding: 18, marginBottom: 24 }}>
            <SummaryRow label="Séance — 75 min" value={`${subtotal.toFixed(2)} €`} />
            <SummaryRow label="Frais de plateforme" value={`${platform.toFixed(2)} €`} />
            <View style={styles.total}>
              <Text style={styles.totalLabel}>Total à régler</Text>
              <Text style={styles.totalValue}>{total.toFixed(2)} €</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          variant="aurora"
          label={`Régler ${total.toFixed(2)} € en toute sécurité`}
          leftIcon={<Icon name="shield" size={18} color="#fff" />}
          onPress={confirm}
          disabled={submitting}
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

  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.line,
    marginBottom: 10,
  },
  payLogo: {
    width: 40,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mist,
  },
  payLogoTxt: { color: '#fff', fontSize: 10, fontFamily: 'Outfit_600SemiBold' },
  payN: { ...typography.bodyMedium, fontSize: 14 },
  paySub: { ...typography.tiny, fontSize: 11 },

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
