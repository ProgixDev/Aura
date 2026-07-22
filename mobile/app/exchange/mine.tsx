import React, { useMemo, useState } from 'react';
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
import { Chip } from '@components/Chip';
import { ExchangeCard } from '@components/ExchangeCard';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { praticienExchangeRepo } from '@data/repos';
import { filterExchanges, type ExchangeFilter } from '@utils/filterExchanges';

export default function ExchangeMine() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: list = [] } = useQuery({
    queryKey: ['exchanges', 'mine'],
    queryFn: praticienExchangeRepo.list,
  });
  const [filter, setFilter] = useState<ExchangeFilter>('all');
  const filtered = useMemo(() => filterExchanges(list, filter), [list, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader
        title="Mes échanges"
        rightAction={
          <Pressable
            onPress={() => router.push('/exchange/create' as any)}
            style={styles.plusBtn}
          >
            <Icon name="plus" size={20} color={colors.ink} />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Text style={typography.eyebrow}>VOS PUBLICATIONS</Text>
          <Text style={styles.h}>
            Vos propositions de{' '}
            <Text style={styles.italic}>troc.</Text>
          </Text>
          <Text style={styles.sub}>
            Suivez et gérez les échanges que vous avez publiés à la communauté.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 14 }}
        >
          <Chip label="Tous" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Propositions" tone="violet" active={filter === 'proposition'} onPress={() => setFilter('proposition')} />
          <Chip label="Demandes" tone="gold" active={filter === 'demande'} onPress={() => setFilter('demande')} />
          <Chip label="Informations" tone="sky" active={filter === 'information'} onPress={() => setFilter('information')} />
          <Chip label="Autres" tone="sage" active={filter === 'autre'} onPress={() => setFilter('autre')} />
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Vous n'avez encore publié aucun échange.</Text>
          </View>
        ) : (
          filtered.map((x) => <ExchangeCard key={x.id} exchange={x} />)
        )}
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
  empty: { paddingHorizontal: 20, paddingVertical: 24 },
  emptyText: { ...typography.small, color: colors.muted, textAlign: 'center' },
});
