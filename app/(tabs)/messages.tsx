import React, { useState } from 'react';
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
import { Avatar } from '@components/Avatar';
import { Chip } from '@components/Chip';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { messageRepo } from '@data/repos';

export default function Messages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'pra' | 'circles'>('all');
  const [search, setSearch] = useState('');

  const { data: list = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: messageRepo.conversations,
  });

  const filtered = list.filter((c) => {
    if (filter === 'unread' && !c.unread) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.h1}>Messages</Text>
          <Pressable style={styles.plusBtn}>
            <Icon name="plus" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Input
            leftIcon={<Icon name="search" size={18} color={colors.muted} />}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher dans les messages…"
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
          <Chip label="Praticiens" active={filter === 'pra'} onPress={() => setFilter('pra')} />
          <Chip label="Cercles" active={filter === 'circles'} onPress={() => setFilter('circles')} />
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          {filtered.map((c) => (
            <Pressable
              key={c.id}
              style={styles.row}
              onPress={() => router.push(`/chat/${c.id}` as any)}
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
          ))}
        </View>

        <View style={styles.safetyCard}>
          <View style={styles.safetyIc}>
            <Icon name="shield" size={18} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyTitle}>Avant la séance</Text>
            <Text style={styles.safetyBody}>
              Posez vos questions ici. Les paiements ne se font jamais en privé.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  h1: { ...typography.h1 },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  safetyCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EFE6F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  safetyIc: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyTitle: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 16,
  },
  safetyBody: { ...typography.tiny, fontSize: 12, lineHeight: 17 },
});
