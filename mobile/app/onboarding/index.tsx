import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@components/Button';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { onboardingImages } from '@data/images';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    image: onboardingImages[0],
    title: 'Tous les guérisseurs.',
    titleItalic: 'Un seul lieu de confiance.',
    text:
      "Magnétiseurs, chamans, énergéticiens, hypnothérapeutes — l'ensemble des praticiens de l'énergie et du bien-être réunis sur Aura.",
  },
  {
    image: onboardingImages[1],
    title: 'Choisir',
    titleItalic: 'en confiance.',
    text:
      "Avis transparents, vérifications, paiement sécurisé jusqu'à la fin de la séance. Plus de charlatans, plus de doute.",
  },
  {
    image: onboardingImages[2],
    title: 'Une communauté qui',
    titleItalic: 'prend soin.',
    text:
      "Échangez des soins, rejoignez des retraites, partagez vos pratiques. Aura est un cercle, pas un catalogue.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scrollRef = React.useRef<ScrollView>(null);

  const next = () => {
    if (index < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex(index + 1);
    } else {
      router.push('/onboarding/role' as any);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {slides.map((s, i) => (
          <ImageBackground
            key={i}
            source={s.image}
            resizeMode="cover"
            style={[styles.slide, { width, height }]}
          >
            {/* Dark gradient so the white serif text stays legible. */}
            <LinearGradient
              colors={['rgba(17,9,28,0.1)', 'rgba(17,9,28,0.35)', 'rgba(17,9,28,0.85)']}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
              <Text style={styles.title}>
                {s.title}
                {'\n'}
                <Text style={styles.italic}>{s.titleItalic}</Text>
              </Text>
              <Text style={styles.body}>{s.text}</Text>
            </View>
          </ImageBackground>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.footerRow}>
          <Pressable onPress={() => router.push('/onboarding/role' as any)}>
            <Text style={styles.skip}>Passer</Text>
          </Pressable>
          <Button
            label={index === slides.length - 1 ? 'Commencer' : 'Suivant'}
            onPress={next}
            fullWidth={false}
            style={{ paddingHorizontal: 36 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { overflow: 'hidden' },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 44,
    color: '#fff',
    lineHeight: 46,
    marginBottom: 14,
    maxWidth: 300,
  },
  italic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: '#fff',
    lineHeight: 23,
    opacity: 0.92,
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: colors.pearl,
    alignItems: 'center',
    gap: 20,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(45,37,64,0.18)',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.ink,
  },
  footerRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: { ...typography.small, color: colors.muted, padding: 8 },
});
