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
import { Avatar } from '@components/Avatar';
import { AuroraBackground } from '@components/AuroraBackground';
import { Icon } from '@components/Icon';
import { Lotus } from '@components/Lotus';
import { MenuRow } from '@components/MenuRow';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { useSession } from '@store/session';
import { favoriteRepo, rendezVousRepo, exchangeRepo } from '@data/repos';

export default function Profil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const firstName = useSession((s) => s.firstName);
  const lastName = useSession((s) => s.lastName);
  const signOut = useSession((s) => s.signOut);

  const { data: favorites = [] } = useQuery({ queryKey: ['favorites'], queryFn: favoriteRepo.list });
  const { data: rendezVous = [] } = useQuery({ queryKey: ['rendez-vous', 'client'], queryFn: rendezVousRepo.list });
  const { data: exchanges = [] } = useQuery({ queryKey: ['exchanges'], queryFn: exchangeRepo.list });
  const activeExchanges = exchanges.filter((e) => ['en_attente', 'lu', 'en_cours'].includes(e.statut)).length;
  const distinctPraticiens = new Set(rendezVous.map((r) => r.praticien_id)).size;

  const handleSignOut = () => {
    signOut();
    // Skip the splash on the way out — go straight to onboarding so the
    // logged-out state is unambiguous.
    router.replace('/onboarding' as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Avatar size="xl" gradient={[colors.violet, colors.sky]} />
          <Text style={styles.name}>{[firstName, lastName].filter(Boolean).join(' ')}</Text>
        </View>

        <View style={styles.stats}>
          <Stat label="SÉANCES" value={String(rendezVous.length)} />
          <Stat label="PRATICIENS" value={String(distinctPraticiens)} />
          <Stat label="FAVORIS" value={String(favorites.length)} />
        </View>

        <Section title="Mon parcours">
          <MenuRow
            icon={<Icon name="cal" size={18} color={colors.ink} />}
            label="Mes séances"
            value={rendezVous.length > 0 ? String(rendezVous.length) : undefined}
            onPress={() => router.push('/rendez-vous' as any)}
          />
          <MenuRow
            icon={<Lotus size={16} color={colors.violet2} />}
            label="Laisser un avis"
            onPress={() => router.push('/review' as any)}
          />
          <MenuRow
            icon={<Icon name="heart" size={18} color={colors.ink} />}
            label="Mes praticiens favoris"
            onPress={() => router.push('/favorites' as any)}
          />
          <MenuRow
            icon={<Icon name="exchange" size={18} color={colors.ink} />}
            label="Échanges"
            value={activeExchanges > 0 ? `${activeExchanges} actif${activeExchanges > 1 ? 's' : ''}` : undefined}
            onPress={() => router.push('/exchange' as any)}
          />
        </Section>

        <Section title="Application">
          <MenuRow
            icon={<Icon name="book" size={18} color={colors.ink} />}
            label="Journal"
            onPress={() => router.push('/blog' as any)}
          />
          <MenuRow
            icon={<Icon name="star" size={18} color={colors.ink} />}
            label="Cercles"
            onPress={() => router.push('/cercles' as any)}
          />
          <MenuRow
            icon={<Lotus size={16} color={colors.violet2} />}
            label="L'âme du projet"
            onPress={() => router.push('/founder' as any)}
          />
          <MenuRow
            icon={<Icon name="bell" size={18} color={colors.ink} />}
            label="Notifications"
            onPress={() => router.push('/notification-settings' as any)}
          />
          <MenuRow
            icon={<Icon name="card" size={18} color={colors.ink} />}
            label="Moyens de paiement"
            onPress={() => router.push('/payment-history' as any)}
          />
        </Section>

        <Section title="Praticien ?">
          <Pressable
            onPress={() => router.push('/onboarding/role' as any)}
            style={styles.becomeRow}
          >
            <AuroraBackground variant="soft" rounded={10} style={styles.becomeIc}>
              <Lotus size={14} color="#fff" />
            </AuroraBackground>
            <Text style={styles.becomeLabel}>Devenir praticien sur GuériEnergies</Text>
            <Text style={styles.becomeOffer}>1 mois offert</Text>
            <Icon name="chevron" size={18} color={colors.muted} />
          </Pressable>
        </Section>

        <View style={{ padding: 24, alignItems: 'center' }}>
          <Pressable onPress={handleSignOut} hitSlop={12}>
            <Text style={styles.logout}>Se déconnecter</Text>
          </Pressable>
          <Text style={styles.version}>GuériEnergies v1.0 · fait avec soin en France</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statV}>{value}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', padding: 20 },
  name: { ...typography.h2, fontSize: 26, marginTop: 14 },
  sub: { ...typography.small, fontSize: 13, marginTop: 2 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  statV: { ...typography.serif, fontFamily: 'CormorantGaramond_500Medium', fontSize: 22 },
  statL: { ...typography.tiny, fontSize: 11, letterSpacing: 0.5 },

  section: { marginTop: 14, backgroundColor: '#fff', paddingVertical: 8 },
  sectionHeader: {
    ...typography.eyebrow,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    letterSpacing: 1.8,
  },
  becomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  becomeIc: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  becomeLabel: { flex: 1, ...typography.body, fontSize: 14.5 },
  becomeOffer: { ...typography.bodyMedium, color: colors.violet2, fontSize: 13, marginRight: 4 },

  logout: {
    ...typography.small,
    fontSize: 13,
    color: colors.muted,
  },
  version: { ...typography.tiny, marginTop: 20 },
});
