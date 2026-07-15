import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Chip } from '@components/Chip';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { praticienMessageRepo } from '@data/repos';

export default function PraticienMessages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const { data: list = [] } = useQuery({
    queryKey: ['praticien-conversations'],
    queryFn: praticienMessageRepo.conversations,
  });

  const filtered = list.filter((c) => {
    if (filter === 'unread' && !c.unread) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Mes messages" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Input
            leftIcon={<Icon name="search" size={18} color={colors.muted} />}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un client…"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 14 }}
        >
          <Chip label="Tous" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Non lus" active={filter === 'unread'} onPress={() => setFilter('unread')} />
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Aucune conversation</Text>
              <Text style={styles.emptyBody}>
                Les clients qui vous contactent apparaîtront ici.
              </Text>
            </View>
          ) : (
            filtered.map((c) => (
              <Pressable
                key={c.id}
                style={styles.row}
                onPress={() => router.push(`/praticien-messages/${c.id}` as any)}
              >
                <Avatar source={c.photo} gradient={c.avatar} size="md" online={c.online} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text
                      style={[
                        styles.when,
                        c.unread && { color: colors.violet2, fontFamily: 'Outfit_500Medium' },
                      ]}
                    >
                      {c.when}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.preview,
                      c.unread && { color: colors.ink, fontFamily: 'Outfit_500Medium' },
                    ]}
                    numberOfLines={1}
                  >
                    {c.preview}
                  </Text>
                </View>
                {c.unread ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  name: { ...typography.bodyMedium, fontSize: 15 },
  when: { ...typography.tiny, fontSize: 11 },
  preview: { ...typography.small, fontSize: 13 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet2,
  },
  emptyWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 6 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18, color: colors.ink },
  emptyBody: { ...typography.small, fontSize: 13, textAlign: 'center' },
});
