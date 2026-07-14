import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenHeader } from '@components/ScreenHeader';
import { Toggle } from '@components/Toggle';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { notificationPreferencesRepo } from '@data/repos';
import type { NotificationPreferences } from '@data/types';

const FIELDS: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
  { key: 'rappels_seance', label: 'Rappels de séance', desc: 'Un rappel 24h et 1h avant chaque rendez-vous.' },
  { key: 'nouveaux_messages', label: 'Nouveaux messages', desc: "Soyez averti dès qu'un praticien vous répond." },
  { key: 'reponses_avis', label: 'Réponses à mes avis', desc: 'Quand un praticien réagit à votre retour.' },
  { key: 'newsletter', label: 'Newsletter AURA', desc: 'Inspirations, événements et nouveautés, une fois par mois.' },
];

const DEFAULTS: NotificationPreferences = {
  rappels_seance: true, nouveaux_messages: true, reponses_avis: false, newsletter: true,
};

export default function NotificationSettings() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: prefs = DEFAULTS } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationPreferencesRepo.get,
  });

  const toggle = async (key: keyof NotificationPreferences, value: boolean) => {
    queryClient.setQueryData(['notification-preferences'], { ...prefs, [key]: value });
    try {
      await notificationPreferencesRepo.update({ [key]: value });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <View style={styles.card}>
          {FIELDS.map((f, i) => (
            <View key={f.key}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.label}>{f.label}</Text>
                  <Text style={styles.desc}>{f.desc}</Text>
                </View>
                <Toggle value={!!prefs[f.key]} onValueChange={(v) => toggle(f.key, v)} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 8, borderRadius: 20, paddingHorizontal: 16 },
  divider: { height: 1, backgroundColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  label: { ...typography.bodyMedium, fontSize: 14.5, color: colors.ink },
  desc: { ...typography.tiny, fontSize: 12, marginTop: 2 },
});
