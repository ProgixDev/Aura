import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ScreenHeader } from '@components/ScreenHeader';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';
import { usePraticienRegistration } from '@store/praticienRegistration';
import { praticienAuthRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';

const DOC_TYPES: Array<{ key: 'piece_identite' | 'diplome' | 'charte' | 'justificatif_siret'; label: string; hint: string }> = [
  { key: 'piece_identite', label: "Pièce d'identité", hint: 'Carte nationale, passeport…' },
  { key: 'diplome', label: 'Diplôme', hint: 'Diplôme ou attestation de formation' },
  { key: 'charte', label: 'Charte GuériEnergies signée', hint: 'Téléchargée depuis votre email de bienvenue' },
  { key: 'justificatif_siret', label: 'Justificatif SIRET', hint: 'Avis de situation SIRENE ou extrait Kbis' },
];

export default function PraticienDocuments() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = usePraticienRegistration((s) => s.draft);
  const clearDraft = usePraticienRegistration((s) => s.clearDraft);
  const patchDraft = usePraticienRegistration((s) => s.patchDraft);
  const setAuthenticated = useSession((s) => s.setAuthenticated);
  const setOnboardingSeen = useSession((s) => s.setOnboardingSeen);
  const [submitting, setSubmitting] = useState(false);

  const setDocument = (key: (typeof DOC_TYPES)[number]['key'], doc: { uri: string; name: string; mimeType: string }) => {
    patchDraft({ documents: { ...draft.documents, [key]: doc } });
  };

  const pickFromFiles = async (key: (typeof DOC_TYPES)[number]['key']) => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setDocument(key, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' });
  };

  const pickFromCamera = async (key: (typeof DOC_TYPES)[number]['key']) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès caméra refusé', "Autorisez l'accès à la caméra dans les réglages pour prendre une photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setDocument(key, { uri: asset.uri, name: `${key}-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const choose = (key: (typeof DOC_TYPES)[number]['key']) => {
    Alert.alert('Ajouter un document', undefined, [
      { text: 'Prendre une photo', onPress: () => pickFromCamera(key) },
      { text: 'Choisir un fichier', onPress: () => pickFromFiles(key) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const allPicked = DOC_TYPES.every((d) => draft.documents?.[d.key]);

  const submit = async () => {
    if (!allPicked) return;
    setSubmitting(true);
    try {
      const res = await praticienAuthRepo.register(draft);
      setAuthenticated({
        token: res.token,
        userType: 'praticien',
        firstName: draft.firstname ?? '',
        lastName: draft.lastname ?? '',
        verificationStatus: 'en_attente',
      });
      setOnboardingSeen();
      clearDraft();
      // Newly-registered praticien → dashboard, not the client tabs.
      router.replace('/dashboard' as any);
    } catch (err) {
      Alert.alert('Inscription impossible', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader transparent />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 12, paddingBottom: insets.bottom + 32 }}
      >
        <Text style={styles.h1}>Vos <Text style={styles.italic}>documents</Text></Text>
        <Text style={styles.small}>
          {DOC_TYPES.length} documents requis pour vérifier votre profil. Votre compte sera actif dès validation par notre équipe.
        </Text>
        <View style={{ height: 24 }} />

        {DOC_TYPES.map((d) => {
          const picked = draft.documents?.[d.key];
          return (
            <Pressable key={d.key} style={styles.card} onPress={() => choose(d.key)}>
              <View style={[styles.badge, picked && styles.badgeDone]}>
                <Icon name={picked ? 'check' : 'plus'} size={16} color={picked ? '#fff' : colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{d.label}</Text>
                <Text style={styles.cardHint} numberOfLines={1}>
                  {picked ? picked.name : d.hint}
                </Text>
              </View>
              {!picked && <Icon name="camera" size={18} color={colors.muted} />}
            </Pressable>
          );
        })}

        <View style={{ height: 12 }} />
        <Button
          label={submitting ? 'Un instant…' : 'Créer mon compte'}
          onPress={submit}
          disabled={!allPicked || submitting}
        />
        <Text style={styles.legal}>
          En continuant, vous acceptez notre charte de bienveillance et notre politique de confidentialité.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { ...typography.h1, marginBottom: 6 },
  italic: { fontFamily: 'CormorantGaramond_400Regular_Italic', color: colors.violet2 },
  small: { ...typography.small, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDone: { backgroundColor: colors.success },
  cardTitle: { fontFamily: 'Outfit_500Medium', fontSize: 14, marginBottom: 2 },
  cardHint: { ...typography.tiny, fontSize: 12 },
  legal: { ...typography.small, fontSize: 12, marginTop: 14, lineHeight: 18, textAlign: 'center' },
});
