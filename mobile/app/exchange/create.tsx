import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { EscrowNotice } from '@components/EscrowNotice';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { exchangeRepo } from '@data/repos';

const tags = [
  'Soin contre soin',
  'Soin contre service',
  'Soin contre don',
  'Formation contre formation',
  'Bénévolat',
] as const;
type Tag = typeof tags[number];
type Mode = 'Présentiel' | 'Visio' | 'Peu importe';

export default function ExchangeCreate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tag, setTag] = useState<Tag>('Soin contre soin');
  const [give, setGive] = useState('1 soin énergétique · 75 min');
  const [want, setWant] = useState('Cours de yoga (1h)');
  const [mode, setMode] = useState<Mode>('Présentiel');
  const [intention, setIntention] = useState(
    "J'aimerais offrir un soin à quelqu'un qui en a besoin, en échange d'un peu d'aide pour me remettre au yoga doucement."
  );
  const [delay, setDelay] = useState("D'ici 1 mois");

  const publish = async () => {
    await exchangeRepo.create({
      tag: tag as any,
      give,
      want,
      mode: mode === 'Peu importe' ? 'Peu importe' : mode,
      delay,
      message: intention,
    });
    router.replace('/exchange' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Publier un échange" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 24 }}>
          <Text style={typography.eyebrow}>TYPE D'ÉCHANGE</Text>
          <View style={styles.chipRow}>
            {tags.map((t) => (
              <Chip key={t} label={t} active={tag === t} onPress={() => setTag(t)} />
            ))}
          </View>

          <Input label="Je propose" value={give} onChangeText={setGive} />
          <Input
            label="Je cherche"
            value={want}
            onChangeText={setWant}
            placeholder="Ex. cours de yoga, design web…"
          />

          <Text style={styles.fieldLabel}>MODE</Text>
          <View style={styles.modeRow}>
            {(['Présentiel', 'Visio', 'Peu importe'] as const).map((m) => (
              <Chip
                key={m}
                label={m}
                active={mode === m}
                onPress={() => setMode(m)}
                size="lg"
                style={{ flex: 1, justifyContent: 'center' }}
              />
            ))}
          </View>

          <Input
            label="Votre intention"
            value={intention}
            onChangeText={setIntention}
            multiline
            placeholder="Quelques mots pour que la personne se sente accueillie…"
          />

          <Input label="Délai souhaité" value={delay} onChangeText={setDelay} />

          <EscrowNotice
            tone="violet"
            title="Pas d'argent dans les échanges directs."
            body="Aura n'intervient pas dans la transaction. Faites confiance à votre intuition, et signalez tout abus."
          />
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button label="Publier mon échange" onPress={publish} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 24 },
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
