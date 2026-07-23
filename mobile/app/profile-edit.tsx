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
import { clientProfileRepo, type ClientProfile } from '@data/repos';
import { errorMessage } from '@data/api/client';
import { useSession } from '@store/session';

const schema = z.object({
  firstname: z.string().min(1, 'Prénom requis'),
  lastname: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional(),
  city: z.string().min(1, 'Ville requise'),
});
type FormValues = z.infer<typeof schema>;

export default function ProfileEdit() {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['client-profile'],
    queryFn: clientProfileRepo.me,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Modifier mon profil" />
      {isLoading || !profile ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={typography.small}>Chargement…</Text>
        </View>
      ) : (
        <ProfileForm profile={profile} insetsBottom={insets.bottom} />
      )}
    </View>
  );
}

function ProfileForm({ profile, insetsBottom }: { profile: ClientProfile; insetsBottom: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setName = useSession((s) => s.setName);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photo, setPhoto] = useState(profile.photo);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: profile.firstname,
      lastname: profile.lastname,
      email: profile.email,
      phone: profile.phone ?? '',
      city: profile.city,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => clientProfileRepo.update({
      firstname: values.firstname,
      lastname: values.lastname,
      email: values.email,
      phone: values.phone || undefined,
      city: values.city,
    }),
    onSuccess: (updated) => {
      setName(updated.firstname, updated.lastname);
      queryClient.invalidateQueries({ queryKey: ['client-profile'] });
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const uploadPhoto = async (asset: { uri: string; name: string; mimeType: string }) => {
    setPhotoUploading(true);
    try {
      const url = await clientProfileRepo.uploadPhoto(asset);
      setPhoto(url);
      queryClient.invalidateQueries({ queryKey: ['client-profile'] });
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

      <Controller
        control={control}
        name="firstname"
        render={({ field: { onChange, value } }) => <Input label="Prénom" value={value} onChangeText={onChange} />}
      />
      {errors.firstname && <Text style={styles.error}>{errors.firstname.message}</Text>}

      <Controller
        control={control}
        name="lastname"
        render={({ field: { onChange, value } }) => <Input label="Nom" value={value} onChangeText={onChange} />}
      />
      {errors.lastname && <Text style={styles.error}>{errors.lastname.message}</Text>}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <Input label="Email" value={value} onChangeText={onChange} autoCapitalize="none" keyboardType="email-address" />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <Input label="Téléphone" value={value} onChangeText={onChange} keyboardType="phone-pad" />
        )}
      />

      <Controller
        control={control}
        name="city"
        render={({ field: { onChange, value } }) => <Input label="Ville" value={value} onChangeText={onChange} />}
      />
      {errors.city && <Text style={styles.error}>{errors.city.message}</Text>}

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
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.pearl,
  },
  photoHint: { ...typography.small, fontSize: 13, color: colors.violet2, marginTop: 10 },
  error: { ...typography.tiny, color: colors.danger, marginTop: -10, marginBottom: 10 },
});
