import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { colors } from '@theme/colors';

export type IconName =
  | 'back'
  | 'close'
  | 'search'
  | 'heart'
  | 'share'
  | 'flag'
  | 'pin'
  | 'video'
  | 'inperson'
  | 'shield'
  | 'send'
  | 'chevron'
  | 'check'
  | 'plus'
  | 'filter'
  | 'sun'
  | 'status'
  | 'bell'
  | 'card'
  | 'cal'
  | 'exchange'
  | 'star';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color = colors.ink, strokeWidth = 1.6 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'back':
      return (
        <Svg {...common}>
          <Path d="m15 18-6-6 6-6" />
        </Svg>
      );
    case 'close':
      return (
        <Svg {...common}>
          <Path d="M18 6 6 18M6 6l12 12" />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...common}>
          <Circle cx="11" cy="11" r="7" />
          <Path d="m20 20-3.5-3.5" />
        </Svg>
      );
    case 'heart':
      return (
        <Svg {...common}>
          <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </Svg>
      );
    case 'share':
      return (
        <Svg {...common}>
          <Circle cx="18" cy="5" r="3" />
          <Circle cx="6" cy="12" r="3" />
          <Circle cx="18" cy="19" r="3" />
          <Path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
        </Svg>
      );
    case 'flag':
      return (
        <Svg {...common}>
          <Path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <Line x1="4" y1="22" x2="4" y2="15" />
        </Svg>
      );
    case 'pin':
      return (
        <Svg {...common}>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <Circle cx="12" cy="10" r="3" />
        </Svg>
      );
    case 'video':
      return (
        <Svg {...common}>
          <Path d="m22 8-6 4 6 4V8z" />
          <Rect x="2" y="6" width="14" height="12" rx="2" />
        </Svg>
      );
    case 'inperson':
      return (
        <Svg {...common}>
          <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <Circle cx="9" cy="7" r="4" />
          <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
      );
    case 'shield':
      return (
        <Svg {...common}>
          <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Svg>
      );
    case 'send':
      return (
        <Svg {...common} strokeWidth={1.8}>
          <Line x1="22" y1="2" x2="11" y2="13" />
          <Polygon points="22 2 15 22 11 13 2 9 22 2" />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg {...common}>
          <Path d="m9 18 6-6-6-6" />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...common} strokeWidth={2}>
          <Polyline points="20 6 9 17 4 12" />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...common} strokeWidth={1.8}>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      );
    case 'filter':
      return (
        <Svg {...common}>
          <Polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </Svg>
      );
    case 'sun':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="4" />
          <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </Svg>
      );
    case 'status':
      return (
        <Svg {...common}>
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <Polyline points="22 4 12 14.01 9 11.01" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg {...common}>
          <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </Svg>
      );
    case 'card':
      return (
        <Svg {...common}>
          <Rect x="2" y="5" width="20" height="14" rx="2" />
          <Line x1="2" y1="10" x2="22" y2="10" />
        </Svg>
      );
    case 'cal':
      return (
        <Svg {...common}>
          <Rect x="3" y="4" width="18" height="18" rx="2" />
          <Line x1="16" y1="2" x2="16" y2="6" />
          <Line x1="8" y1="2" x2="8" y2="6" />
          <Line x1="3" y1="10" x2="21" y2="10" />
        </Svg>
      );
    case 'exchange':
      return (
        <Svg {...common}>
          <Path d="M7 7h13l-3-3M17 17H4l3 3" />
        </Svg>
      );
    case 'star':
      return (
        <Svg {...common}>
          <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </Svg>
      );
  }
}
