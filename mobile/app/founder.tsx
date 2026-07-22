import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from '@components/AuroraBackground';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

export default function Founder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <View style={[styles.backWrap, { top: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="back" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <AuroraBackground variant="soft" style={[styles.hero, { paddingTop: insets.top + 60 }]}>
          <Text style={styles.label}>L'ÂME DU PROJET</Text>
          <Text style={styles.heroQuote}>
            "J'ai voulu un lieu{'\n'}où les âmes se rencontrent{'\n'}sans crier."
          </Text>
        </AuroraBackground>

        <View style={styles.body}>
          <Para>
            Il y a quelques années, un proche traversait une tempête intérieure. J'ai
            cherché, partout. Les annuaires étaient froids, les forums confus, et
            entre les vrais soignants de l'âme et ceux qui n'en sont pas, il fallait un
            instinct que la plupart d'entre nous n'avons pas — surtout quand on
            souffre.
          </Para>
          <Para>
            GuériEnergies est né de cette recherche. Un lieu où l'on trouve facilement la bonne
            personne, où les avis sont honnêtes, où les paiements protègent les deux
            côtés. Mais surtout — un lieu qui ne ressemble pas à une boutique. Un
            lieu qui ressemble à une rencontre.
          </Para>
          <Para>
            Je crois que les pratiques énergétiques, quand elles sont exercées avec
            honnêteté et humilité, ont leur place dans nos vies modernes. Pas en
            remplacement de la médecine. À côté. Dans les silences, dans les
            passages, dans les renaissances. GuériEnergies est une tentative de leur faire une
            vraie place — propre, transparente, vivante.
          </Para>
          <Para>
            Merci d'être là. Que vous soyez chercheur ou praticien, vous faites partie
            de quelque chose qui se construit, doucement.
          </Para>
          <Text style={styles.sig}>— avec gratitude,</Text>
          <Text style={styles.sigName}>LAURENT · FONDATEUR</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}

const styles = StyleSheet.create({
  backWrap: { position: 'absolute', left: 16, zIndex: 10 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    alignItems: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 4,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 18,
    opacity: 0.92,
  },
  heroQuote: {
    color: '#fff',
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 36,
    textAlign: 'center',
    lineHeight: 42,
  },

  body: { padding: 32, paddingTop: 28 },
  p: { ...typography.body, fontSize: 15.5, lineHeight: 27, marginBottom: 18 },
  sig: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 24,
    color: colors.ink,
    marginTop: 24,
  },
  sigName: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 2.4,
    marginTop: 4,
  },
});
