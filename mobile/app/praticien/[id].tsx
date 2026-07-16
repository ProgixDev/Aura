import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { AuroraBackground } from '@components/AuroraBackground';
import { Badge } from '@components/Badge';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { Icon } from '@components/Icon';
import { Rating } from '@components/Rating';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { practitionerRepo, favoriteRepo, messageRepo } from '@data/repos';

type Tab = 'about' | 'reviews';

// No shared date-formatting utility exists yet on mobile that this plan can
// safely depend on (mobile/src/utils/format.ts is a Plan 04 addition, and
// this plan doesn't declare a dependency on Plan 04 landing first) — and RN's
// Hermes engine doesn't reliably support Intl.DateTimeFormat locales, so this
// is a small manual formatter rather than `.toLocaleDateString('fr-FR', ...)`.
function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function PractitionerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('about');
  const [favPending, setFavPending] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);
  const [contactPending, setContactPending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const { data: p } = useQuery({
    queryKey: ['practitioner', id],
    queryFn: () => practitionerRepo.byId(String(id)),
  });
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => practitionerRepo.reviewsFor(String(id)),
  });
  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: favoriteRepo.list,
  });

  if (!p) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const isFavorite = favorites.some((f) => f.id === p.id);
  const reviewCount = reviews.length;
  const avgNote = reviewCount
    ? Math.round((reviews.reduce((sum, r) => sum + r.note, 0) / reviewCount) * 10) / 10
    : 0;

  const toggleFavorite = async () => {
    if (favPending) return;
    setFavPending(true);
    setFavError(null);
    try {
      if (isFavorite) await favoriteRepo.remove(p.id);
      else await favoriteRepo.add(p.id);
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (err: any) {
      setFavError(err?.message ?? 'Une erreur est survenue, réessayez.');
    } finally {
      setFavPending(false);
    }
  };

  const startChat = async () => {
    if (contactPending) return;
    setContactPending(true);
    setContactError(null);
    try {
      const conversation = await messageRepo.startConversation(Number(id));
      router.push(`/chat/${conversation.id}` as any);
    } catch (err: any) {
      setContactError(err?.message ?? 'Impossible de démarrer la conversation, réessayez.');
    } finally {
      setContactPending(false);
    }
  };

  // Hero portraits put the face in the upper third. Anchoring the photo to the
  // top of the hero (rather than `cover`, which centres and crops the face out)
  // keeps the practitioner visible. Reading the asset's real aspect ratio means
  // the image scales to full width with no distortion; the taller-than-frame
  // overflow is clipped at the bottom by the hero's `overflow: 'hidden'`.
  const heroMeta = p.hero ? Image.resolveAssetSource(p.hero) : null;
  const heroAspect = heroMeta?.width ? heroMeta.width / heroMeta.height : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          {p.hero ? (
            <Image
              source={p.hero}
              style={
                heroAspect
                  ? { position: 'absolute', top: 0, left: 0, width: '100%', aspectRatio: heroAspect }
                  : StyleSheet.absoluteFillObject
              }
              resizeMode="cover"
            />
          ) : (
            <AuroraBackground variant="soft" style={StyleSheet.absoluteFillObject as any}>
              <></>
            </AuroraBackground>
          )}
          <LinearGradient
            colors={['rgba(45,37,64,0)', 'rgba(45,37,64,0.4)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <Pressable style={styles.iconCircle} onPress={() => router.back()}>
              <Icon name="back" size={20} color={colors.ink} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.iconCircle} onPress={toggleFavorite} disabled={favPending}>
                <Icon name="heart" size={18} color={isFavorite ? colors.violet2 : colors.ink} />
              </Pressable>
              <Pressable
                style={styles.iconCircle}
                onPress={() => router.push(`/report?praticienId=${id}` as any)}
              >
                <Icon name="flag" size={16} color={colors.ink} />
              </Pressable>
              <Pressable
                style={styles.iconCircle}
                onPress={() => Share.share({ message: `${p.name} sur Aura — https://aura.fr/praticien/${id}` })}
              >
                <Icon name="share" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Floating card */}
        <View style={[styles.floatCard, shadows.cardHover]}>
          {(favError || contactError) ? <Text style={styles.favError}>{favError || contactError}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            {p.verified ? (
              <Badge
                label="Vérifiée"
                variant="verified"
                leftIcon={<Icon name="check" size={12} color={colors.chipSageText} />}
              />
            ) : null}
            {p.online ? <Badge label="● en ligne" variant="online" /> : null}
          </View>
          <Text style={styles.fcName}>{p.name}</Text>
          <View style={styles.fcCityRow}>
            <Icon name="pin" size={14} color={colors.muted} />
            <Text style={styles.fcCity}>
              {p.city} · {p.mode}
            </Text>
          </View>

          <View style={styles.fcChips}>
            {p.specialties.map((s, i) => (
              <Chip
                key={s}
                label={s}
                tone={i === 0 ? 'violet' : 'sky'}
              />
            ))}
          </View>

          <View style={styles.fcStrip}>
            <Rating value={avgNote} count={reviewCount} />
            <Text style={styles.fcPrice}>
              {p.price}€
              <Text style={styles.fcPriceUnit}>/séance · 75 min</Text>
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TabButton label="À propos" active={tab === 'about'} onPress={() => setTab('about')} />
          <TabButton
            label={`Avis (${reviewCount})`}
            active={tab === 'reviews'}
            onPress={() => setTab('reviews')}
          />
        </View>

        {tab === 'about' ? (
          <View style={{ padding: 24 }}>
            <Text style={typography.body}>
              {p.bio}
              <Text style={{ color: colors.violet2 }}> Lire la suite…</Text>
            </Text>

            <Text style={[typography.eyebrow, { marginTop: 24, marginBottom: 10 }]}>
              SA DÉMARCHE
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statV}>{p.experience?.years ?? '—'} ans</Text>
                <Text style={styles.statL}>d'expérience</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statV}>{p.level}</Text>
                <Text style={styles.statL}>niveau</Text>
              </View>
            </View>

            <Text style={[typography.eyebrow, { marginTop: 8, marginBottom: 10 }]}>
              ATELIER · {p.city.toUpperCase()}
            </Text>

            <View style={styles.gallery}>
              {/* Real photos first; pad with gradient tiles to keep a full 6-cell grid. */}
              {(p.gallery ?? []).map((img, i) => (
                <Image
                  key={`g-${i}`}
                  source={img}
                  style={styles.galleryItem}
                  resizeMode="cover"
                />
              ))}
              {[
                [colors.violet, colors.sky],
                [colors.sage, colors.gold],
                [colors.sky, colors.sage],
                [colors.gold, colors.violet],
                [colors.violet, colors.sage],
                [colors.sky, colors.gold],
              ]
                .slice(0, Math.max(0, 6 - (p.gallery?.length ?? 0)))
                .map((g, i) => (
                  <LinearGradient
                    key={`grad-${i}`}
                    colors={g as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.galleryItem}
                  />
                ))}
            </View>
          </View>
        ) : (
          <View style={{ padding: 24 }}>
            <Button
              label="Laisser un avis"
              variant="soft"
              onPress={() => router.push(`/review?praticienId=${id}` as any)}
              style={{ marginBottom: 16 }}
            />
            {reviews.length === 0 ? (
              <Text style={typography.small}>Aucun avis publié pour l'instant.</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.review}>
                  <View style={styles.reviewHead}>
                    <Avatar gradient={[colors.sky, colors.violet]} size="sm" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{r.full_name_author}</Text>
                      <Text style={styles.reviewMeta}>{formatReviewDate(r.date_ajout)}</Text>
                    </View>
                    <Rating value={r.note} showCount={false} size={12} />
                  </View>
                  <Text style={styles.reviewText}>"{r.avis}"</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom dock */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          label={contactPending ? 'Un instant…' : 'Contacter'}
          variant="soft"
          onPress={startChat}
          disabled={contactPending}
          style={{ flex: 1 }}
        />
        <Button
          label="Réserver"
          onPress={() => router.push(`/booking/slot?id=${id}` as any)}
          style={{ flex: 1.4 }}
        />
      </View>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { height: 360, position: 'relative', overflow: 'hidden' },
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
  floatCard: {
    marginHorizontal: 16,
    marginTop: -60,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
  },
  fcName: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 28,
    color: colors.ink,
    marginBottom: 4,
  },
  fcCityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  fcCity: { ...typography.small, fontSize: 14 },
  fcChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  fcStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.mist,
    borderRadius: 16,
  },
  fcPrice: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 22,
    color: colors.ink,
  },
  fcPriceUnit: { ...typography.small, fontSize: 12 },
  favError: { ...typography.small, fontSize: 12, color: colors.danger, marginBottom: 10 },

  tabs: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 24,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: { paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.ink, marginBottom: -1 },
  tabTxt: { ...typography.small, color: colors.muted, fontFamily: 'Outfit_500Medium' },
  tabTxtActive: { color: colors.ink },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statV: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 17, marginBottom: 2 },
  statL: { ...typography.small, fontSize: 12 },

  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  galleryItem: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },

  review: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewName: { ...typography.bodyMedium, fontSize: 14 },
  reviewMeta: { ...typography.tiny, fontSize: 11 },
  reviewText: { ...typography.body, fontSize: 14, lineHeight: 22 },

  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
