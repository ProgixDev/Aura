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
import { useQuery } from '@tanstack/react-query';
import { AuroraBackground } from '@components/AuroraBackground';
import { Badge } from '@components/Badge';
import { Icon } from '@components/Icon';
import { Lotus } from '@components/Lotus';
import { PractitionerCard } from '@components/PractitionerCard';
import { SectionHead } from '@components/SectionHead';
import { Chip } from '@components/Chip';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { practitionerRepo, disciplineRepo, eventRepo } from '@data/repos';
import { useSession } from '@store/session';

export default function Accueil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const firstName = useSession((s) => s.firstName);

  const recommended = useQuery({
    queryKey: ['practitioners', 'recommended'],
    queryFn: practitionerRepo.recommended,
  });
  const disciplines = useQuery({
    queryKey: ['disciplines'],
    queryFn: disciplineRepo.list,
  });
  const featured = useQuery({
    queryKey: ['events', 'featured'],
    queryFn: eventRepo.featured,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero greeting */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>LUNDI 24 MARS</Text>
          <Text style={styles.greet}>
            Bonjour {firstName ?? 'Sarah'},{'\n'}
            <Text style={styles.greetItalic}>
              qu'est-ce qui vous appelle ?
            </Text>
          </Text>
          <Text style={styles.heroSub}>
            Vos pratiques de la semaine vous attendent.
          </Text>
        </View>

        {/* Featured retreat */}
        <Pressable
          onPress={() => router.push('/event/e1' as any)}
          style={{ marginHorizontal: 20, marginVertical: 16 }}
        >
          <AuroraBackground variant="soft" rounded={28} style={styles.featured}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeTxt}>À l'AFFICHE</Text>
            </View>
            <View style={styles.featuredFoot}>
              <Text style={styles.featuredTitle}>
                Retraite équinoxe{'\n'}
                <Text style={styles.featuredItalic}>Massif du Vercors</Text>
              </Text>
              <Text style={styles.featuredMeta}>21–23 mars · 8 places restantes</Text>
            </View>
          </AuroraBackground>
        </Pressable>

        {/* Recommended practitioners */}
        <SectionHead title="Recommandés pour vous" action="Tout voir" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 8 }}
        >
          {recommended.data?.map((p) => (
            <PractitionerCard key={p.id} practitioner={p} variant="horizontal" />
          ))}
        </ScrollView>

        {/* Disciplines */}
        <View style={{ marginTop: 24 }}>
          <SectionHead title="Explorer par pratique" />
          <View style={styles.disciplineGrid}>
            {disciplines.data?.slice(0, 8).map((d) => (
              <Pressable
                key={d.slug}
                onPress={() => router.push(`/domain/${d.slug}` as any)}
                style={styles.discTile}
              >
                <View
                  style={[
                    styles.discIcon,
                    { backgroundColor: paletteForTone(d.tone).bg },
                  ]}
                >
                  {/* No fontFamily — Cormorant lacks glyphs for dingbats; system font renders them correctly. */}
                  <Text style={{ color: paletteForTone(d.tone).fg, fontSize: 18 }}>
                    {d.glyph}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.discName}>{d.name}</Text>
                  <Text style={styles.discCount}>{d.count} praticiens</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Events teaser */}
        <View style={{ marginTop: 24 }}>
          <SectionHead title="À vivre ensemble" action="Tous les événements" onAction={() => router.push('/(tabs)/evenements' as any)} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {featured.data?.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => router.push(`/event/${e.id}` as any)}
                style={[styles.eventTile, shadows.card]}
              >
                <AuroraBackground
                  variant="soft"
                  style={styles.eventTop}
                >
                  <View style={styles.eventPill}>
                    <Text style={styles.eventPillTxt}>
                      {e.kind.split('·')[0].trim()}
                    </Text>
                  </View>
                </AuroraBackground>
                <View style={{ padding: 14 }}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventMeta}>
                    {e.when} · {e.where}
                  </Text>
                  <View style={styles.eventFoot}>
                    <Text style={styles.eventPrice}>{e.price}</Text>
                    <Text style={styles.eventCta}>Découvrir →</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Founder card */}
        <Pressable
          onPress={() => router.push('/founder' as any)}
          style={[styles.founderCard, shadows.card]}
        >
          <AuroraBackground variant="soft" rounded={22} style={styles.founderIcon}>
            <Lotus size={20} color="#fff" />
          </AuroraBackground>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>L'ÂME DU PROJET</Text>
            <Text style={styles.founderTitle}>
              Le mot de Laurent, fondateur d'Aura
            </Text>
          </View>
          <Icon name="chevron" size={18} color={colors.muted} />
        </Pressable>

        {/* Educational teaser */}
        <View style={styles.educational}>
          <Text style={styles.eyebrow}>ÉDUCATIF</Text>
          <Text style={styles.eduTitle}>Qu'est-ce que le Reiki, vraiment ?</Text>
          <Text style={styles.eduBody}>
            3 minutes de lecture pour démystifier une pratique millénaire — sans
            jargon, sans promesse exagérée.
          </Text>
          <Pressable onPress={() => router.push('/domain/reiki' as any)}>
            <Text style={styles.eduLink}>Lire l'article →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function paletteForTone(tone: 'sky' | 'violet' | 'sage' | 'gold') {
  switch (tone) {
    case 'sky':
      return { bg: colors.chipSky, fg: colors.chipSkyText };
    case 'violet':
      return { bg: colors.chipViolet, fg: colors.chipVioletText };
    case 'sage':
      return { bg: colors.chipSage, fg: colors.chipSageText };
    case 'gold':
      return { bg: colors.chipGold, fg: colors.chipGoldText };
  }
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 4 },
  eyebrow: { ...typography.eyebrow, marginBottom: 6 },
  greet: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 32,
    lineHeight: 36,
    color: colors.ink,
  },
  greetItalic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  heroSub: { ...typography.small, marginTop: 6 },

  featured: {
    minHeight: 200,
    padding: 24,
    justifyContent: 'space-between',
    borderRadius: 28,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredBadgeTxt: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: 'Outfit_500Medium',
  },
  featuredFoot: { marginTop: 80 },
  featuredTitle: {
    fontFamily: 'CormorantGaramond_300Light',
    color: '#fff',
    fontSize: 30,
    lineHeight: 33,
  },
  featuredItalic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
  },
  featuredMeta: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    opacity: 0.92,
    marginTop: 8,
  },

  disciplineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  discTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  discIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discName: { ...typography.bodyMedium, fontSize: 13 },
  discCount: { ...typography.tiny, fontSize: 11 },

  eventTile: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
  },
  eventTop: {
    height: 130,
    justifyContent: 'flex-start',
    padding: 14,
  },
  eventPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  eventPillTxt: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 0.6,
  },
  eventTitle: {
    ...typography.serif,
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 17,
    marginBottom: 2,
  },
  eventMeta: { ...typography.small, fontSize: 12, marginBottom: 8 },
  eventFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  eventPrice: { ...typography.small, fontSize: 13 },
  eventCta: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.violet2 },

  founderCard: {
    marginHorizontal: 20,
    marginTop: 18,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
  },
  founderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderTitle: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 17,
    color: colors.ink,
  },

  educational: {
    margin: 20,
    marginTop: 24,
    padding: 22,
    backgroundColor: 'rgba(196,176,232,0.08)',
    borderRadius: 22,
  },
  eduTitle: {
    ...typography.h3,
    marginTop: 8,
    marginBottom: 6,
  },
  eduBody: { ...typography.small, lineHeight: 21, marginBottom: 12 },
  eduLink: { fontFamily: 'Outfit_500Medium', color: colors.violet2 },
});
