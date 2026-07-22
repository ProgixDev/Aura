import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { AuroraBackground } from '@components/AuroraBackground';
import { Button } from '@components/Button';
import { Icon } from '@components/Icon';
import { Lotus } from '@components/Lotus';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { subscriptionRepo } from '@data/repos';
import { errorMessage } from '@data/api/client';
import { PLANS, type PlanDef } from '@data/plans';
import { effectivePlan } from '@utils/subscriptionPlan';
import type { Subscription, SubscriptionPlan } from '@data/types';

const RETURN_URL = 'guerienergies://subscription';

export default function Subscription() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionRepo.current,
  });
  const [busyPlan, setBusyPlan] = React.useState<string | null>(null);

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['subscription'] });

  const choose = async (plan: 'pro' | 'premium') => {
    setBusyPlan(plan);
    try {
      const { url } = await subscriptionRepo.checkout(plan);
      await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
      await refetch();
    } catch (err) {
      Alert.alert('Impossible de démarrer le paiement', errorMessage(err));
    } finally {
      setBusyPlan(null);
    }
  };

  const cancel = async () => {
    setBusyPlan('cancel');
    try {
      const updated = await subscriptionRepo.cancel();
      queryClient.setQueryData(['subscription'], updated);
      Alert.alert(
        'Résiliation programmée',
        updated.current_period_end
          ? `Votre abonnement reste actif jusqu'au ${new Date(updated.current_period_end).toLocaleDateString('fr-FR')}, puis passera automatiquement en formule Essentiel.`
          : "Votre abonnement passera en formule Essentiel à la fin de la période en cours.",
      );
    } catch (err) {
      Alert.alert('Impossible de résilier', errorMessage(err));
    } finally {
      setBusyPlan(null);
    }
  };

  const current: SubscriptionPlan = sub ? effectivePlan(sub) : 'essentiel';

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.backWrap, { top: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="back" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <AuroraBackground variant="soft" style={[styles.hero, { paddingTop: insets.top + 60 }]}>
          <Lotus size={64} color="#fff" />
          <Text style={styles.heroTitle}>
            Faire entendre{'\n'}
            votre <Text style={styles.italic}>pratique.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Une visibilité juste, des outils simples, et une communauté qui vous reconnaît.
          </Text>
        </AuroraBackground>

        {isLoading || !sub ? (
          <Text style={styles.loading}>Chargement de votre abonnement…</Text>
        ) : (
          <View style={styles.cards}>
            {PLANS.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={current === p.id}
                busy={busyPlan === p.id || (p.id !== 'essentiel' && current === p.id && busyPlan === 'cancel')}
                statut={sub.statut}
                onChoose={() => choose(p.id as 'pro' | 'premium')}
                onCancel={cancel}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PlanCard({
  plan,
  isCurrent,
  busy,
  statut,
  onChoose,
  onCancel,
}: {
  plan: PlanDef;
  isCurrent: boolean;
  busy: boolean;
  statut: Subscription['statut'];
  onChoose: () => void;
  onCancel: () => void;
}) {
  const showCancel = isCurrent && plan.id !== 'essentiel' && statut !== 'canceled';
  const showChoose = !isCurrent && plan.id !== 'essentiel';

  return (
    <View style={[styles.card, shadows.cardHover, isCurrent && styles.cardCurrent]}>
      {isCurrent ? (
        <View style={[styles.offerPill, styles.currentPill]}>
          <Text style={styles.offerPillTxt}>VOTRE FORMULE</Text>
        </View>
      ) : plan.highlight ? (
        <View style={styles.offerPill}>
          <Text style={styles.offerPillTxt}>LE PLUS CHOISI</Text>
        </View>
      ) : null}

      <View style={styles.priceBlock}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.price}>
          {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
          {plan.price > 0 ? <Text style={styles.italic}> {plan.period}</Text> : null}
        </Text>
        <Text style={styles.tagline}>{plan.tagline}</Text>
        {isCurrent && statut === 'past_due' ? (
          <Text style={styles.pastDueNotice}>Paiement en échec — vérifiez votre moyen de paiement</Text>
        ) : null}
      </View>

      {plan.features.map((f) => (
        <View key={f} style={styles.featRow}>
          <View style={styles.featIc}>
            <Icon name="check" size={14} color={colors.chipSageText} />
          </View>
          <Text style={styles.featTxt}>{f}</Text>
        </View>
      ))}

      {showCancel ? (
        <Pressable onPress={onCancel} disabled={busy} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnTxt}>{busy ? 'Résiliation…' : 'Résilier cette formule →'}</Text>
        </Pressable>
      ) : showChoose ? (
        <Button
          variant="aurora"
          label={busy ? 'Ouverture…' : plan.cta}
          onPress={onChoose}
          disabled={busy}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backWrap: { position: 'absolute', left: 16, zIndex: 10 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 34,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
    lineHeight: 36,
  },
  italic: { fontFamily: 'CormorantGaramond_400Regular_Italic' },
  heroSub: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 280,
  },

  loading: { ...typography.small, textAlign: 'center', marginTop: 24 },
  cards: { paddingHorizontal: 16, marginTop: -30, gap: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
  },
  cardCurrent: {
    borderWidth: 2,
    borderColor: colors.gold,
  },
  offerPill: {
    alignSelf: 'center',
    backgroundColor: colors.chipSage,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  currentPill: { backgroundColor: colors.gold },
  offerPillTxt: {
    color: colors.chipSageText,
    fontSize: 11,
    fontFamily: 'Outfit_500Medium',
    letterSpacing: 1.6,
  },
  priceBlock: { alignItems: 'center', paddingVertical: 10 },
  planName: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 20,
    color: colors.ink,
    marginBottom: 4,
  },
  price: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 38,
    lineHeight: 42,
    color: colors.ink,
    textAlign: 'center',
  },
  tagline: { ...typography.small, fontSize: 13, marginTop: 6, textAlign: 'center' },
  pastDueNotice: {
    ...typography.small,
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },

  featRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  featIc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.chipSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTxt: { flex: 1, ...typography.small, fontSize: 13.5, lineHeight: 20, color: colors.inkSoft },

  cancelBtn: { marginTop: 16, alignSelf: 'center' },
  cancelBtnTxt: { color: colors.muted, fontFamily: 'Outfit_500Medium', fontSize: 13 },
});
