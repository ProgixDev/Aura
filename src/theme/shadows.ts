import { Platform, ViewStyle } from 'react-native';

const make = (
  ios: { shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number },
  elevation: number
): ViewStyle =>
  Platform.OS === 'ios'
    ? { ...ios, shadowColor: '#2D2540' }
    : { elevation };

export const shadows = {
  card: make(
    { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14 },
    3
  ),
  cardHover: make(
    { shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 28 },
    6
  ),
  glow: make(
    { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 30 },
    8
  ),
  button: make(
    { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14 },
    4
  ),
};
