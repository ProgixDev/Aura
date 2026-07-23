import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useSession, type Role } from '@store/session';
import { usePraticienRegistration } from '@store/praticienRegistration';
import { api, ApiError } from '@data/api/client';

const schema = z.object({
  // Required only for signup — enforced at runtime in submit() below (they aren't
  // even rendered in login mode, so a min(1) here would reject the '' defaultValues
  // and silently block every login submit with no visible error).
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  city: z.string().optional(),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
});
type FormValues = z.infer<typeof schema>;

interface ClientAuthResponse {
  data: { token: string; client: { firstname: string; lastname: string } };
}
interface PraticienAuthResponse {
  data: {
    token: string;
    praticien: { firstname: string; lastname: string };
    verification_status: string;
  };
}

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; presetRole?: string }>();
  const [mode, setMode] = useState<'signup' | 'login'>(params.mode === 'login' ? 'login' : 'signup');
  const [submitting, setSubmitting] = useState(false);
  const sessionRole = useSession((s) => s.role);
  const sessionFirstName = useSession((s) => s.firstName);
  const sessionLastName = useSession((s) => s.lastName);
  // Set when an already-authenticated client taps "Devenir praticien" in
  // profil.tsx — skips the role-picker screen (intent is unambiguous) and
  // prefills what we already know about them.
  const isUpgrade = params.presetRole === 'practitioner';
  const [authRole, setAuthRole] = useState<Role>(isUpgrade ? 'practitioner' : sessionRole ?? 'seeker');
  const setRole = useSession((s) => s.setRole);
  const setAuthenticated = useSession((s) => s.setAuthenticated);
  const setOnboardingSeen = useSession((s) => s.setOnboardingSeen);
  const patchRegistrationDraft = usePraticienRegistration((s) => s.patchDraft);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: isUpgrade ? sessionFirstName ?? '' : '',
      lastName: isUpgrade ? sessionLastName ?? '' : '',
      city: '',
      email: '',
      password: '',
    },
  });

  const submit = async (data: FormValues) => {
    setSubmitting(true);
    setRole(authRole);
    try {
      if (mode === 'login') {
        if (authRole === 'practitioner') {
          const res = await api.post<PraticienAuthResponse>('/praticien/login', {
            email: data.email,
            password: data.password,
          });
          setAuthenticated({
            token: res.data.token,
            userType: 'praticien',
            firstName: res.data.praticien.firstname,
            lastName: res.data.praticien.lastname,
            verificationStatus: res.data.verification_status,
          });
        } else {
          const res = await api.post<ClientAuthResponse>('/client/login', {
            email: data.email,
            password: data.password,
          });
          setAuthenticated({
            token: res.data.token,
            userType: 'client',
            firstName: res.data.client.firstname,
            lastName: res.data.client.lastname,
          });
        }
        setOnboardingSeen();
        // Praticiens land on their dashboard, clients on the seeker tabs —
        // routing both to '/(tabs)' showed praticiens the client experience.
        router.replace((authRole === 'practitioner' ? '/dashboard' : '/(tabs)') as any);
        return;
      }

      if (!data.firstName || !data.lastName || !data.city) {
        Alert.alert('Champs requis', 'Merci de renseigner votre prénom, nom et ville.');
        return;
      }

      if (authRole === 'practitioner') {
        // Praticien registration needs 7 more fields (téléphone, niveau,
        // spécialité, mode, tarif, expérience, bio) plus 5 required document
        // uploads — collected over the next two screens, then submitted as
        // one multipart POST. Nothing is sent to the backend yet.
        patchRegistrationDraft({
          firstname: data.firstName,
          lastname: data.lastName,
          email: data.email,
          password: data.password,
          ville: data.city,
        });
        // Replace, not push — keeps this chain consistent with the rest of
        // onboarding (linear progression, no back into an earlier step).
        router.replace('/onboarding/praticien-profil' as any);
        return;
      }

      const res = await api.post<ClientAuthResponse>('/client/register', {
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        city: data.city,
        password: data.password,
        password_confirmation: data.password,
      });
      setAuthenticated({
        token: res.data.token,
        userType: 'client',
        firstName: res.data.client.firstname,
        lastName: res.data.client.lastname,
      });
      setOnboardingSeen();
      // Replace, not push — the signup form must not be reachable via back
      // once the account is actually created and the user is authenticated.
      router.replace('/onboarding/quiz?step=0' as any);
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
          {mode === 'login'
            ? 'Ravie de vous revoir.'
            : isUpgrade
            ? 'Cet espace praticien est distinct de votre compte actuel : choisissez un email et un mot de passe dédiés.'
            : 'Quelques informations, en toute discrétion.'}
        </Text>

        <View style={{ height: 20 }} />

        {!isUpgrade && (
          <>
            <View style={styles.roleToggle}>
              <Pressable
                style={[styles.roleOption, authRole === 'seeker' && styles.roleOptionActive]}
                onPress={() => setAuthRole('seeker')}
              >
                <Text style={[styles.roleOptionTxt, authRole === 'seeker' && styles.roleOptionTxtActive]}>
                  Je cherche un soin
                </Text>
              </Pressable>
              <Pressable
                style={[styles.roleOption, authRole === 'practitioner' && styles.roleOptionActive]}
                onPress={() => setAuthRole('practitioner')}
              >
                <Text style={[styles.roleOptionTxt, authRole === 'practitioner' && styles.roleOptionTxtActive]}>
                  Je suis praticien
                </Text>
              </Pressable>
            </View>

            <View style={{ height: 20 }} />
          </>
        )}

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
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.mist,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  roleOptionActive: { backgroundColor: '#fff' },
  roleOptionTxt: { ...typography.small, fontSize: 13, color: colors.muted },
  roleOptionTxtActive: { color: colors.ink, fontFamily: 'Outfit_500Medium' },
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
