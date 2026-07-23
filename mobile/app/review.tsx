import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Lotus } from '@components/Lotus';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { avisRepo, practitionerRepo, rendezVousRepo } from '@data/repos';
import type { RendezVousPraticien } from '@data/types';

const moods = [
  "Une rencontre lumineuse",
  "Une bouffée d'air",
  "Recentré·e, plus calme",
  "À refaire dès que possible",
  "Une étape importante",
];

export default function Review() {
  const { praticienId } = useLocalSearchParams<{ praticienId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const effectiveId = praticienId ?? pickedId ?? undefined;

  const { data: p } = useQuery({
    queryKey: ['practitioner', effectiveId],
    queryFn: () => practitionerRepo.byId(String(effectiveId)),
    enabled: !!effectiveId,
  });

  // Only fetched when landing here with no target yet (the profil.tsx menu
  // entry) — lets the user pick from practitioners they've actually booked,
  // instead of hitting a dead end.
  const { data: rendezVous, isLoading: loadingRendezVous } = useQuery({
    queryKey: ['rendez-vous', 'client'],
    queryFn: rendezVousRepo.list,
    enabled: !effectiveId,
  });

  if (!effectiveId) {
    const seen = new Map<number, RendezVousPraticien>();
    (rendezVous ?? []).forEach((r) => {
      if (r.praticien) seen.set(r.praticien.id, r.praticien);
    });
    const praticiens = Array.from(seen.values());

    return (
      <View style={{ flex: 1, backgroundColor: colors.pearl }}>
        <ScreenHeader title="Votre ressenti" backIcon="close" />
        {loadingRendezVous ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyBody}>Chargement…</Text>
          </View>
        ) : praticiens.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Lotus size={40} color={colors.violet2} />
            <Text style={styles.emptyTitle}>Aucune séance pour l'instant</Text>
            <Text style={styles.emptyBody}>
              Réservez une séance avec un praticien avant de partager votre ressenti.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[typography.eyebrow, styles.pickerEyebrow]}>
              QUEL PRATICIEN SOUHAITEZ-VOUS ÉVALUER ?
            </Text>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
              {praticiens.map((pr) => (
                <Pressable
                  key={pr.id}
                  style={styles.pickerRow}
                  onPress={() => setPickedId(String(pr.id))}
                >
                  <Avatar size="md" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{[pr.firstname, pr.lastname].filter(Boolean).join(' ')}</Text>
                    <Text style={styles.pickerSub}>{[pr.specialite, pr.ville].filter(Boolean).join(' · ')}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    );
  }

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await avisRepo.create({ praticien_id: Number(effectiveId), note: rating, avis: text });
      await queryClient.invalidateQueries({ queryKey: ['reviews', effectiveId] });
      // Reviews are moderated server-side (saved as `en_attente`, only shown
      // once an admin publishes them), so it won't appear in the list yet —
      // tell the user instead of silently returning, which reads as "nothing
      // happened".
      Alert.alert(
        'Merci pour votre avis',
        'Votre témoignage a bien été envoyé. Il sera publié après vérification par notre équipe.',
        [{ text: 'Compris', onPress: () => router.back() }],
      );
    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue, réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Votre ressenti" backIcon="close" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.target, shadows.card]}>
          <Avatar gradient={p?.gradient ?? [colors.violet, colors.sky]} size="md" />
          <View style={{ flex: 1 }}>
            <Text style={styles.targetName}>{p?.name ?? '…'}</Text>
            {p?.specialties?.[0] ? <Text style={styles.targetSub}>{p.specialties[0]}</Text> : null}
          </View>
        </View>

        <Text style={[typography.eyebrow, { textAlign: 'center', marginBottom: 14 }]}>
          COMMENT VOUS ÊTES-VOUS SENTI·E ?
        </Text>

        <View style={styles.picker}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              style={[styles.pick, n > rating && { opacity: 0.3 }]}
            >
              <Lotus size={36} color={colors.violet2} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.mood}>{moods[rating - 1]}</Text>

        <Input
          label="Votre témoignage"
          value={text}
          onChangeText={setText}
          multiline
          placeholder="Partagez votre ressenti…"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: 4 }} />
        <Button
          label={submitting ? 'Envoi…' : 'Partager mon avis'}
          onPress={submit}
          disabled={submitting || text.trim().length < 3}
        />
        <Text style={styles.help}>
          Votre avis aide d'autres chercheurs à choisir en confiance.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 24,
  },
  targetName: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 19 },
  targetSub: { ...typography.tiny, fontSize: 12 },

  picker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 8,
  },
  pick: { padding: 4 },
  mood: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 24,
  },

  error: { ...typography.small, fontSize: 13, color: colors.danger, textAlign: 'center', marginBottom: 8 },
  help: { ...typography.tiny, textAlign: 'center', marginTop: 12 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: colors.ink },
  emptyBody: { ...typography.small, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  pickerEyebrow: { textAlign: 'center', marginTop: 8, marginBottom: 4 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerName: { ...typography.bodyMedium, fontSize: 15 },
  pickerSub: { ...typography.small, fontSize: 12, marginTop: 2 },
});
