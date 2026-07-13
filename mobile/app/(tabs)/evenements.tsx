import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { EventCard } from '@components/EventCard';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { eventRepo } from '@data/repos';

type Filter = 'soon' | 'retraites' | 'cercles' | 'formations' | 'ateliers';

export default function Evenements() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('soon');

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Text style={styles.h1}>
            Événements <Text style={styles.italic}>& retraites</Text>
          </Text>
          <Text style={styles.sub}>
            Vivre ensemble ce qu'on ne peut pas vivre seul.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          <Chip label="À venir" active={filter === 'soon'} onPress={() => setFilter('soon')} />
          <Chip label="Retraites" active={filter === 'retraites'} onPress={() => setFilter('retraites')} />
          <Chip label="Cercles" active={filter === 'cercles'} onPress={() => setFilter('cercles')} />
          <Chip label="Formations" active={filter === 'formations'} onPress={() => setFilter('formations')} />
          <Chip label="Ateliers" active={filter === 'ateliers'} onPress={() => setFilter('ateliers')} />
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 8, marginBottom: 16 }}
        >
          <Chip label="Mars–Avril" leftIcon={<Icon name="cal" size={14} color={colors.ink} />} />
          <Chip label="Toute la France" leftIcon={<Icon name="pin" size={14} color={colors.ink} />} />
          <Chip label="Prix" />
        </ScrollView>

        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}

        <View style={styles.notifyCard}>
          <View style={styles.notifyIc}>
            <Icon name="bell" size={20} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifyTitle}>Soyez prévenu·e</Text>
            <Text style={styles.notifyBody}>
              des prochaines retraites près de chez vous.
            </Text>
          </View>
          <Button label="Activer" size="sm" fullWidth={false} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { ...typography.h1, marginBottom: 4 },
  italic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  sub: { ...typography.small },
  notifyCard: {
    marginHorizontal: 20,
    marginTop: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#E6E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  notifyIc: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyTitle: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 17,
  },
  notifyBody: { ...typography.small, fontSize: 12, marginTop: 2 },
});
