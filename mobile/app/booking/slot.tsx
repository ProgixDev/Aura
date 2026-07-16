import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Button } from '@components/Button';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { practitionerRepo } from '@data/repos';
import { useBooking } from '@store/booking';

// Parsed as local midnight (no 'Z' suffix) so the tile's day-of-month never
// shifts by a day under a negative UTC offset — same approach as
// web/app/(site)/reserver/[id]/BookingFlow.jsx's dayMeta().
function dayMeta(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '');
  return {
    dow: dow.charAt(0).toUpperCase() + dow.slice(1),
    dom: new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(d),
    full: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d),
  };
}

export default function BookSlot() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const setDraft = useBooking((s) => s.setDraft);

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data: p } = useQuery({
    queryKey: ['practitioner', id],
    queryFn: () => practitionerRepo.byId(String(id)),
  });
  const { data: availability = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ['availability', id],
    queryFn: () => practitionerRepo.availability(String(id)),
  });

  const days = availability.map((d) => ({ ...d, ...dayMeta(d.date) }));
  const selectedDay = days[selectedDayIdx];

  // Availability loads async; once it does, land on the first day that
  // actually has a free slot instead of defaulting to a fully-booked one.
  useEffect(() => {
    if (days.length === 0) return;
    const firstOpen = days.findIndex((d) => d.slots.some((s) => s.available));
    setSelectedDayIdx(firstOpen >= 0 ? firstOpen : 0);
  }, [availability.length]);

  const proceed = () => {
    if (!selectedDay || !selectedSlot) return;
    setDraft({
      practitionerId: String(id),
      day: { label: selectedDay.full, date: selectedDay.date },
      slot: selectedSlot,
    });
    router.push('/booking/payment' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Réserver" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <View style={styles.pratStrip}>
            <Avatar
              source={p?.photo}
              gradient={p?.gradient ?? [colors.violet, colors.sky]}
              size="sm"
              rounded={false}
              style={{ borderRadius: 12 }}
            />
            <View>
              <Text style={styles.pratName}>{p?.name ?? 'Élodie Marceau'}</Text>
              <Text style={styles.pratMeta}>
                {p?.specialties[0] ?? 'Magnétisme'} · 75 min · {p?.price ?? 75}€
              </Text>
            </View>
          </View>

          <Text style={styles.section}>Choisir un jour</Text>
          {loadingAvailability ? (
            <Text style={styles.note}>Chargement des disponibilités…</Text>
          ) : days.length === 0 ? (
            <Text style={styles.note}>Aucun créneau disponible pour le moment.</Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calRow}
              >
                {days.map((d, i) => {
                  const active = selectedDayIdx === i;
                  const dayOff = d.slots.every((s) => !s.available);
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => { setSelectedDayIdx(i); setSelectedSlot(null); }}
                      style={[
                        styles.calDay,
                        active && styles.calDaySelected,
                        dayOff && { opacity: 0.35 },
                      ]}
                    >
                      <Text style={[styles.dName, active && { color: 'rgba(255,255,255,0.7)' }]}>{d.dow}</Text>
                      <Text style={[styles.dNum, active && { color: '#fff' }]}>{d.dom}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.section}>
                Créneaux disponibles · {selectedDay?.full}
              </Text>
              <View style={styles.slotsRow}>
                {selectedDay?.slots.map((s) => {
                  const active = selectedSlot === s.time;
                  return (
                    <Pressable
                      key={s.time}
                      disabled={!s.available}
                      onPress={() => setSelectedSlot(s.time)}
                      style={[
                        styles.slot,
                        active && styles.slotActive,
                        !s.available && styles.slotOff,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slotTxt,
                          active && { color: '#fff' },
                          !s.available && { textDecorationLine: 'line-through' },
                        ]}
                      >
                        {s.time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.dockMeta}>
          <Text style={styles.dockMetaLabel}>Créneau choisi</Text>
          <Text style={styles.dockMetaValue}>
            {selectedDay && selectedSlot ? `${selectedDay.dow} ${selectedDay.dom} · ${selectedSlot}` : 'Choisissez un créneau'}
          </Text>
        </View>
        <Button label="Continuer" onPress={proceed} disabled={!selectedDay || !selectedSlot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pratStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 24,
  },
  pratName: { ...typography.bodyMedium, fontSize: 14 },
  pratMeta: { ...typography.small, fontSize: 12 },

  section: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: colors.ink,
    marginBottom: 12,
  },
  note: { ...typography.small, marginBottom: 20 },
  calRow: { flexDirection: 'row', gap: 8, marginBottom: 24, paddingRight: 4 },
  calDay: {
    width: 56,
    height: 56,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDaySelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  dName: {
    ...typography.tiny,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dNum: {
    ...typography.serif,
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 18,
    marginTop: 2,
  },
  slotsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  slot: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  slotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotOff: { opacity: 0.4 },
  slotTxt: { ...typography.bodyMedium, fontSize: 14 },

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
  },
  dockMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dockMetaLabel: { ...typography.small, fontSize: 13 },
  dockMetaValue: { ...typography.bodyMedium, fontSize: 13 },
});
