import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { praticienProfileRepo, disciplineRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';
import { useSession } from '@store/session';
import type { PraticienDocumentStatus } from '@data/repos';

interface PraticienProfileData {
  firstname: string; lastname: string; email: string; siret: string; photo: string | null;
  telephone: string; ville: string; niveau: string; specialite: string; mode: string;
  tarif: number; experience: number; bio: string; documents: PraticienDocumentStatus[];
}

const NIVEAUX = ['Novice', 'Praticien confirmé', 'Expert'];
const MODES = ['présentiel', 'visio uniquement', 'présentiel & visio'];

const schema = z.object({
  firstname: z.string().min(1, 'Prénom requis'),
  lastname: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(6, 'Numéro invalide'),
  ville: z.string().min(1, 'Ville requise'),
  niveau: z.string().min(1, 'Choisissez votre niveau'),
  specialite: z.string().min(1, 'Choisissez votre spécialité'),
  mode: z.string().min(1, 'Choisissez un mode'),
  tarif: z.string().min(1, 'Tarif requis').regex(/^\d+(\.\d{1,2})?$/, 'Nombre invalide'),
  experience: z.string().min(1, "Années d'expérience requises").regex(/^\d+$/, 'Nombre entier requis'),
  bio: z.string().min(50, '50 caractères minimum'),
});
type FormValues = z.infer<typeof schema>;

function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable key={opt} style={[styles.chip, value === opt && styles.chipActive]} onPress={() => onChange(opt)}>
          <Text style={[styles.chipTxt, value === opt && styles.chipTxtActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function PraticienProfileEdit() {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['praticien-profile'],
    queryFn: praticienProfileRepo.me,
  });
  const { data: disciplines = [] } = useQuery({ queryKey: ['disciplines'], queryFn: disciplineRepo.list });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Modifier mon profil" />
      {isLoading || !profile ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={typography.small}>Chargement…</Text>
        </View>
      ) : (
        <ProfileForm
          profile={profile as PraticienProfileData}
          disciplineOptions={disciplines.map((d) => d.name)}
          insetsBottom={insets.bottom}
        />
      )}
    </View>
  );
}

