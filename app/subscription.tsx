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
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { Lotus } from '@components/Lotus';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';

const features = [
  { t: 'Profil mis en avant.', d: " Photos, gallerie, bio, jusqu'à 5 disciplines." },
  { t: 'Agenda intelligent.', d: ' Vos créneaux, en présentiel ou en visio.' },
  { t: 'Paiement sécurisé Stripe.', d: " Aura tient les fonds jusqu'à la séance." },
  { t: 'Publier événements & retraites.', d: ' Pré-inscriptions et billetterie incluses.' },
  { t: 'Échanges & dons.', d: " Donner ce que vous savez, recevoir ce qu'il vous faut." },
  { t: 'Pause libre.', d: ' Désactivez votre profil sans rien perdre.' },
  { t: 'Niveau "novice" assumé.', d: ' Tarif réduit, signalé honnêtement.' },
];

export default function Subscription() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const start = () => {
    router.replace('/dashboard' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.backWrap, { top: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="back" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <AuroraBackground variant="soft" style={[styles.hero, { paddingTop: insets.top + 60 }]}>
          <Lotus size={64} color="#fff" />
          <Text style={styles.heroTitle}>
            Faire entendre{'\n'}
            votre <Text style={styles.italic}>pratique.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Une visibilité juste, des outils simples, et une communauté qui vous reconnaît.
          </Text>
        </AuroraBackground>

        <View style={[styles.card, shadows.cardHover]}>
          <View style={styles.offerPill}>
            <Text style={styles.offerPillTxt}>1 MOIS OFFERT</Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.price}>
              0€ <Text style={styles.italic}>pendant 30 jours</Text>
            </Text>
            <Text style={styles.priceThen}>puis 9,90 €/mois — sans engagement</Text>
          </View>

          {features.map((f) => (
            <View key={f.t} style={styles.featRow}>
              <View style={styles.featIc}>
                <Icon name="check" size={14} color={colors.chipSageText} />
              </View>
              <Text style={styles.featTxt}>
                <Text style={styles.featStrong}>{f.t}</Text>
                {f.d}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={styles.testimony}>
            "On a longtemps cherché un endroit comme celui-ci."
          </Text>
          <Text style={styles.testimonyAttrib}>
            Mathieu V. · chamane · sur Aura depuis 6 mois
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button variant="aurora" label="Commencer mon mois offert" onPress={start} />
        <Text style={styles.dockHelp}>
          Annulable à tout moment depuis votre espace.
        </Text>
      </View>
    </View>
  );
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
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 34,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
    lineHeight: 36,
  },
  italic: { fontFamily: 'CormorantGaramond_400Regular_Italic' },
  heroSub: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 280,
  },

  card: {
    marginHorizontal: 16,
    marginTop: -30,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
  },
  offerPill: {
    alignSelf: 'center',
    backgroundColor: colors.chipSage,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  offerPillTxt: {
    color: colors.chipSageText,
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1.6,
  },
  priceBlock: { alignItems: 'center', paddingVertical: 18 },
  price: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 42,
    lineHeight: 44,
    color: colors.ink,
    textAlign: 'center',
  },
  priceThen: { ...typography.small, fontSize: 13, marginTop: 8 },

  featRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  featIc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.chipSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTxt: { flex: 1, ...typography.small, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft },
  featStrong: { fontFamily: 'Outfit_500Medium', color: colors.ink },

  testimony: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 18,
    color: colors.muted,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 6,
  },
  testimonyAttrib: { ...typography.tiny },

  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  dockHelp: { ...typography.tiny, textAlign: 'center', marginTop: 8 },
});
