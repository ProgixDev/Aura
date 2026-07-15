import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenHeader } from '@components/ScreenHeader';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';
import { api, ApiError } from '@data/api/client';

const schema = z.object({
  firstName: z.string().min(1, 'Votre prénom').optional(),
  lastName: z.string().min(1, 'Votre nom').optional(),
  city: z.string().min(1, 'Votre ville').optional(),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
});
type FormValues = z.infer<typeof schema>;

interface AuthResponse {
  data: {
    token: string;
    client: { firstname: string };
  };
}

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signup' | 'login'>(params.mode === 'login' ? 'login' : 'signup');
  const [submitting, setSubmitting] = useState(false);
  const setFirstName = useSession((s) => s.setFirstName);
  const setOnboardingSeen = useSession((s) => s.setOnboardingSeen);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', city: '', email: '', password: '' },
  });

  const submit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await api.post<AuthResponse>('/client/login', {
          email: data.email,
          password: data.password,
        });
        useSession.getState().setToken(res.data.token);
        setFirstName(res.data.client.firstname);
        setOnboardingSeen();
        router.replace('/(tabs)' as any);
        return;
      }

      if (!data.firstName || !data.lastName || !data.city) {
        Alert.alert('Champs requis', 'Merci de renseigner votre prénom, nom et ville.');
        return;
      }
      const res = await api.post<AuthResponse>('/client/register', {
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        city: data.city,
        password: data.password,
        password_confirmation: data.password,
      });
      useSession.getState().setToken(res.data.token);
      setFirstName(res.data.client.firstname);
      setOnboardingSeen();
      router.push('/onboarding/quiz?step=0' as any);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
      Alert.alert(mode === 'login' ? 'Connexion impossible' : 'Inscription impossible', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader transparent />
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.h1}>
          {mode === 'login' ? (
            <>Bon <Text style={styles.italic}>retour</Text></>
          ) : (
            <>Créer mon <Text style={styles.italic}>espace</Text></>
          )}
        </Text>
        <Text style={styles.small}>
          {mode === 'login' ? 'Ravie de vous revoir.' : 'Quelques informations, en toute discrétion.'}
        </Text>

        <View style={{ height: 24 }} />

        {mode === 'signup' && (
          <>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <Input label="Prénom" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value } }) => (
                <Input label="Nom" value={value} onChangeText={onChange} />
              )}
            />
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, value } }) => (
                <Input label="Ville" value={value} onChangeText={onChange} />
              )}
            />
          </>
        )}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          )}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Mot de passe"
              value={value}
              onChangeText={onChange}
              secureTextEntry
            />
          )}
        />
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

        <Text style={styles.legal}>
          En continuant, vous acceptez notre{' '}
          <Text style={styles.link}>charte de bienveillance</Text> et notre{' '}
          <Text style={styles.link}>politique de confidentialité</Text>.
        </Text>

        <Button
          label={submitting ? 'Un instant…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          onPress={handleSubmit(submit)}
          disabled={submitting}
        />

        <Text style={styles.switchMode}>
          {mode === 'login' ? (
            <>
              Pas encore de compte ?{' '}
              <Text style={styles.link} onPress={() => setMode('signup')}>Créer un compte</Text>
            </>
          ) : (
            <>
              Déjà membre ?{' '}
              <Text style={styles.link} onPress={() => setMode('login')}>Se connecter</Text>
            </>
          )}
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { ...typography.h1, marginBottom: 6 },
  italic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  small: { ...typography.small },
  legal: { ...typography.small, fontSize: 12, marginVertical: 12, lineHeight: 18 },
  link: { color: colors.violet2 },
  switchMode: {
    textAlign: 'center',
    marginTop: 16,
    ...typography.small,
    fontSize: 13,
  },
  error: {
    ...typography.tiny,
    color: colors.danger,
    marginTop: -10,
    marginBottom: 10,
  },
});