function ProfileForm({
  profile, disciplineOptions, insetsBottom,
}: { profile: PraticienProfileData; disciplineOptions: string[]; insetsBottom: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setName = useSession((s) => s.setName);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photo, setPhoto] = useState(profile.photo);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: profile.firstname, lastname: profile.lastname, email: profile.email,
      telephone: profile.telephone, ville: profile.ville, niveau: profile.niveau,
      specialite: profile.specialite, mode: profile.mode,
      tarif: String(profile.tarif), experience: String(profile.experience), bio: profile.bio,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => praticienProfileRepo.update({
      firstname: values.firstname, lastname: values.lastname, email: values.email,
      telephone: values.telephone, ville: values.ville, niveau: values.niveau,
      specialite: values.specialite, mode: values.mode,
      tarif: Number(values.tarif), experience: Number(values.experience), bio: values.bio,
    }),
    onSuccess: (updated) => {
      setName(updated.firstname, updated.lastname);
      queryClient.invalidateQueries({ queryKey: ['praticien-profile'] });
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const uploadPhoto = async (asset: { uri: string; name: string; mimeType: string }) => {
    setPhotoUploading(true);
    try {
      const url = await praticienProfileRepo.uploadPhoto(asset);
      setPhoto(url);
      queryClient.invalidateQueries({ queryKey: ['praticien-profile'] });
    } catch (err) {
      Alert.alert('Photo non envoyée', errorMessage(err));
    } finally {
      setPhotoUploading(false);
    }
  };

  const pickFromFiles = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    uploadPhoto({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Accès caméra refusé', "Autorisez l'accès à la caméra dans les réglages pour prendre une photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    uploadPhoto({ uri: asset.uri, name: `avatar-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const choosePhoto = () => {
    Alert.alert('Changer de photo', undefined, [
      { text: 'Prendre une photo', onPress: pickFromCamera },
      { text: 'Choisir un fichier', onPress: pickFromFiles },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insetsBottom + 32 }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Pressable onPress={choosePhoto} disabled={photoUploading}>
          <Avatar size="xl" source={photo ? { uri: photo } : undefined} gradient={[colors.violet, colors.sky]} />
          <View style={styles.photoBadge}>
            <Icon name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        <Text style={styles.photoHint}>{photoUploading ? 'Envoi…' : 'Changer la photo'}</Text>
      </View>

      <View style={styles.siretRow}>
        <Text style={styles.siretLabel}>SIRET</Text>
        <Text style={styles.siretValue}>{profile.siret}</Text>
      </View>
      <Text style={styles.siretHint}>
        Vérifié à l'inscription — contactez le support pour le modifier.
      </Text>

      <Controller control={control} name="firstname" render={({ field: { onChange, value } }) => (
        <Input label="Prénom" value={value} onChangeText={onChange} />
      )} />
      {errors.firstname && <Text style={styles.error}>{errors.firstname.message}</Text>}

      <Controller control={control} name="lastname" render={({ field: { onChange, value } }) => (
        <Input label="Nom" value={value} onChangeText={onChange} />
      )} />
      {errors.lastname && <Text style={styles.error}>{errors.lastname.message}</Text>}

      <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
        <Input label="Email" value={value} onChangeText={onChange} autoCapitalize="none" keyboardType="email-address" />
      )} />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller control={control} name="telephone" render={({ field: { onChange, value } }) => (
        <Input label="Téléphone" value={value} onChangeText={onChange} keyboardType="phone-pad" />
      )} />
      {errors.telephone && <Text style={styles.error}>{errors.telephone.message}</Text>}

      <Controller control={control} name="ville" render={({ field: { onChange, value } }) => (
        <Input label="Ville" value={value} onChangeText={onChange} />
      )} />
      {errors.ville && <Text style={styles.error}>{errors.ville.message}</Text>}

      <Text style={styles.label}>Niveau</Text>
      <Controller control={control} name="niveau" render={({ field: { onChange, value } }) => (
        <ChipRow options={NIVEAUX} value={value} onChange={onChange} />
      )} />
      {errors.niveau && <Text style={styles.error}>{errors.niveau.message}</Text>}

      <Text style={styles.label}>Spécialité</Text>
      <Controller control={control} name="specialite" render={({ field: { onChange, value } }) => (
        <ChipRow options={disciplineOptions} value={value} onChange={onChange} />
      )} />
      {errors.specialite && <Text style={styles.error}>{errors.specialite.message}</Text>}

      <Text style={styles.label}>Mode de séance</Text>
      <Controller control={control} name="mode" render={({ field: { onChange, value } }) => (
        <ChipRow options={MODES} value={value} onChange={onChange} />
      )} />
      {errors.mode && <Text style={styles.error}>{errors.mode.message}</Text>}

      <View style={{ height: 8 }} />
      <Controller control={control} name="tarif" render={({ field: { onChange, value } }) => (
        <Input label="Tarif par séance (€)" value={value} onChangeText={onChange} keyboardType="decimal-pad" />
      )} />
      {errors.tarif && <Text style={styles.error}>{errors.tarif.message}</Text>}

      <Controller control={control} name="experience" render={({ field: { onChange, value } }) => (
        <Input label="Années d'expérience" value={value} onChangeText={onChange} keyboardType="number-pad" />
      )} />
      {errors.experience && <Text style={styles.error}>{errors.experience.message}</Text>}

      <Controller control={control} name="bio" render={({ field: { onChange, value } }) => (
        <Input label="Bio (50 caractères minimum)" value={value} onChangeText={onChange} multiline />
      )} />
      {errors.bio && <Text style={styles.error}>{errors.bio.message}</Text>}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ height: 4 }} />
      <Button
        label={mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        onPress={handleSubmit((v) => mutation.mutate(v))}
        disabled={mutation.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photoBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.pearl,
  },
  photoHint: { ...typography.small, fontSize: 13, color: colors.violet2, marginTop: 10 },
  siretRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, backgroundColor: colors.mist, borderRadius: 14, marginBottom: 4,
  },
  siretLabel: { ...typography.tiny, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  siretValue: { fontFamily: 'Outfit_500Medium', fontSize: 14, color: colors.ink },
  siretHint: { ...typography.tiny, fontSize: 11, marginTop: 6, marginBottom: 14 },
  label: {
    ...typography.tiny, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase',
    marginTop: 6, marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.mist },
  chipActive: { backgroundColor: colors.ink },
  chipTxt: { ...typography.small, fontSize: 13, color: colors.ink },
  chipTxtActive: { color: '#fff', fontFamily: 'Outfit_500Medium' },
  error: { ...typography.tiny, color: colors.danger, marginTop: -10, marginBottom: 10 },
});
