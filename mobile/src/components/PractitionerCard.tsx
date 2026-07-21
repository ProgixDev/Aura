import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { Rating } from './Rating';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';
import { shadows } from '@theme/shadows';
import type { Practitioner } from '@data/types';

interface Props {
  practitioner: Practitioner;
  variant?: 'horizontal' | 'compact';
}

export function PractitionerCard({ practitioner, variant = 'compact' }: Props) {
  const router = useRouter();
  const go = () => router.push(`/praticien/${practitioner.id}` as any);

  if (variant === 'horizontal') {
    return (
      <Pressable onPress={go} style={[styles.hCard, shadows.card]}>
        <View style={styles.hCover}>
          <Avatar
            source={practitioner.photo}
            gradient={practitioner.gradient}
            rounded={false}
            style={styles.hCoverImg}
          />
          {practitioner.online ? (
            <View style={styles.hBadge}>
              <Badge label="● en ligne" variant="online" />
            </View>
          ) : null}
        </View>
        <View style={styles.hBody}>
          <Text style={styles.hName}>{practitioner.name}</Text>
          <Text style={styles.hDisc}>
            {practitioner.specialties[0]} · {practitioner.city}
          </Text>
          <View style={styles.hFoot}>
            <Rating
              value={practitioner.rating}
              showCount={false}
              size={12}
            />
            <Text style={styles.hPrice}>{practitioner.price}€</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={go} style={[styles.row, shadows.card]}>
      <Avatar
        source={practitioner.photo}
        gradient={practitioner.gradient}
        size="lg"
        rounded={false}
        online={practitioner.online}
        style={{ width: 72, height: 72, borderRadius: 18 }}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{practitioner.name}</Text>
          {practitioner.verified ? (
            <Icon name="check" size={14} color={colors.violet2} />
          ) : null}
          {practitioner.novice ? (
            <Badge label="Novice" variant="novice" />
          ) : null}
        </View>
        <Text style={styles.specs}>
          {practitioner.specialties.join(' · ')}
        </Text>
        <View style={styles.meta}>
          <Rating value={practitioner.rating} count={practitioner.reviews} />
        </View>
        <View style={styles.metaRow2}>
          <View style={styles.pin}>
            <Icon name="pin" size={13} color={colors.muted} />
            <Text style={styles.pinTxt}>{practitioner.city}</Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.mode}>{practitioner.mode}</Text>
          <Text style={styles.priceTxt}>
            {practitioner.price}€
            <Text style={styles.priceUnit}>/séance</Text>
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 22,
    marginBottom: 12,
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: {
    ...typography.serif,
    fontSize: 19,
    fontFamily: 'CormorantGaramond_500Medium',
  },
  specs: {
    ...typography.small,
    fontSize: 13,
    marginBottom: 8,
  },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  pin: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pinTxt: { ...typography.small, fontSize: 12 },
  dot: { color: colors.muted, fontSize: 12 },
  mode: { ...typography.small, fontSize: 12 },
  priceTxt: {
    ...typography.price,
    fontSize: 18,
    marginLeft: 'auto',
  },
  priceUnit: {
    ...typography.small,
    fontSize: 12,
  },

  hCard: {
    width: 240,
    backgroundColor: colors.white,
    borderRadius: 22,
    overflow: 'hidden',
  },
  hCover: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  hCoverImg: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  hBadge: { position: 'absolute', top: 10, right: 10 },
  hBody: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14 },
  hName: {
    ...typography.serif,
    fontSize: 17,
    fontFamily: 'CormorantGaramond_500Medium',
    marginBottom: 2,
  },
  hDisc: {
    ...typography.small,
    fontSize: 12,
    marginBottom: 8,
  },
  hFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hPrice: {
    ...typography.price,
    fontSize: 16,
  },
});
