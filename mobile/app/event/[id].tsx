import React, { useState } from 'react';
import {
  Alert,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Badge } from '@components/Badge';
import { Button } from '@components/Button';
import { Grain } from '@components/Grain';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { eventRepo } from '@data/repos';

// No event booking/registration backend exists yet (see event-adapter's own
// comment) — mirrors web/app/(site)/evenement/[id]/page.jsx's "Réserver"
// button exactly: a lightweight interest form with no real API call behind
// it, not a fake payment flow pretending to charge a card.
function PreRegisterModal({ visible, eventTitle, onClose }: { visible: boolean; eventTitle: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [places, setPlaces] = useState('1');

  const submit = () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Champs requis', 'Merci de renseigner votre nom et votre email.');
      return;
    }
    onClose();
    setName(''); setEmail(''); setPlaces('1');
    Alert.alert('Demande envoyée', 'Vous recevrez une confirmation par email.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Pré-inscription — {eventTitle}</Text>
          <Input label="Votre nom" value={name} onChangeText={setName} />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Input label="Nombre de places" value={places} onChangeText={setPlaces} keyboardType="number-pad" />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Button label="Annuler" variant="soft" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Envoyer" onPress={submit} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,12,35,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, marginBottom: 16 },
});

export default function EventDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [preRegisterOpen, setPreRegisterOpen] = useState(false);
  const { data: e } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventRepo.byId(String(id)),
  });

  if (!e) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const Hero: React.ComponentType<any> = e.image ? ImageBackground : LinearGradient;
  const heroProps = e.image
    ? { source: { uri: e.image } }
    : { colors: e.gradient as any, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <Hero {...(heroProps as any)} style={styles.hero}>
          {e.image && (
            <LinearGradient
              colors={['rgba(20,12,35,0.2)', 'rgba(10,6,20,0.6)']}
              style={StyleSheet.absoluteFillObject}
            />
          )}
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
            <Badge label={e.kind.split('·')[0].trim().toUpperCase()} variant="featured" />
            <Text style={styles.title}>
              {e.title.split('—')[0]}
              {'\n'}
              <Text style={styles.italic}>{e.title.split('—')[1] ?? ''}</Text>
            </Text>
          </View>
        </Hero>

        <View style={styles.metaRow}>
          <MetaItem icon="cal" value={e.meta?.dates ?? e.when} />
          <MetaItem icon="pin" value={e.meta?.place ?? e.where} />
          <MetaItem icon="inperson" value={`${e.meta?.seats ?? 12} places`} />
        </View>

        <View style={{ padding: 24 }}>
          {e.description?.split('\n\n').map((para, i) => (
            <Text key={i} style={styles.p}>
              {para}
            </Text>
          ))}

          {e.program ? (
            <>
              <Text style={styles.eyebrow}>PROGRAMME</Text>
              {e.program.map((s) => (
                <View key={s.time} style={styles.programStep}>
                  <Text style={styles.programTime}>{s.time}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programTitle}>{s.title}</Text>
                    {s.detail ? <Text style={styles.programDetail}>{s.detail}</Text> : null}
                  </View>
                </View>
              ))}
            </>
          ) : null}

          {e.hosts ? (
            <>
              <Text style={[styles.eyebrow, { marginTop: 24 }]}>AVEC</Text>
              <View style={styles.hostsRow}>
                {e.hosts.map((h) => (
                  <View key={h.name} style={[styles.hostCard, shadows.card]}>
                    <Avatar gradient={h.gradient} size="md" />
                    <Text style={styles.hostName}>{h.name}</Text>
                    <Text style={styles.hostSpec}>{h.spec}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dockL}>À partir de</Text>
          <Text style={styles.dockV}>
            {e.priceFrom}€<Text style={styles.dockVSmall}> tout compris</Text>
          </Text>
        </View>
        <Button
          label="Pré-inscription"
          fullWidth={false}
          onPress={() => setPreRegisterOpen(true)}
          style={{ flex: 1.2 }}
        />
      </View>

      <PreRegisterModal
        visible={preRegisterOpen}
        eventTitle={e.title}
        onClose={() => setPreRegisterOpen(false)}
      />
    </View>
  );
}

function MetaItem({ icon, value }: { icon: 'cal' | 'pin' | 'inperson'; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon name={icon} size={14} color={colors.muted} />
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 320, position: 'relative', padding: 24, justifyContent: 'flex-end' },
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
  italic: { fontFamily: 'CormorantGaramond_400Regular_Italic' },

  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaValue: { fontFamily: 'Outfit_500Medium', fontSize: 13, color: colors.ink },

  p: { ...typography.body, lineHeight: 25, marginBottom: 14, fontSize: 14.5 },
  eyebrow: { ...typography.eyebrow, marginVertical: 12 },

  programStep: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  programTime: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 18,
    color: colors.violet2,
    width: 60,
  },
  programTitle: { ...typography.bodyMedium, fontSize: 14 },
  programDetail: { ...typography.tiny, fontSize: 12, marginTop: 2 },

  hostsRow: { flexDirection: 'row', gap: 10 },
  hostCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    padding: 12,
    gap: 6,
  },
  hostName: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 15 },
  hostSpec: { ...typography.tiny, fontSize: 11 },

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
  dockVSmall: { ...typography.small, fontSize: 12 },
});
