import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenHeader } from '@components/ScreenHeader';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';

const schema = z.object({
  firstName: z.string().min(1, 'Votre prénom'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
});
type FormValues = z.infer<typeof schema>;

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setFirstName = useSession((s) => s.setFirstName);
  const setOnboardingSeen = useSession((s) => s.setOnboardingSeen);

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: 'Sarah',
      email: 'sarah.l@email.fr',
      password: '••••••••',
    },
  });

  const submit = (data: FormValues) => {
    setFirstName(data.firstName);
    setOnboardingSeen();
    router.push('/onboarding/quiz?step=0' as any);
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
          Créer mon <Text style={styles.italic}>espace</Text>
        </Text>
        <Text style={styles.small}>Quelques informations, en toute discrétion.</Text>

        <View style={{ height: 24 }} />

        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, value } }) => (
            <Input label="Prénom" value={value} onChangeText={onChange} />
          )}
        />
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

        <Text style={styles.legal}>
          En continuant, vous acceptez notre{' '}
          <Text style={styles.link}>charte de bienveillance</Text> et notre{' '}
          <Text style={styles.link}>politique de confidentialité</Text>.
        </Text>

        <Button label="Créer mon compte" onPress={handleSubmit(submit)} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerTxt}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          label="Continuer avec Apple"
          variant="soft"
          leftIcon={
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                fill="#000"
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
              />
            </Svg>
          }
          style={{ marginBottom: 10 }}
        />
        <Button
          label="Continuer avec Google"
          variant="soft"
          leftIcon={
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path
                fill="#EA4335"
                d="M5.27 9.76A7.08 7.08 0 0 1 12 5.04 7 7 0 0 1 17.18 7l2.79-2.79A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.09 2.69z"
              />
              <Path
                fill="#34A853"
                d="M16.05 18.13A6.94 6.94 0 0 1 12 19.32a7.07 7.07 0 0 1-6.72-4.85L2.16 17.1A11 11 0 0 0 12 23a10.5 10.5 0 0 0 7.25-2.66l-3.2-2.21z"
              />
              <Path
                fill="#4A90E2"
                d="M19.25 20.34a11.46 11.46 0 0 0 3.53-8.84c0-.74-.07-1.45-.2-2.14H12v4.5h6.07c-.29 1.4-1.07 2.59-2.22 3.43l3.4 3.05z"
              />
              <Path
                fill="#FBBC05"
                d="M5.28 14.46A7 7 0 0 1 4.91 12c0-.86.14-1.69.38-2.46L2.18 6.85A11 11 0 0 0 1 12c0 1.81.43 3.52 1.18 5.04l3.1-2.58z"
              />
            </Svg>
          }
        />
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  dividerTxt: { ...typography.tiny },
});
