import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Chip, ChipTone } from '@components/Chip';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { remboursementRepo } from '@data/repos';
import { dateFr } from '@utils/format';
import { ApiError } from '@data/api/client';
import type { Remboursement } from '@data/types';

// Mirrors server/src/database/entities/remboursement.entity.ts
// (REMBOURSEMENT_STATUT_LABELS) and web's RemboursementsBody.jsx so both
// clients and the backend agree on the same status vocabulary.
const STATUT_FR: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  approuve: 'Approuvé',
  refuse: 'Refusé',
  completed: 'Complété',
};
const STATUT_TONE: Record<string, ChipTone> = {
  en_attente: 'gold',
  en_cours: 'sky',
  approuve: 'sage',
  refuse: 'violet',
  completed: 'neutral',
};
// A remboursement can only be cancelled while still 'en_attente' or
// 'en_cours' — mirrors the backend's cancel() guard (remboursements.service.ts)
// and web's RemboursementsBody.jsx `cancellable` check exactly.
const CANCELLABLE_STATUSES = ['en_attente', 'en_cours'];

function formatEuros(amount: number): string {
  return `${Number(amount).toFixed(2)} €`;
}

export default function RefundRequest() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paiementId, reference, montant } = useLocalSearchParams<{
    paiementId?: string;
    reference?: string;
    montant?: string;
  }>();

  const [motif, setMotif] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: remboursements = [] } = useQuery({
    queryKey: ['remboursements'],
    queryFn: remboursementRepo.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['remboursements'] });

  const submit = async () => {
    if (!paiementId) return;
    if (!motif.trim()) {
      Alert.alert('Motif requis', 'Merci de préciser le motif de votre demande.');
      return;
    }
    setSubmitting(true);
    try {
      await remboursementRepo.create({
        paiement_id: Number(paiementId),
        motif: motif.trim(),
        description: description.trim() || undefined,
      });
      await invalidate();
      router.back();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
      Alert.alert('Envoi impossible', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (r: Remboursement) => {
    Alert.alert(
      'Annuler la demande',
      `Annuler la demande de remboursement ${r.reference} ?`,
      [
        { text: 'Garder', style: 'cancel' },
        {
          text: 'Annuler la demande',
          style: 'destructive',
          onPress: async () => {
            await remboursementRepo.cancel(r.id);
            await invalidate();
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Demande de remboursement" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {paiementId ? (
          <>
            <Text style={styles.sectionTitle}>Nouvelle demande</Text>
            <Card style={styles.contextCard}>
              <Text style={styles.contextReference} numberOfLines={1}>{reference}</Text>
              <Text style={styles.contextMontant}>{formatEuros(Number(montant ?? 0))}</Text>
            </Card>

            <Input
              label="Motif"
              value={motif}
              onChangeText={setMotif}
              placeholder="Ex. séance annulée, erreur de facturation…"
            />
            <Input
              label="Description (optionnel)"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Précisez votre demande…"
            />

            <Button
              label={submitting ? 'Envoi…' : 'Envoyer la demande'}
              onPress={submit}
              disabled={submitting}
              style={{ marginTop: 8, marginBottom: 36 }}
            />
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Mes demandes</Text>
        {remboursements.length === 0 ? (
          <Text style={styles.empty}>Aucune demande de remboursement pour l'instant.</Text>
        ) : (
          remboursements.map((r) => {
            const cancellable = CANCELLABLE_STATUSES.includes(r.statut);
            return (
              <Card key={r.id} style={styles.card}>
                <View style={styles.head}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardReference} numberOfLines={1}>{r.reference}</Text>
                    <Text style={styles.date}>{dateFr(r.date_traitement || r.created_at)}</Text>
                  </View>
                  <Chip
                    label={STATUT_FR[r.statut] ?? r.statut}
                    tone={STATUT_TONE[r.statut] ?? 'neutral'}
                    size="sm"
                  />
                </View>

                <Text style={styles.cardMontant}>{formatEuros(r.montant)}</Text>
                <Text style={styles.motif} numberOfLines={2}>{r.motif}</Text>

                {cancellable && (
                  <Button
                    label="Annuler"
                    variant="soft"
                    size="sm"
                    fullWidth={false}
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(r)}
                  />
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
  sectionTitle: {
    ...typography.eyebrow,
    marginTop: 8,
    marginBottom: 12,
  },
  empty: {
    ...typography.small,
    textAlign: 'center',
    marginTop: 12,
  },
  contextCard: {
    marginBottom: 18,
  },
  contextReference: { ...typography.bodyMedium, fontSize: 14 },
  contextMontant: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 22,
    color: colors.ink,
    marginTop: 4,
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
  cardReference: { ...typography.bodyMedium, fontSize: 14 },
  date: { ...typography.tiny, marginTop: 2 },
  cardMontant: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 22,
    color: colors.ink,
  },
  motif: { ...typography.small, marginTop: 2 },
  cancelBtn: {
    marginTop: 14,
    borderColor: colors.danger,
    backgroundColor: 'rgba(184,92,92,0.08)',
  },
});
