import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { practitionerRepo, peerMessageRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';

export default function NewPeerConversation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['practitioners', 'directory'],
    queryFn: practitionerRepo.list,
  });

  const filtered = list.filter((p) =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const [error, setError] = useState<string | null>(null);
  const startMutation = useMutation({
    mutationFn: (peerId: number) => peerMessageRepo.startConversation(peerId),
    onSuccess: (conv) => router.replace(`/peer-messages/${conv.id}` as any),
    onError: (err: any) => setError(errorMessage(err)),
  });

  const start = (id: string) => {
    setStartingId(id);
    setError(null);
    startMutation.mutate(Number(id), { onSettled: () => setStartingId(null) });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Nouvelle conversation" backIcon="close" />
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <Input
          leftIcon={<Icon name="search" size={18} color={colors.muted} />}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un praticien par nom…"
          containerStyle={{ marginBottom: 0 }}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={styles.empty}>Chargement…</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>Aucun praticien trouvé.</Text>
        ) : (
          filtered.map((p) => (
            <Pressable
              key={p.id}
              style={styles.row}
              disabled={startingId === p.id}
              onPress={() => start(p.id)}
            >
              <Avatar source={p.photo} gradient={p.gradient} size="md" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {p.specialties.join(', ')}{p.city ? ` · ${p.city}` : ''}
                </Text>
              </View>
              {startingId === p.id ? (
                <Text style={styles.loading}>…</Text>
              ) : (
                <Icon name="chevron" size={18} color={colors.muted} />
              )}
            </Pressable>
          ))
        )}
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
    paddingVertical: 12,
  },
  name: { ...typography.bodyMedium, fontSize: 15 },
  meta: { ...typography.small, fontSize: 12 },
  loading: { ...typography.small, color: colors.muted },
  empty: { ...typography.small, textAlign: 'center', marginTop: 40, color: colors.muted },
  error: {
    ...typography.tiny,
    color: colors.danger,
    marginTop: 8,
  },
});
