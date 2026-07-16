import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { articleRepo } from '@data/repos';

export default function BlogDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: a } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => articleRepo.bySlug(String(slug)),
  });

  if (!a) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const paragraphs = a.corps.split('\n\n').filter(Boolean);
  const pullIndex = paragraphs.length > 2 ? Math.floor(paragraphs.length / 2) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {a.image_couverture && (
          <Image source={{ uri: a.image_couverture }} style={styles.hero} />
        )}

        <View style={styles.topRow}>
          <Pressable style={styles.iconCircle} onPress={() => router.back()}>
            <Icon name="back" size={20} color={colors.ink} />
          </Pressable>
          <Pressable style={styles.iconCircle}>
            <Icon name="share" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <Text style={typography.eyebrow}>{a.categorie}</Text>
          <Text style={styles.title}>{a.titre}</Text>
          <Text style={styles.meta}>
            {a.auteur} · {a.temps_lecture} min de lecture
          </Text>

          <View style={styles.pull}>
            <Text style={styles.pullTxt}>{a.extrait}</Text>
          </View>

          {paragraphs.map((para, i) =>
            i === pullIndex ? (
              <View key={i} style={styles.midPull}>
                <Text style={styles.midPullTxt}>{para}</Text>
              </View>
            ) : (
              <Text key={i} style={styles.p}>
                {para}
              </Text>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 220, marginBottom: 14 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    marginTop: 10,
    marginBottom: 8,
  },
  meta: { ...typography.small, fontSize: 12, marginBottom: 18 },
  pull: {
    borderLeftWidth: 2,
    borderLeftColor: colors.violet2,
    paddingLeft: 16,
    marginBottom: 22,
  },
  pullTxt: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 20,
    lineHeight: 27,
    color: colors.ink,
  },
  p: { ...typography.body, marginBottom: 16, lineHeight: 24 },
  midPull: {
    borderLeftWidth: 2,
    borderLeftColor: colors.violet2,
    paddingLeft: 16,
    marginVertical: 18,
  },
  midPullTxt: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 20,
    lineHeight: 27,
    color: colors.ink,
  },
});
