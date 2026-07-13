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
import { Chip } from '@components/Chip';
import { ExchangeCard } from '@components/ExchangeCard';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { exchangeRepo } from '@data/repos';

export default function ExchangeList() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: list = [] } = useQuery({
    queryKey: ['exchanges'],
    queryFn: exchangeRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader
        title="Échanges"
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
          <Text style={typography.eyebrow}>ÉCONOMIE DU DON</Text>
          <Text style={styles.h}>
            Donner, recevoir,{' '}
            <Text style={styles.italic}>circuler.</Text>
          </Text>
          <Text style={styles.sub}>
            Soin contre soin, formation contre formation, bénévolat dans un éco-village.
            L'argent n'est qu'un langage parmi d'autres.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 14 }}
        >
          <Chip label="Tous" active />
          <Chip label="Soin ↔ soin" tone="violet" />
          <Chip label="Service ↔ soin" tone="gold" />
          <Chip label="Formation" tone="sky" />
          <Chip label="Bénévolat" tone="sage" />
        </ScrollView>

        {list.map((x) => (
          <ExchangeCard key={x.id} exchange={x} />
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
