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
import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { Input } from '@components/Input';
import { Lotus } from '@components/Lotus';
import { ScreenHeader } from '@components/ScreenHeader';
import { Toggle } from '@components/Toggle';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';

const moods = [
  "Une rencontre lumineuse",
  "Une bouffée d'air",
  "Recentré·e, plus calme",
  "À refaire dès que possible",
  "Une étape importante",
];

const feels = ['Apaisé·e', 'Écouté·e', 'Recentré·e', 'En confiance'];

export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState(
    "J'arrivais nouée, j'en suis ressortie plus légère que je ne l'ai été depuis longtemps. Élodie écoute sans juger, son atelier est un cocon. Je reviendrai."
  );
  const [feelsPicked, setFeelsPicked] = useState<string[]>(['Apaisé·e', 'Écouté·e']);
  const [publishName, setPublishName] = useState(true);

  const toggleFeel = (f: string) =>
    setFeelsPicked((curr) =>
      curr.includes(f) ? curr.filter((x) => x !== f) : [...curr, f]
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Votre ressenti" backIcon="close" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.target, shadows.card]}>
          <Avatar gradient={[colors.violet, colors.sky]} size="md" />
          <View style={{ flex: 1 }}>
            <Text style={styles.targetName}>Élodie Marceau</Text>
            <Text style={styles.targetSub}>Magnétisme · séance du 12 mars</Text>
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

        <Text style={[typography.eyebrow, { marginBottom: 10 }]}>CE QUE VOUS AVEZ RESSENTI</Text>
        <View style={styles.feelsGrid}>
          {feels.map((f) => (
            <Chip
              key={f}
              label={f}
              size="lg"
              active={feelsPicked.includes(f)}
              tone={feelsPicked.includes(f) ? 'active' : 'neutral'}
              onPress={() => toggleFeel(f)}
              style={{ flex: 1, justifyContent: 'center', minWidth: '48%' }}
            />
          ))}
        </View>

        <Input
          label="Votre témoignage (facultatif)"
          value={text}
          onChangeText={setText}
          multiline
        />

        <View style={[styles.toggleRow, { backgroundColor: '#fff' }]}>
          <Toggle value={publishName} onValueChange={setPublishName} />
          <Text style={styles.toggleTxt}>
            Publier sous mon prénom et l'initiale de mon nom
          </Text>
        </View>

        <View style={{ height: 4 }} />
        <Button label="Partager mon avis" onPress={() => router.back()} />
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

  feelsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 18,
  },
  toggleTxt: { flex: 1, ...typography.small, fontSize: 13, lineHeight: 18, color: colors.ink },
  help: { ...typography.tiny, textAlign: 'center', marginTop: 12 },
});
