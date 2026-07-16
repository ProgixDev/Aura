import React from 'react';
import {
  Alert,
  Linking,
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
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { praticienMessageRepo, praticienProfileRepo, subscriptionRepo, stripeConnectRepo } from '@data/repos';
import { effectivePlan } from '@utils/subscriptionPlan';
import { errorMessage } from '@data/api/client';
import type { Subscription } from '@data/types';

const PLAN_LABEL: Record<'essentiel' | 'pro' | 'premium', string> = {
  essentiel: 'Essentiel',
  pro: 'Pro',
  premium: 'Premium',
};

const VERIF_LABEL: Record<string, string> = {
  en_attente: 'Votre profil est en attente de vérification par notre équipe.',
  en_cours: 'Votre profil est en cours de vérification.',
  rejete: 'Votre profil a été rejeté.',
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
  const { data: profile } = useQuery({
    queryKey: ['praticien-profile'],
    queryFn: praticienProfileRepo.me,
  });
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionRepo.current,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['praticien-conversations'],
    queryFn: praticienMessageRepo.conversations,
  });
  const unreadCount = conversations.filter((c) => c.unread).length;

  const verifMessage = profile ? VERIF_LABEL[profile.statut_verification] : undefined;

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
        {verifMessage && (
          <View style={[styles.verifBanner, profile?.statut_verification === 'rejete' && styles.verifBannerDanger]}>
            <Icon name={profile?.statut_verification === 'rejete' ? 'close' : 'shield'} size={16} color={profile?.statut_verification === 'rejete' ? colors.danger : colors.ink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifTxt, profile?.statut_verification === 'rejete' && { color: colors.danger }]}>{verifMessage}</Text>
              {profile?.motif_rejet && <Text style={styles.verifMotif}>{profile.motif_rejet}</Text>}
            </View>
          </View>
        )}

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
          <Stat v={profile ? `${profile.documents_stats.valide}/${profile.documents_stats.total}` : '—'} l="documents validés" />
        </View>

        <PaiementsSection />

        <Row
          icon={<Icon name="exchange" size={20} color={colors.ink} />}
          title="Mes échanges"
          onPress={() => router.push('/exchange' as any)}
        />
        <Row
          icon={<Icon name="message" size={20} color={colors.ink} />}
          title="Mes messages"
          sub={unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : 'Aucun nouveau message'}
          onPress={() => router.push('/praticien-messages' as any)}
        />
      </ScrollView>
    </View>
  );
}

function PaiementsSection() {
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['stripeConnectStatus'],
    queryFn: stripeConnectRepo.status,
  });
  const [submitting, setSubmitting] = React.useState(false);

  const onboard = async () => {
    setSubmitting(true);
    try {
      const { url } = await stripeConnectRepo.onboard();
      await Linking.openURL(url);
      refetch();
    } catch (err) {
      Alert.alert('Impossible de démarrer', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const payoutsEnabled = status?.stripe_payouts_enabled ?? false;
  const hasAccount = Boolean(status?.stripe_account_id);

  return (
    <View style={styles.paiementsBox}>
      <View style={styles.paiementsHead}>
        <Icon name="card" size={20} color={colors.ink} />
        <Text style={styles.paiementsTitle}>Paiements</Text>
      </View>
      {isLoading ? (
        <Text style={styles.paiementsSub}>Chargement du statut…</Text>
      ) : payoutsEnabled ? (
        <>
          <Text style={styles.paiementsSubOk}>Versements activés</Text>
          <Text style={styles.paiementsSub}>
            Vos paiements sont reversés directement sur votre compte Stripe après chaque séance.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.paiementsSub}>
            {hasAccount
              ? 'Votre inscription Stripe est en cours — finalisez-la pour recevoir vos versements.'
              : 'Configurez vos versements pour être payée directement après chaque séance.'}
          </Text>
          <Pressable onPress={onboard} disabled={submitting} style={styles.paiementsCta}>
            <Text style={styles.paiementsCtaTxt}>
              {submitting ? 'Ouverture…' : hasAccount ? "Continuer l'inscription →" : 'Configurer mes versements →'}
            </Text>
          </Pressable>
        </>
      )}
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

  verifBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: colors.mist,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  verifBannerDanger: { backgroundColor: '#FBE9E7' },
  verifTxt: { ...typography.small, fontSize: 13, fontFamily: 'Outfit_500Medium', lineHeight: 18 },
  verifMotif: { ...typography.small, fontSize: 12, marginTop: 4, lineHeight: 17 },

  paiementsBox: {
    marginHorizontal: 20,
    marginBottom: 18,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  paiementsHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  paiementsTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 17 },
  paiementsSubOk: {
    ...typography.small,
    fontSize: 13,
    color: colors.success,
    marginBottom: 4,
    fontFamily: 'Outfit_500Medium',
  },
  paiementsSub: { ...typography.small, fontSize: 12, lineHeight: 17 },
  paiementsCta: { marginTop: 10, alignSelf: 'flex-start' },
  paiementsCtaTxt: { color: colors.ink, fontFamily: 'Outfit_500Medium', fontSize: 13 },

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
