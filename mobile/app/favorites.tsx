import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@components/Icon';
import { PractitionerCard } from '@components/PractitionerCard';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { favoriteRepo } from '@data/repos';

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoriteRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Mes favoris" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon name="heart" size={28} color={colors.muted} />
            <Text style={styles.emptyTitle}>Aucun favori pour l'instant</Text>
            <Text style={styles.emptyBody}>
              Touchez le cœur sur le profil d'un praticien pour le retrouver ici.
            </Text>
          </View>
        ) : (
          favorites.map((p) => <PractitionerCard key={p.id} practitioner={p} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...typography.small, textAlign: 'center', marginTop: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18, color: colors.ink, marginTop: 6 },
  emptyBody: { ...typography.small, fontSize: 13, textAlign: 'center', maxWidth: 260 },
});
