import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { articleRepo } from '@data/repos';

export default function BlogList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: articleRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Journal" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Text style={typography.eyebrow}>JOURNAL</Text>
          <Text style={styles.h}>
            Lire, comprendre, <Text style={styles.italic}>ralentir.</Text>
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {articles.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => router.push(`/blog/${a.slug}` as any)}
              style={[styles.card, shadows.card]}
            >
              {a.image_couverture && (
                <Image source={{ uri: a.image_couverture }} style={styles.thumb} />
              )}
              <View style={styles.body}>
                <Text style={styles.category}>{a.categorie}</Text>
                <Text style={styles.title}>{a.titre}</Text>
                <Text style={styles.excerpt} numberOfLines={2}>
                  {a.extrait}
                </Text>
                <Text style={styles.meta}>
                  {a.auteur} · {a.temps_lecture} min
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 24,
    lineHeight: 28,
    marginVertical: 8,
  },
  italic: {
    fontFamily: 'CormorantGaramond_500Medium_Italic',
    color: colors.violet2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: 140 },
  body: { padding: 18 },
  category: { ...typography.eyebrow, marginBottom: 8 },
  title: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 19,
    lineHeight: 23,
    marginBottom: 6,
    color: colors.ink,
  },
  excerpt: { ...typography.small, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  meta: { ...typography.tiny, fontSize: 11 },
});
