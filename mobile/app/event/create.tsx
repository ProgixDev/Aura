import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { eventRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';

const TYPES = ['Retraite', 'Formation', 'Atelier', 'Cercle', 'Sortie', 'Événement'] as const;

export default function CreateEvent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [titre, setTitre] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('Atelier');
  const [date, setDate] = useState('');
  const [lieu, setLieu] = useState('');
  const [prix, setPrix] = useState('');
  const [places, setPlaces] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = titre.trim() && date.trim() && lieu.trim() && places.trim() && description.trim();

  const publish = async () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await eventRepo.create({
        titre: titre.trim(),
        type,
        dates: [date.trim()],
        lieu: lieu.trim(),
        prix: prix.trim() ? Math.max(0, Number(prix.trim())) : 0,
        nombre_places: Math.max(1, parseInt(places.trim(), 10) || 1),
        description: description.trim(),
      });
      Alert.alert(
        'Événement créé',
        "Votre événement a été enregistré. Il sera visible dans l'application après validation par notre équipe.",
        [{ text: 'Compris', onPress: () => router.back() }],
      );
    } catch (err) {
      setError(errorMessage(err, "Impossible de créer l'événement"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Créer un événement" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Input label="Titre" value={titre} onChangeText={setTitre} placeholder="Ex. Retraite de ressourcement" />

        <Text style={styles.fieldLabel}>TYPE</Text>
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
          ))}
        </View>

        <Input label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} placeholder="2026-09-15" />
        <Input label="Lieu" value={lieu} onChangeText={setLieu} placeholder="Ex. Lyon" />
        <Input
          label="Prix par personne (€, optionnel)"
          value={prix}
          onChangeText={setPrix}
          keyboardType="decimal-pad"
          placeholder="Laissez vide pour un événement gratuit"
        />
        <Input
          label="Nombre de places"
          value={places}
          onChangeText={setPlaces}
          keyboardType="number-pad"
          placeholder="20"
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Présentez le déroulé, ce que les participants peuvent attendre…"
        />

        <Text style={styles.hint}>
          Votre événement sera visible dans l'application après validation par notre équipe.
        </Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={{ height: 8 }} />
        <Button
          label={submitting ? 'Création…' : 'Créer mon événement'}
          onPress={publish}
          disabled={submitting || !canSubmit}
        />
      </ScrollView>
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
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  hint: { ...typography.tiny, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 14 },
  error: { ...typography.small, color: colors.danger, fontSize: 13, marginBottom: 8 },
});
