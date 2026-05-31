import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { AuroraBackground } from '@components/AuroraBackground';
import { Chip } from '@components/Chip';
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
          {d?.heroImage ? (
            <>
              <Image source={d.heroImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(27,23,48,0.15)', 'rgba(27,23,48,0.65)']}
                style={StyleSheet.absoluteFillObject}
              />
            </>
          ) : (
            <AuroraBackground variant="soft" style={StyleSheet.absoluteFillObject as any}>
              <></>
            </AuroraBackground>
          )}
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <Pressable style={styles.iconCircle} onPress={() => router.back()}>
              <Icon name="back" size={20} color={colors.ink} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.iconCircle}>
                <Icon name="heart" size={18} color={colors.ink} />
              </Pressable>
              <Pressable style={styles.iconCircle}>
                <Icon name="share" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.heroLabel}>PRATIQUE MILLÉNAIRE · JAPON</Text>
            <Text style={styles.heroTitle}>
              Qu'est-ce que{'\n'}le <Text style={styles.heroItalic}>{d?.name ?? 'Reiki'}</Text> ?
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

          <Text style={styles.h3}>À quoi s'attendre</Text>
          <View style={styles.expectGrid}>
            <ExpectCell h="60 à 90 min" d="d'une séance type, allongé·e habillé·e" />
            <ExpectCell h="3 séances" d="pour ressentir un changement durable" />
            <ExpectCell h="50 à 90€" d="fourchette habituelle en France" />
            <ExpectCell h="Sans contact" d="les mains ne touchent pas le corps" />
          </View>

          <Text style={styles.h3}>Indications fréquentes</Text>
          <View style={styles.chipsRow}>
            <Chip label="Stress et anxiété" tone="violet" />
            <Chip label="Insomnies" tone="sky" />
            <Chip label="Convalescence" tone="sage" />
            <Chip label="Émotions bloquées" tone="violet" />
            <Chip label="Préparation médicale" tone="gold" />
          </View>

          <View style={{ height: 18 }} />
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

function ExpectCell({ h, d }: { h: string; d: string }) {
  return (
    <View style={styles.expectCell}>
      <Text style={styles.expectH}>{h}</Text>
      <Text style={styles.expectD}>{d}</Text>
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
  expectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  expectCell: {
    width: '48%',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  expectH: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 18,
    marginBottom: 4,
  },
  expectD: { ...typography.small, fontSize: 12, lineHeight: 17 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
});
