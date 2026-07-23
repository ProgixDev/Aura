import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CircleCard } from '@components/CircleCard';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { cercleRepo } from '@data/repos';
import { useSession } from '@store/session';

export default function CerclesList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPraticien = useSession((s) => s.userType) === 'praticien';
  const { data: circles = [] } = useQuery({
    queryKey: ['cercles'],
    queryFn: cercleRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader
        title="Cercles"
        rightAction={
          isPraticien ? (
            <Pressable onPress={() => router.push('/cercles/create' as any)} style={styles.plusBtn}>
              <Icon name="plus" size={20} color={colors.ink} />
            </Pressable>
          ) : undefined
        }
      />
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
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.whiteAlpha85,
  },
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
