import React from 'react';
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
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { Toggle } from '@components/Toggle';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';
import { praticienMessageRepo, subscriptionRepo } from '@data/repos';
import { effectivePlan } from '@utils/subscriptionPlan';
import type { Subscription } from '@data/types';

const PLAN_LABEL: Record<'essentiel' | 'pro' | 'premium', string> = {
  essentiel: 'Essentiel',
  pro: 'Pro',
  premium: 'Premium',
};

function subscriptionSubtitle(sub?: Subscription): string {
  if (!sub) return 'Chargement…';
  const plan = effectivePlan(sub);
  if (plan === 'essentiel') return "Formule gratuite · jusqu'à 5 séances/mois";
  const price = plan === 'pro' ? '29€/mois' : '59€/mois';
  if (sub.statut === 'past_due') return `${price} · paiement en échec, vérifiez votre moyen de paiement`;
  return `${price} · annulable à tout moment`;
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const active = useSession((s) => s.practitionerActive);
  const toggle = useSession((s) => s.togglePractitionerActive);
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionRepo.current,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['praticien-conversations'],
    queryFn: praticienMessageRepo.conversations,
  });
  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader
        title="Mon espace praticien"
        rightAction={<Icon name="bell" size={20} color={colors.ink} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <AuroraBackground variant="soft" rounded={22} style={styles.trial}>
            <Text style={styles.trialEyebrow}>MON ABONNEMENT</Text>
            <Text style={styles.trialTitle}>
              {PLAN_LABEL[subscription ? effectivePlan(subscription) : 'essentiel']}
            </Text>
            <Text style={styles.trialSub}>{subscriptionSubtitle(subscription)}</Text>
            <Pressable
              onPress={() => router.push('/subscription' as any)}
              style={styles.trialBtn}
            >
              <Text style={styles.trialBtnTxt}>Gérer mon abonnement →</Text>
            </Pressable>
          </AuroraBackground>
        </View>

        <View style={styles.statsRow}>
          <Stat v="4" l="à venir" />
          <Stat v="12" l="ce mois" />
          <Stat v="4.9" l="note moy." />
        </View>

        <View style={styles.activeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeTitle}>Profil actif</Text>
            <Text style={styles.activeSub}>
              Vous apparaissez dans les recherches
            </Text>
          </View>
          <Toggle value={active} onValueChange={toggle} />
        </View>

        <View style={styles.pauseBox}>
          <View style={styles.pauseIc}>
            <Text style={{ fontSize: 16 }}>🌙</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pauseTitle}>Besoin de souffler ?</Text>
            <Text style={styles.pauseBody}>
              Mettez votre profil en pause sans perdre vos avis ni votre abonnement.
            </Text>
            <Pressable>
              <Text style={styles.pauseCta}>Mettre en pause →</Text>
            </Pressable>
          </View>
        </View>

        <Row
          icon={<Icon name="cal" size={20} color={colors.ink} />}
          title="Mes prochaines séances"
          sub="4 réservations à confirmer"
        />
        <Row
          icon={<Icon name="inperson" size={20} color={colors.ink} />}
          title="Ma fiche praticien"
          sub="Bio, photos, disciplines, tarifs"
        />
        <Row
          icon={<Icon name="star" size={20} color={colors.ink} />}
          title="Mon niveau & mes tarifs"
          sub="Expert · 75–95€/séance"
        />
        <Row
          icon={<Icon name="cal" size={20} color={colors.ink} />}
          title="Mes événements"
          sub="2 publiés · Retraite équinoxe"
        />
        <Row
          icon={<Icon name="exchange" size={20} color={colors.ink} />}
          title="Mes échanges"
          sub="1 en cours"
          onPress={() => router.push('/exchange' as any)}
        />
        <Row
          icon={<Icon name="message" size={20} color={colors.ink} />}
          title="Mes messages"
          sub={unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : 'Aucun nouveau message'}
          onPress={() => router.push('/praticien-messages' as any)}
        />
        <Row
          icon={<Icon name="card" size={20} color={colors.ink} />}
          title="Revenus & virements"
          sub="1 247 € ce mois"
        />
        <Row icon={<Icon name="shield" size={20} color={colors.ink} />} title="Charte de bienveillance" />
      </ScrollView>
    </View>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statV}>{v}</Text>
      <Text style={styles.statL}>{l.toUpperCase()}</Text>
    </View>
  );
}

function Row({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIc}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowT}>{title}</Text>
        {sub ? <Text style={styles.rowS}>{sub}</Text> : null}
      </View>
      <Icon name="chevron" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trial: { padding: 18 },
  trialEyebrow: {
    color: '#fff',
    fontSize: 11,
    letterSpacing: 1.8,
    fontFamily: 'Outfit_500Medium',
    opacity: 0.9,
    marginBottom: 4,
  },
  trialTitle: {
    color: '#fff',
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 24,
    marginBottom: 2,
  },
  trialSub: { color: '#fff', fontSize: 12, opacity: 0.85 },
  trialBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  trialBtnTxt: { color: '#fff', fontSize: 13, fontFamily: 'Outfit_500Medium' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 18 },
  stat: {
    flex: 1,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statV: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 26, lineHeight: 28 },
  statL: { ...typography.tiny, fontSize: 10, letterSpacing: 0.5, marginTop: 4 },

  activeRow: {
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 17 },
  activeSub: { ...typography.small, fontSize: 12 },

  pauseBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#F4ECD9',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
  },
  pauseIc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseTitle: { fontFamily: 'Outfit_500Medium', color: '#5D4F2E', fontSize: 13, marginBottom: 2 },
  pauseBody: { color: '#8A6A36', fontSize: 12, lineHeight: 17 },
  pauseCta: { color: '#5D4F2E', fontFamily: 'Outfit_500Medium', fontSize: 13, marginTop: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIc: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowT: { fontFamily: 'Outfit_500Medium', fontSize: 14, marginBottom: 1 },
  rowS: { ...typography.tiny, fontSize: 12 },
});
