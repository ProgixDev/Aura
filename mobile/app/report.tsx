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
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

const reasons = [
  {
    key: 'overclaim',
    title: 'Promesses de guérison exagérées',
    detail: 'Diagnostic, traitement médical implicite',
  },
  {
    key: 'behavior',
    title: 'Comportement non-professionnel',
    detail: "Pendant ou après une séance",
  },
  { key: 'fake', title: 'Faux avis ou témoignage trompeur' },
  { key: 'pros', title: 'Discours dérangeant ou prosélytisme' },
  { key: 'other', title: 'Autre' },
];

export default function Report() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState('overclaim');
  const [note, setNote] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Signaler" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 32 }}
      >
        <Text style={styles.h}>Qu'avez-vous remarqué ?</Text>
        <Text style={styles.lead}>
          Aura est une communauté de soin. Toute signalisation est lue par un humain
          sous 24h. Votre identité reste confidentielle.
        </Text>

        <View style={{ gap: 8, marginBottom: 18 }}>
          {reasons.map((r) => {
            const active = picked === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setPicked(r.key)}
                style={[styles.opt, active && styles.optActive]}
              >
                <View style={[styles.check, active && styles.checkActive]}>
                  {active ? <Icon name="check" size={11} color="#fff" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optTitle}>{r.title}</Text>
                  {r.detail ? <Text style={styles.optDetail}>{r.detail}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Préciser (facultatif)"
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Vos mots restent confidentiels…"
        />

        <Button label="Envoyer le signalement" onPress={() => router.back()} />
        <Text style={styles.help}>
          En cas d'urgence, contactez le 17 ou le 3919.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 24,
    color: colors.ink,
    marginBottom: 8,
  },
  lead: { ...typography.small, fontSize: 14, lineHeight: 21, marginBottom: 22 },

  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optActive: { borderColor: colors.violet2, backgroundColor: '#FBF7FF' },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D8D2C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  optTitle: { ...typography.bodyMedium, fontSize: 14 },
  optDetail: { ...typography.tiny, fontSize: 12, marginTop: 2 },

  help: { ...typography.tiny, textAlign: 'center', marginTop: 14 },
});
