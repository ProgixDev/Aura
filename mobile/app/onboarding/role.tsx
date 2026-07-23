import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Lotus } from '@components/Lotus';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors, auroraWarm } from '@theme/colors';
import { typography } from '@theme/typography';
import { spacing } from '@theme/spacing';
import { shadows } from '@theme/shadows';
import { useSession } from '@store/session';
import Svg, { Path } from 'react-native-svg';

type Role = 'seeker' | 'practitioner';

export default function RoleChoice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setRole = useSession((s) => s.setRole);
  const [picked, setPicked] = useState<Role>('seeker');

  const continueFlow = () => {
    setRole(picked);
    // Replace, not push — the role picker shouldn't be reachable via back once
    // the user moves into the auth form and beyond.
    router.replace('/onboarding/auth' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader transparent />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 12, paddingBottom: insets.bottom + 32 }}>
        <Text style={styles.eyebrow}>BIENVENUE</Text>
        <Text style={styles.h1}>
          Qui êtes-vous,{' '}
          <Text style={styles.italic}>aujourd'hui</Text> ?
        </Text>
        <Text style={styles.small}>Vous pourrez changer de rôle plus tard.</Text>

        <View style={{ height: 24 }} />

        <Pressable
          style={[
            styles.card,
            shadows.card,
            picked === 'seeker' && styles.cardSelected,
          ]}
          onPress={() => setPicked('seeker')}
        >
          <AuroraBackground variant="soft" rounded={20} style={styles.cardIcon}>
            <Lotus size={32} color="#fff" />
          </AuroraBackground>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Je cherche un soin</Text>
            <Text style={styles.cardBody}>
              Trouver un praticien, un événement ou un cercle. Pour moi ou un
              proche.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.card,
            shadows.card,
            picked === 'practitioner' && styles.cardSelected,
          ]}
          onPress={() => setPicked('practitioner')}
        >
          <AuroraBackground variant="warm" rounded={20} style={styles.cardIcon}>
            <Svg viewBox="0 0 24 24" width={30} height={30} fill="none" stroke="#fff" strokeWidth={1.4}>
              <Path d="M12 2v6m0 0a4 4 0 0 1 4 4v3H8v-3a4 4 0 0 1 4-4zM4 19h16v3H4z" />
            </Svg>
          </AuroraBackground>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Je suis praticien</Text>
            <Text style={styles.cardBody}>
              Magnétiseur, énergéticien, organisateur de retraites… 1 mois
              offert.
            </Text>
          </View>
        </Pressable>

        <View style={{ height: 32 }} />

        <Button label="Continuer" onPress={continueFlow} />
        <Text style={styles.connect}>
          Déjà membre ?{' '}
          <Text style={styles.link} onPress={() => router.replace('/onboarding/auth?mode=login' as any)}>
            Se connecter
          </Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...typography.eyebrow,
    marginBottom: 8,
  },
  h1: {
    ...typography.h1,
    marginBottom: 6,
  },
  italic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  small: { ...typography.small },
  card: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#fff',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.violet2,
  },
  cardIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...typography.h3,
    fontSize: 22,
    marginBottom: 4,
  },
  cardBody: {
    ...typography.small,
    fontSize: 13,
    lineHeight: 18,
  },
  connect: {
    textAlign: 'center',
    marginTop: 18,
    ...typography.small,
    fontSize: 13,
  },
  link: {
    color: colors.violet2,
    fontFamily: 'Outfit_500Medium',
  },
});
