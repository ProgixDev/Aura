import { Platform, TextStyle } from 'react-native';

/**
 * Two-font pairing from the prototype:
 *  - "Cormorant Garamond" for display / serif accents (italics on stressed words)
 *  - "Outfit" for UI/body
 *
 * Loaded via @expo-google-fonts in app/_layout.tsx.
 */
export const fontFamilies = {
  serif: 'CormorantGaramond_400Regular',
  serifMedium: 'CormorantGaramond_500Medium',
  serifLight: 'CormorantGaramond_300Light',
  serifItalic: 'CormorantGaramond_400Regular_Italic',
  serifItalicMedium: 'CormorantGaramond_500Medium_Italic',
  serifItalicLight: 'CormorantGaramond_300Light_Italic',

  body: 'Outfit_400Regular',
  bodyMedium: 'Outfit_500Medium',
  bodySemibold: 'Outfit_600SemiBold',
  bodyLight: 'Outfit_300Light',
} as const;

export const typography = {
  hDisplay: {
    fontFamily: fontFamilies.serifLight,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -0.2,
    color: '#2D2540',
  } as TextStyle,
  h1: {
    fontFamily: fontFamilies.serif,
    fontSize: 32,
    lineHeight: 36,
    color: '#2D2540',
  } as TextStyle,
  h2: {
    fontFamily: fontFamilies.serifMedium,
    fontSize: 24,
    lineHeight: 28,
    color: '#2D2540',
  } as TextStyle,
  h3: {
    fontFamily: fontFamilies.serifMedium,
    fontSize: 20,
    lineHeight: 24,
    color: '#2D2540',
  } as TextStyle,
  serif: {
    fontFamily: fontFamilies.serif,
    color: '#2D2540',
  } as TextStyle,
  serifItalic: {
    fontFamily: fontFamilies.serifItalic,
    color: '#A48BD8',
  } as TextStyle,
  eyebrow: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase' as const,
    color: '#7B7290',
  } as TextStyle,
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    lineHeight: 23,
    color: '#3D3650',
  } as TextStyle,
  bodyMedium: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    color: '#2D2540',
  } as TextStyle,
  small: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 19,
    color: '#7B7290',
  } as TextStyle,
  tiny: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: '#7B7290',
    letterSpacing: 0.4,
  } as TextStyle,
  button: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    letterSpacing: 0.15,
  } as TextStyle,
  price: {
    fontFamily: fontFamilies.serifMedium,
    fontSize: 22,
    color: '#2D2540',
  } as TextStyle,
};

// Fallbacks if fonts haven't loaded yet
export const systemSerif =
  Platform.OS === 'ios' ? 'Georgia' : 'serif';
export const systemSans =
  Platform.OS === 'ios' ? 'System' : 'sans-serif';
