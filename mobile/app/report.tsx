import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { Lotus } from '@components/Lotus';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { signalementRepo } from '@data/repos';

const reasons = [
  {
    key: 'overclaim',
    title: 'Promesses de guérison exagérées',
    detail: 'Diagnostic, traitement médical implicite',
  },
  {
    key: 'behavior',
    title: 'Comportement non-professionnel',
    detail: "Pendant ou après une séance",
  },
  { key: 'fake', title: 'Faux avis ou témoignage trompeur' },
  { key: 'pros', title: 'Discours dérangeant ou prosélytisme' },
  { key: 'other', title: 'Autre' },
];

export default function Report() {
  const { praticienId } = useLocalSearchParams<{ praticienId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState('overclaim');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!praticienId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.pearl }}>
        <ScreenHeader title="Signaler" backIcon="close" />
        <View style={styles.emptyWrap}>
          <Lotus size={40} color={colors.violet2} />
          <Text style={styles.emptyTitle}>Choisissez un praticien</Text>
          <Text style={styles.emptyBody}>
            Ouvrez le profil d'un praticien pour le signaler à l'équipe de modération.
          </Text>
        </View>
      </View>
    );
  }

  const submit = async () => {
    if (submitting) return;
    const reason = reasons.find((r) => r.key === picked)!;
    setSubmitting(true);
    setError(null);
    try {
      await signalementRepo.create({
        praticien_id: Number(praticienId),
        type: reason.key,
        sujet: reason.title,
        motif: note.trim() || reason.detail || reason.title,
      });
      router.back();
    } catch (err: any) {
      setError(err?.message ?? 'Une erreur est survenue, réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Signaler" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
      >
        <Text style={styles.h}>Qu'avez-vous remarqué ?</Text>
        <Text style={styles.lead}>
          GuériEnergies est une communauté de soin. Toute signalisation est lue par un humain
          sous 24h. Votre identité reste confidentielle.
        </Text>

        <View style={{ gap: 8, marginBottom: 18 }}>
          {reasons.map((r) => {
            const active = picked === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setPicked(r.key)}
                style={[styles.opt, active && styles.optActive]}
              >
                <View style={[styles.check, active && styles.checkActive]}>
                  {active ? <Icon name="check" size={11} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{r.title}</Text>
                  {r.detail ? <Text style={styles.optDetail}>{r.detail}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Préciser (facultatif)"
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Vos mots restent confidentiels…"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label={submitting ? 'Envoi…' : 'Envoyer le signalement'} onPress={submit} disabled={submitting} />
        <Text style={styles.help}>
          En cas d'urgence, contactez le 17 ou le 3919.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 24,
    color: colors.ink,
    marginBottom: 8,
  },
  lead: { ...typography.small, fontSize: 14, lineHeight: 21, marginBottom: 22 },

  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optActive: { borderColor: colors.violet2, backgroundColor: '#FBF7FF' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D8D2C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optTitle: { ...typography.bodyMedium, fontSize: 14 },
  optDetail: { ...typography.tiny, fontSize: 12, marginTop: 2 },

  error: { ...typography.small, fontSize: 13, color: colors.danger, textAlign: 'center', marginTop: 4, marginBottom: 8 },
  help: { ...typography.tiny, textAlign: 'center', marginTop: 14 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: colors.ink },
  emptyBody: { ...typography.small, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
