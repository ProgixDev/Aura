import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { EscrowNotice } from '@components/EscrowNotice';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { exchangeRepo } from '@data/repos';
import { buildEchangeSujet } from '@utils/echange';

type Format = 'Présentiel' | 'Visio' | 'Peu importe';
const formats: readonly Format[] = ['Présentiel', 'Visio', 'Peu importe'] as const;

export default function ExchangeCreate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { data: existing } = useQuery({
    queryKey: ['exchange', id],
    queryFn: () => exchangeRepo.byId(Number(id)),
    enabled: isEditing,
  });

  const [propose, setPropose] = useState('');
  const [recherche, setRecherche] = useState('');
  const [format, setFormat] = useState<Format>('Présentiel');
  const [message, setMessage] = useState('');
  const [delai, setDelai] = useState('');

  // Seed the form from the fetched échange exactly once, when it first
  // arrives — avoids clobbering in-progress edits on every re-render.
  const seededId = useRef<number | null>(null);
  useEffect(() => {
    if (!existing || seededId.current === existing.id) return;
    seededId.current = existing.id;
    setPropose(existing.ce_que_je_propose ?? '');
    setRecherche(existing.ce_que_je_recherche ?? '');
    setFormat((existing.format as Format) || 'Présentiel');
    setMessage(existing.message ?? '');
    setDelai(existing.delai_souhaite ?? '');
  }, [existing]);

  const publish = async () => {
    const payload = {
      sujet: buildEchangeSujet(propose, recherche),
      message,
      ce_que_je_propose: propose || undefined,
      ce_que_je_recherche: recherche || undefined,
      format: format || undefined,
      delai_souhaite: delai || undefined,
    };
    if (isEditing) {
      await exchangeRepo.update(Number(id), payload);
    } else {
      await exchangeRepo.create({ ...payload, type: 'proposition' });
    }
    router.replace('/exchange' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title={isEditing ? "Modifier l'échange" : 'Publier un échange'} backIcon="close" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 24 }}>
          <Input label="Je propose" value={propose} onChangeText={setPropose} />
          <Input
            label="Je recherche"
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Ex. cours de yoga, design web…"
          />

          <Text style={styles.fieldLabel}>FORMAT</Text>
          <View style={styles.modeRow}>
            {formats.map((f) => (
              <Chip
                key={f}
                label={f}
                active={format === f}
                onPress={() => setFormat(f)}
                size="lg"
                style={{ flex: 1, justifyContent: 'center' }}
              />
            ))}
          </View>

          <Input
            label="Message (10 caractères minimum)"
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Quelques mots pour que la personne se sente accueillie…"
          />

          <Input
            label="Délai souhaité (AAAA-MM-JJ, optionnel)"
            value={delai}
            onChangeText={setDelai}
          />

          <EscrowNotice
            tone="violet"
            title="Pas d'argent dans les échanges directs."
            body="Aura n'intervient pas dans la transaction. Faites confiance à votre intuition, et signalez tout abus."
          />
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button label={isEditing ? 'Enregistrer' : 'Publier mon échange'} onPress={publish} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    ...typography.tiny,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

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
