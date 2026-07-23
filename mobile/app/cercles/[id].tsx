import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/Button';
import { Grain } from '@components/Grain';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { cercleRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';
import { useSession } from '@store/session';

export default function CercleDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isClient = useSession((s) => s.userType) === 'client';
  const [joining, setJoining] = useState(false);
  const { data: c } = useQuery({
    queryKey: ['cercle', id],
    queryFn: () => cercleRepo.byId(String(id)),
  });
  const { data: myInscription } = useQuery({
    queryKey: ['cercleInscription', id],
    queryFn: () => cercleRepo.myInscription(String(id)),
    enabled: isClient,
  });
  const isJoined = !!myInscription;

  if (!c) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const accent = c.color ?? colors.violet;
  const gradient = [accent, colors.ink] as const;

  const join = async () => {
    if (joining || isJoined) return;
    setJoining(true);
    try {
      await cercleRepo.register(String(id));
      await queryClient.invalidateQueries({ queryKey: ['cercleInscription', id] });
      Alert.alert('Vous avez rejoint le cercle', `Bienvenue dans « ${c.nom} ».`);
    } catch (err) {
      Alert.alert('Inscription impossible', errorMessage(err, 'Réessayez dans un instant.'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView contentContainerStyle={{ paddingBottom: isClient ? 140 : 48 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top }]}>
          <Grain opacity={0.18} />
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <Pressable style={styles.iconCircle} onPress={() => router.back()}>
              <Icon name="back" size={20} color={colors.ink} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.iconCircle}>
                <Icon name="heart" size={18} color={colors.ink} />
              </Pressable>
              <Pressable style={styles.iconCircle}>
                <Icon name="share" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.title}>{c.nom}</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 24 }}>
          {c.description ? <Text style={styles.p}>{c.description}</Text> : null}

          <View style={[styles.aboutCard, shadows.card]}>
            <Text style={styles.eyebrow}>À PROPOS</Text>
            {c.animateur ? (
              <View style={styles.row}>
                <Text style={styles.label}>Animation</Text>
                <Text style={styles.value}>{c.animateur}</Text>
              </View>
            ) : null}
            <View style={styles.row}>
              <Text style={styles.label}>Tarif</Text>
              <Text style={styles.value}>{c.prix > 0 ? `${c.prix}€ / mois` : 'Gratuit'}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {isClient && (
        <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dockL}>Participation</Text>
            <Text style={styles.dockV}>{c.prix > 0 ? `${c.prix}€ / mois` : 'Gratuit'}</Text>
          </View>
          <Button
            label={joining ? 'Un instant…' : isJoined ? '✓ Membre' : 'Rejoindre'}
            fullWidth={false}
            onPress={join}
            disabled={joining || isJoined}
            style={{ flex: 1.2 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, position: 'relative', padding: 24, justifyContent: 'flex-end' },
  heroActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFoot: { gap: 12 },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 34,
    color: '#fff',
    lineHeight: 36,
  },
  p: { ...typography.body, lineHeight: 25, marginBottom: 20, fontSize: 14.5 },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },
  eyebrow: { ...typography.eyebrow, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { ...typography.small, fontSize: 13 },
  value: { ...typography.bodyMedium, fontSize: 13 },

  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dockL: { ...typography.tiny, fontSize: 11 },
  dockV: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 22, color: colors.ink },
});
