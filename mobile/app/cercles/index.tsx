import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CircleCard } from '@components/CircleCard';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { cercleRepo } from '@data/repos';

export default function CerclesList() {
  const insets = useSafeAreaInsets();
  const { data: circles = [] } = useQuery({
    queryKey: ['cercles'],
    queryFn: cercleRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Cercles" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Text style={typography.eyebrow}>COMMUNAUTÉ</Text>
          <Text style={styles.h}>
            Les <Text style={styles.italic}>cercles</Text> GuériEnergies.
          </Text>
          <Text style={styles.sub}>
            Des espaces de partage continus, en ligne et en présentiel.
          </Text>
        </View>

        {circles.map((c) => (
          <CircleCard key={c.id} circle={c} />
        ))}
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
  sub: { ...typography.small, lineHeight: 20 },
});
