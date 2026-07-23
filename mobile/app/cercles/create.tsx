import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { cercleRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';

export default function CreateCercle() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const publish = async () => {
    if (submitting || !nom.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await cercleRepo.create({
        nom: nom.trim(),
        description: description.trim() || undefined,
        prix: prix.trim() ? Math.max(0, Number(prix.trim())) : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['cercles'] });
      Alert.alert('Cercle créé', 'Votre cercle est maintenant visible dans la communauté.', [
        { text: 'Compris', onPress: () => router.replace('/cercles' as any) },
      ]);
    } catch (err) {
      setError(errorMessage(err, 'Impossible de créer le cercle'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Créer un cercle" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Input label="Nom du cercle" value={nom} onChangeText={setNom} placeholder="Ex. Cercle de méditation du matin" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Présentez votre cercle, son rythme, son intention…"
        />
        <Input
          label="Prix par mois (€, optionnel)"
          value={prix}
          onChangeText={setPrix}
          keyboardType="decimal-pad"
          placeholder="Laissez vide pour un cercle gratuit"
        />
        <Text style={styles.hint}>
          Un cercle gratuit reste visible et rejoignable par tous. Un cercle payant affiche son
          tarif — le règlement se fait pour l'instant en dehors de la plateforme.
        </Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={{ height: 8 }} />
        <Button
          label={submitting ? 'Création…' : 'Créer mon cercle'}
          onPress={publish}
          disabled={submitting || !nom.trim()}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.tiny, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 14 },
  error: { ...typography.small, color: colors.danger, fontSize: 13, marginBottom: 8 },
});
