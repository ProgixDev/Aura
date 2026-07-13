import type { ImageSourcePropType } from 'react-native';

/**
 * Central image registry.
 *
 * - Local bundled assets are `require(...)`d (practitioners, onboarding).
 * - Discipline heroes are remote (Pexels) — served as `{ uri }`.
 *
 * Screens read from here, never `require` inline, so adding/replacing an
 * asset is a one-line change in this file.
 */

// ---------- Onboarding ----------
export const onboardingImages: ImageSourcePropType[] = [
  require('../../assets/images/onboarding/onb-1.png'),
  require('../../assets/images/onboarding/onb-2.png'),
  require('../../assets/images/onboarding/onb-3.png'),
];

// ---------- Practitioners ----------
interface PractitionerImages {
  avatar: ImageSourcePropType;
  hero: ImageSourcePropType;
  gallery: ImageSourcePropType[];
}

export const practitionerImages: Record<string, PractitionerImages> = {
  p1: {
    avatar: require('../../assets/images/practitioners/p1-avatar.png'),
    hero: require('../../assets/images/practitioners/p1-hero.png'),
    gallery: [
      require('../../assets/images/practitioners/p1-g1.png'),
      require('../../assets/images/practitioners/p1-g2.png'),
      require('../../assets/images/practitioners/p1-g3.png'),
    ],
  },
  p2: {
    avatar: require('../../assets/images/practitioners/p2-avatar.png'),
    hero: require('../../assets/images/practitioners/p2-hero.png'),
    gallery: [
      require('../../assets/images/practitioners/p2-g1.png'),
      require('../../assets/images/practitioners/p2-g2.png'),
    ],
  },
  p3: {
    avatar: require('../../assets/images/practitioners/p3-avatar.png'),
    hero: require('../../assets/images/practitioners/p3-hero.png'),
    gallery: [],
  },
  p4: {
    avatar: require('../../assets/images/practitioners/p4-avatar.png'),
    hero: require('../../assets/images/practitioners/p4-hero.png'),
    gallery: [],
  },
  p5: {
    avatar: require('../../assets/images/practitioners/p5-avatar.png'),
    hero: require('../../assets/images/practitioners/p5-hero.png'),
    gallery: [],
  },
  p6: {
    avatar: require('../../assets/images/practitioners/p6-avatar.png'),
    hero: require('../../assets/images/practitioners/p6-hero.png'),
    gallery: [],
  },
  p7: {
    avatar: require('../../assets/images/practitioners/p7-avatar.png'),
    hero: require('../../assets/images/practitioners/p7-hero.png'),
    gallery: [],
  },
  p8: {
    avatar: require('../../assets/images/practitioners/p8-avatar.png'),
    hero: require('../../assets/images/practitioners/p8-hero.png'),
    gallery: [],
  },
};

// ---------- Disciplines (remote Pexels) ----------
export const disciplineImages: Record<string, string> = {
  magnetisme:
    'https://images.pexels.com/photos/5240802/pexels-photo-5240802.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  reiki:
    'https://images.pexels.com/photos/5240802/pexels-photo-5240802.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  chamanisme:
    'https://images.pexels.com/photos/6013473/pexels-photo-6013473.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  'soin-energetique':
    'https://images.pexels.com/photos/7607304/pexels-photo-7607304.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  hypnose:
    'https://images.pexels.com/photos/6468883/pexels-photo-6468883.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  meditation:
    'https://images.pexels.com/photos/7077809/pexels-photo-7077809.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  clairvoyance:
    'https://images.pexels.com/photos/12486412/pexels-photo-12486412.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  'bain-sonore':
    'https://images.pexels.com/photos/6013463/pexels-photo-6013463.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  massage:
    'https://images.pexels.com/photos/35884499/pexels-photo-35884499.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  coaching:
    'https://images.pexels.com/photos/4925639/pexels-photo-4925639.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  retraites:
    'https://images.pexels.com/photos/31233850/pexels-photo-31233850.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
  purification:
    'https://images.pexels.com/photos/13040970/pexels-photo-13040970.jpeg?auto=compress&cs=tinysrgb&w=1290&h=860&fit=crop',
};

export const disciplineImageSource = (slug: string): ImageSourcePropType | undefined =>
  disciplineImages[slug] ? { uri: disciplineImages[slug] } : undefined;
