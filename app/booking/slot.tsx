import React, { useState } from 'react';
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
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { practitionerRepo } from '@data/repos';
import { useBooking } from '@store/booking';

const days = [
  { name: 'Mar.', d: 25, off: false },
  { name: 'Mer.', d: 26, off: false },
  { name: 'Jeu.', d: 27, off: true },
  { name: 'Ven.', d: 28, off: false },
  { name: 'Sam.', d: 29, off: false },
];

const slots = {
  matin: [
    { time: '9h00', off: true },
    { time: '10h30', off: false },
    { time: '11h45', off: false },
  ],
  aprem: [
    { time: '14h00', off: false },
    { time: '15h30', off: false },
    { time: '17h00', off: true },
  ],
  soir: [
    { time: '18h30', off: false },
    { time: '20h00', off: false },
    { time: '21h15', off: true },
  ],
};

export default function BookSlot() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const setDraft = useBooking((s) => s.setDraft);

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState('14h00');

  const { data: p } = useQuery({
    queryKey: ['practitioner', id],
    queryFn: () => practitionerRepo.byId(String(id)),
  });

  const proceed = () => {
    setDraft({
      practitionerId: String(id),
      day: {
        label: `${days[selectedDay].name} ${days[selectedDay].d} mars`,
        date: `2025-03-${days[selectedDay].d}`,
      },
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
          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>Mars 2025</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Pressable style={styles.monthBtn}>
                <Icon name="back" size={16} color={colors.ink} />
              </Pressable>
              <Pressable style={[styles.monthBtn, { transform: [{ rotate: '180deg' }] }]}>
                <Icon name="back" size={16} color={colors.ink} />
              </Pressable>
            </View>
          </View>
          <View style={styles.calRow}>
            {days.map((d, i) => {
              const active = selectedDay === i;
              return (
                <Pressable
                  key={i}
                  disabled={d.off}
                  onPress={() => setSelectedDay(i)}
                  style={[
                    styles.calDay,
                    active && styles.calDaySelected,
                    d.off && { opacity: 0.3 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dName,
                      active && { color: 'rgba(255,255,255,0.7)' },
                    ]}
                  >
                    {d.name}
                  </Text>
                  <Text
                    style={[styles.dNum, active && { color: '#fff' }]}
                  >
                    {d.d}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>
            Créneaux disponibles · {days[selectedDay].name} {days[selectedDay].d} mars
          </Text>

          {(['matin', 'aprem', 'soir'] as const).map((bucket) => (
            <View key={bucket} style={{ marginBottom: 14 }}>
              <Text style={styles.bucketLabel}>
                {bucket === 'matin' ? 'MATIN' : bucket === 'aprem' ? 'APRÈS-MIDI' : 'SOIRÉE'}
              </Text>
              <View style={styles.slotsRow}>
                {slots[bucket].map((s) => {
                  const active = selectedSlot === s.time;
                  return (
                    <Pressable
                      key={s.time}
                      disabled={s.off}
                      onPress={() => setSelectedSlot(s.time)}
                      style={[
                        styles.slot,
                        active && styles.slotActive,
                        s.off && styles.slotOff,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slotTxt,
                          active && { color: '#fff' },
                          s.off && { textDecorationLine: 'line-through' },
                        ]}
                      >
                        {s.time}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.dockMeta}>
          <Text style={styles.dockMetaLabel}>Créneau choisi</Text>
          <Text style={styles.dockMetaValue}>
            {days[selectedDay].name} {days[selectedDay].d} mars · {selectedSlot}
          </Text>
        </View>
        <Button label="Continuer" onPress={proceed} />
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
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthLabel: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18 },
  monthBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  calDay: {
    flex: 1,
    aspectRatio: 1,
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
  bucketLabel: {
    ...typography.eyebrow,
    fontSize: 11,
    marginBottom: 8,
  },
  slotsRow: { flexDirection: 'row', gap: 8 },
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
