import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Lotus } from '@components/Lotus';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { useBooking } from '@store/booking';
import { rendezVousRepo } from '@data/repos';

export default function Confirmation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const draft = useBooking((s) => s.draft);
  const clear = useBooking((s) => s.clearDraft);

  const { data: rdv } = useQuery({
    queryKey: ['rendezVous', id],
    queryFn: () => rendezVousRepo.byId(Number(id)),
    enabled: !!id,
  });

  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [breath]);
  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const firstName = rdv?.praticien?.firstname ?? '';
  const praticienName = rdv?.praticien ? `${rdv.praticien.firstname} ${rdv.praticien.lastname}` : '…';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 32 }]}>
      <View style={styles.body}>
        <Animated.View style={[styles.orb, shadows.glow, { transform: [{ scale }] }]}>
          <AuroraBackground variant="soft" style={StyleSheet.absoluteFillObject}>
            <></>
          </AuroraBackground>
          <Lotus size={64} color="#fff" />
        </Animated.View>
        <Text style={styles.title}>
          Votre séance est{'\n'}
          <Text style={styles.italic}>réservée.</Text>
        </Text>
        <Text style={styles.subtitle}>
          {firstName ? `${firstName} a été prévenu(e).` : 'La praticienne a été prévenue.'} Vous recevrez un rappel doux la veille.
        </Text>

        <Card style={styles.detail}>
          <Row label="Praticien" value={praticienName} />
          <Row
            label="Pratique"
            value={`${rdv?.praticien?.specialite ?? '—'} · ${rdv?.duree_minutes ?? 60} min`}
          />
          <Row label="Date" value={draft?.day ? `${draft.day.label} · ${draft.slot}` : '—'} />
          <Row
            label="Mode"
            value={`${rdv?.mode === 'visio' ? 'En visio' : 'En présentiel'}${rdv?.praticien?.ville ? ` · ${rdv.praticien.ville}` : ''}`}
          />
          <Row label="Total payé" value={`${(rdv?.tarif ?? 0).toFixed(2)} €`} />
          <View style={styles.refRow}>
            <Text style={styles.refL}>Réf.</Text>
            <Text style={styles.refV}>RDV-{rdv?.id ?? id}</Text>
          </View>
        </Card>

        <Button
          label={firstName ? `Envoyer un message à ${firstName}` : 'Envoyer un message'}
          onPress={() => {
            clear();
            router.replace('/chat/m1' as any);
          }}
        />
        <Pressable onPress={() => { clear(); router.replace('/(tabs)' as any); }}>
          <Text style={styles.back}>Retour à l'accueil</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowL}>{label}</Text>
      <Text style={styles.rowV}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pearl, padding: 24 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', maxWidth: 360 },
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 38,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  italic: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    color: colors.violet2,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  detail: { width: '100%', padding: 18, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowL: { ...typography.small, fontSize: 13 },
  rowV: { ...typography.bodyMedium, fontSize: 13 },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 8,
    paddingTop: 14,
  },
  refL: { ...typography.small, fontSize: 13 },
  refV: { color: colors.violet2, fontFamily: 'Outfit_500Medium', fontSize: 13 },
  back: { ...typography.small, color: colors.muted, marginTop: 14 },
});
