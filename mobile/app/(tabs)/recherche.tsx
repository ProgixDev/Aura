import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Chip } from '@components/Chip';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { PractitionerCard } from '@components/PractitionerCard';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { practitionerRepo } from '@data/repos';
import { filterPractitioners } from '@utils/filterPractitioners';

const DISCIPLINE_SHORTCUTS = [
  { label: 'Reiki', tone: 'violet' as const },
  { label: 'Magnétisme', tone: 'sky' as const },
  { label: 'Soin énergétique', tone: 'sage' as const },
  { label: 'Hypnose', tone: 'gold' as const },
];

export default function Recherche() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [visioOnly, setVisioOnly] = useState(false);
  const { data: results = [] } = useQuery({
    queryKey: ['practitioners'],
    queryFn: practitionerRepo.list,
  });
  const filtered = useMemo(() => {
    const byQuery = filterPractitioners(results, query);
    return visioOnly ? byQuery.filter((p) => p.mode.toLowerCase().includes('visio')) : byQuery;
  }, [results, query, visioOnly]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
          <Text style={styles.h1}>
            Trouver un <Text style={styles.italic}>praticien</Text>
          </Text>
          <Input
            leftIcon={<Icon name="search" size={18} color={colors.muted} />}
            value={query}
            onChangeText={setQuery}
            placeholder="Discipline, nom, ville…"
            containerStyle={{ marginTop: 14, marginBottom: 0 }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 12, paddingBottom: 6 }}
        >
          <Chip
            label="Visio"
            leftIcon={<Icon name="video" size={14} color={visioOnly ? '#fff' : colors.ink} />}
            active={visioOnly}
            onPress={() => setVisioOnly((v) => !v)}
          />
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {DISCIPLINE_SHORTCUTS.map((d) => (
            <Chip
              key={d.label}
              label={d.label}
              tone={d.tone}
              active={query.toLowerCase() === d.label.toLowerCase()}
              onPress={() => setQuery((q) => (q.toLowerCase() === d.label.toLowerCase() ? '' : d.label))}
            />
          ))}
        </ScrollView>

        <View style={styles.metaRow}>
          <Text style={typography.eyebrow}>
            {filtered.length} PRATICIENS TROUVÉS
          </Text>
          <Text style={styles.sort}>
            Trier : <Text style={styles.sortBold}>Pertinence</Text>
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {filtered.map((p) => (
            <PractitionerCard key={p.id} practitioner={p} />
          ))}
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sort: { ...typography.small, fontSize: 12 },
  sortBold: { color: colors.ink, fontFamily: 'Outfit_500Medium' },
});
