import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Chip, ChipTone } from './Chip';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';
import { shadows } from '@theme/shadows';
import { dateFr } from '@utils/format';
import type { Exchange } from '@data/types';

// Chip has no dedicated "danger" tone, so `signale` borrows `violet` to stay
// visually distinct from the warm/positive statuses.
const STATUT_FR: Record<string, string> = {
  en_attente: 'En attente',
  lu: 'Lu',
  en_cours: 'En cours',
  traite: 'Traité',
  signale: 'Signalé',
  archive: 'Archivé',
};
const STATUT_TONE: Record<string, ChipTone> = {
  en_attente: 'gold',
  lu: 'sky',
  en_cours: 'sky',
  traite: 'sage',
  signale: 'violet',
  archive: 'neutral',
};

export function ExchangeCard({ exchange }: { exchange: Exchange }) {
  const router = useRouter();
  const hasFlow = Boolean(exchange.ce_que_je_propose || exchange.ce_que_je_recherche);

  return (
    <Pressable
      onPress={() => router.push(`/exchange/${exchange.id}` as any)}
      style={[styles.card, shadows.card]}
    >
      <View style={styles.head}>
        <View style={styles.titleWrap}>
          <Text style={styles.name} numberOfLines={2}>{exchange.sujet}</Text>
          <Text style={styles.date}>
            {exchange.auteur_nom ? `${exchange.auteur_nom} · ` : ''}{dateFr(exchange.created_at)}
          </Text>
        </View>
        <Chip
          label={STATUT_FR[exchange.statut] ?? exchange.statut}
          tone={STATUT_TONE[exchange.statut] ?? 'neutral'}
          size="sm"
        />
      </View>

      {exchange.message ? (
        <Text style={styles.message} numberOfLines={2}>{exchange.message}</Text>
      ) : null}

      {hasFlow && (
        <View style={styles.flow}>
          {exchange.ce_que_je_propose ? (
            <View style={styles.side}>
              <Text style={styles.flowLabel}>Propose</Text>
              <Text style={styles.flowValue} numberOfLines={2}>{exchange.ce_que_je_propose}</Text>
            </View>
          ) : null}
          {exchange.ce_que_je_propose && exchange.ce_que_je_recherche ? (
            <View style={styles.arrow}>
              <Icon name="chevron" size={16} color="#fff" />
            </View>
          ) : null}
          {exchange.ce_que_je_recherche ? (
            <View style={styles.side}>
              <Text style={styles.flowLabel}>Cherche</Text>
              <Text style={styles.flowValue} numberOfLines={2}>{exchange.ce_que_je_recherche}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    backgroundColor: colors.white,
    borderRadius: 22,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  titleWrap: { flex: 1 },
  name: { ...typography.bodyMedium, fontSize: 14 },
  date: { ...typography.tiny, marginTop: 2 },
  message: { ...typography.small, marginTop: 2 },
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  side: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.mist,
    borderRadius: radii.md,
  },
  flowLabel: {
    ...typography.tiny,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  flowValue: {
    ...typography.serif,
    fontSize: 15,
    fontFamily: 'CormorantGaramond_500Medium',
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
