import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { AuroraBackground } from '@components/AuroraBackground';
import { EscrowNotice } from '@components/EscrowNotice';
import { Icon } from '@components/Icon';
import { PractitionerCard } from '@components/PractitionerCard';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { disciplineRepo, practitionerRepo } from '@data/repos';

export default function DomainDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Hero photos are remote — fade the image in over an aurora placeholder so
  // the load reads as intentional, not a flat solid flashing to a photo.
  const heroFade = useRef(new Animated.Value(0)).current;
  const onHeroLoad = () =>
    Animated.timing(heroFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();

  const { data: d } = useQuery({
    queryKey: ['discipline', slug],
    queryFn: () => disciplineRepo.bySlug(String(slug)),
  });
  const { data: pract = [] } = useQuery({
    queryKey: ['practitioners', 'byDiscipline', d?.name],
    queryFn: () => practitionerRepo.byDiscipline(d?.name ?? ''),
    enabled: !!d,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          {/* Aurora placeholder always sits underneath so the load state is
              branded, not a flat solid. Remote photo fades in on top. */}
          <AuroraBackground variant="soft" style={StyleSheet.absoluteFillObject as any}>
            <></>
          </AuroraBackground>
          {d?.heroImage ? (
            <>
              <Animated.Image
                source={d.heroImage}
                onLoad={onHeroLoad}
                style={[StyleSheet.absoluteFillObject, { opacity: heroFade }]}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(27,23,48,0.15)', 'rgba(27,23,48,0.65)']}
                style={StyleSheet.absoluteFillObject}
              />
            </>
          ) : null}
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <Pressable style={styles.iconCircle} onPress={() => router.back()}>
              <Icon name="back" size={20} color={colors.ink} />
            </Pressable>
            <Pressable
              style={styles.iconCircle}
              onPress={() => d && Share.share({ message: `${d.name} sur Aura — https://aura.fr/discipline/${slug}` })}
            >
              <Icon name="share" size={18} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.heroLabel}>DÉCOUVRIR</Text>
            <Text style={styles.heroTitle}>
              Qu'est-ce que{'\n'}le <Text style={styles.heroItalic}>{d?.name ?? '…'}</Text> ?
            </Text>
          </View>
        </View>

        <View style={{ padding: 24 }}>
          {d?.intro ? (
            <Text style={styles.p}>{d.intro}</Text>
          ) : (
            <Text style={styles.p}>
              Une pratique de soin énergétique pratiquée avec respect et présence.
            </Text>
          )}

          {d?.pullQuote ? (
            <View style={styles.pull}>
              <Text style={styles.pullTxt}>"{d.pullQuote}"</Text>
            </View>
          ) : null}

          <View style={{ height: 4 }} />
          <EscrowNotice
            tone="violet"
            title="Une parole prudente."
            body="Le Reiki ne remplace pas un avis médical. En cas de problème de santé, parlez-en d'abord à votre médecin."
          />

          <Text style={[styles.h3, { marginTop: 24 }]}>
            Praticiens près de vous
          </Text>
          {pract.map((p) => (
            <PractitionerCard key={p.id} practitioner={p} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 320, position: 'relative' },
  heroActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFoot: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
  },
  heroLabel: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 4,
    fontFamily: 'Outfit_500Medium',
    marginBottom: 10,
    opacity: 0.92,
  },
  heroTitle: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 42,
    color: '#fff',
    lineHeight: 44,
  },
  heroItalic: { fontFamily: 'CormorantGaramond_400Regular_Italic' },

  p: { ...typography.body, marginBottom: 14, lineHeight: 25 },
  pull: {
    borderLeftWidth: 2,
    borderLeftColor: colors.violet2,
    paddingLeft: 16,
    marginVertical: 18,
  },
  pullTxt: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  h3: { ...typography.h3, marginTop: 4, marginBottom: 12 },
});
