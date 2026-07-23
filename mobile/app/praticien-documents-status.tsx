import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { praticienProfileRepo } from '@data/repos';
import type { PraticienDocumentStatus } from '@data/repos';
import { errorMessage } from '@data/api/client';

const DOC_TYPES = ['piece_identite', 'diplome', 'charte', 'justificatif_siret'] as const;
const DOC_LABELS: Record<string, string> = {
  piece_identite: "Pièce d'identité",
  diplome: 'Diplôme',
  charte: 'Charte GuériEnergies signée',
  justificatif_siret: 'Justificatif SIRET',
};
const DOC_STATUT_LABEL: Record<string, string> = {
  valide: 'Validé', en_attente: 'En attente', rejete: 'Refusé', manquant: 'Manquant',
};
const DOC_STATUT_COLOR: Record<string, string> = {
  valide: colors.sage2, en_attente: colors.muted, rejete: colors.danger, manquant: colors.danger,
};

export default function PraticienDocumentsStatus() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [busyType, setBusyType] = useState<string | null>(null);
  const { data: profile, isLoading } = useQuery({
    queryKey: ['praticien-profile'],
    queryFn: praticienProfileRepo.me,
  });
  const documents: PraticienDocumentStatus[] = profile?.documents ?? [];

  const resubmitMutation = useMutation({
    mutationFn: ({ type, asset }: { type: string; asset: { uri: string; name: string; mimeType: string } }) =>
      praticienProfileRepo.resubmitDocument(type, asset),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['praticien-profile'] }),
    onError: (err) => Alert.alert('Envoi impossible', errorMessage(err)),
    onSettled: () => setBusyType(null),
  });

  const pickFromFiles = async (type: string) => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusyType(type);
    resubmitMutation.mutate({
      type, asset: { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' },
    });
  };

  const pickFromCamera = async (type: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès caméra refusé', "Autorisez l'accès à la caméra dans les réglages pour prendre une photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setBusyType(type);
    resubmitMutation.mutate({
      type, asset: { uri: asset.uri, name: `${type}-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' },
    });
  };

  const choose = (type: string) => {
    Alert.alert('Ajouter un document', undefined, [
      { text: 'Prendre une photo', onPress: () => pickFromCamera(type) },
      { text: 'Choisir un fichier', onPress: () => pickFromFiles(type) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Mes documents" />
      {isLoading || !profile ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={typography.small}>Chargement…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
          <Text style={styles.summary}>
            {profile.documents_stats.valide}/{DOC_TYPES.length} documents validés
          </Text>
          <View style={styles.box}>
            {DOC_TYPES.map((type) => {
              const doc = documents.find((d) => d.type === type);
              const statut = doc?.statut ?? 'manquant';
              const canRetry = statut === 'rejete' || statut === 'manquant';
              return (
                <View key={type} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{DOC_LABELS[type]}</Text>
                    <Text style={[styles.statut, { color: DOC_STATUT_COLOR[statut] }]}>
                      {DOC_STATUT_LABEL[statut]}
                    </Text>
                    {statut === 'rejete' && doc?.commentaire_rejet && (
                      <Text style={styles.motif}>{doc.commentaire_rejet}</Text>
                    )}
                  </View>
                  {canRetry && (
                    <Pressable
                      onPress={() => choose(type)}
                      disabled={busyType === type}
                      style={styles.retryBtn}
                    >
                      <Text style={styles.retryTxt}>
                        {busyType === type ? 'Envoi…' : statut === 'rejete' ? 'Réessayer' : 'Ajouter'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { ...typography.eyebrow, marginBottom: 14 },
  box: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  label: { fontFamily: 'Outfit_500Medium', fontSize: 14, marginBottom: 2 },
  statut: { ...typography.tiny, fontSize: 12, fontFamily: 'Outfit_500Medium' },
  motif: { ...typography.tiny, fontSize: 11, marginTop: 2 },
  retryBtn: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.mist,
  },
  retryTxt: { ...typography.button, fontSize: 12, color: colors.ink },
});
