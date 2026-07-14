import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@components/Card';
import { Chip, ChipTone } from '@components/Chip';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { paiementRepo, remboursementRepo } from '@data/repos';
import { dateFr } from '@utils/format';
import { canRequestRefund } from '@utils/refund';
import type { PaymentRecord } from '@data/types';

const STATUT_FR: Record<string, string> = {
  paid: 'Payé',
  en_attente: 'En attente',
  echoue: 'Échoué',
  rembourse: 'Remboursé',
};
const STATUT_TONE: Record<string, ChipTone> = {
  paid: 'sage',
  en_attente: 'gold',
  echoue: 'violet',
  rembourse: 'sky',
};

function formatEuros(amount: number): string {
  return `${Number(amount).toFixed(2)} €`;
}

export default function PaymentHistory() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: paiements = [] } = useQuery({
    queryKey: ['paiements'],
    queryFn: paiementRepo.list,
  });
  const { data: remboursements = [] } = useQuery({
    queryKey: ['remboursements'],
    queryFn: remboursementRepo.list,
  });

  const requestRefund = (p: PaymentRecord) => {
    router.push({
      pathname: '/refund-request',
      params: {
        paiementId: String(p.id),
        reference: p.reference,
        montant: String(p.montant_brut),
      },
    } as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Historique des paiements" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {paiements.length === 0 ? (
          <Text style={styles.empty}>Aucun paiement pour l'instant.</Text>
        ) : (
          paiements.map((p) => {
            const praticienName = p.praticien
              ? `${p.praticien.firstname} ${p.praticien.lastname}`.trim()
              : null;
            const statutKey = p.statut ?? '';
            return (
              <Card key={p.id} style={styles.card}>
                <View style={styles.head}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reference} numberOfLines={1}>{p.reference}</Text>
                    <Text style={styles.date}>{dateFr(p.date_paiement)}</Text>
                  </View>
                  <Chip
                    label={STATUT_FR[statutKey] ?? (statutKey || '—')}
                    tone={STATUT_TONE[statutKey] ?? 'neutral'}
                    size="sm"
                  />
                </View>

                <Text style={styles.montant}>{formatEuros(p.montant_brut)}</Text>
                {praticienName ? <Text style={styles.praticien}>{praticienName}</Text> : null}

                {canRequestRefund(p, remboursements) && (
                  <Pressable style={styles.refundBtn} onPress={() => requestRefund(p)}>
                    <Text style={styles.refundLabel}>Demander un remboursement</Text>
                  </Pressable>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    ...typography.small,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    marginBottom: 12,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  reference: { ...typography.bodyMedium, fontSize: 14 },
  date: { ...typography.tiny, marginTop: 2 },
  montant: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 22,
    color: colors.ink,
  },
  praticien: { ...typography.small, marginTop: 2 },
  refundBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  refundLabel: {
    ...typography.button,
    fontSize: 13,
    color: colors.ink,
  },
});
