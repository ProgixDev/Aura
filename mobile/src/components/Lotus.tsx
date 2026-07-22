import React from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { colors } from '@theme/colors';

/**
 * The GuériEnergies mark — a stylised lotus used both as logo and as the rating symbol
 * (in place of stars). Reproduced from the prototype's inline SVG.
 */
export function Lotus({
  size = 18,
  color = colors.violet2,
  opacity = 1,
}: {
  size?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill={color} opacity={opacity}>
        <Path d="M12 22c-3-2-5-5-5-9 1.5 1 3 1.5 5 1.5s3.5-.5 5-1.5c0 4-2 7-5 9z" />
        <Path d="M12 14c-3 0-5-2-5-5 1.5 0 3 .5 5 2.5 2-2 3.5-2.5 5-2.5 0 3-2 5-5 5z" />
        <Path
          d="M12 11.5C10 9 9 6 9 3c1.5 0 2.5 1 3 2 .5-1 1.5-2 3-2 0 3-1 6-3 8.5z"
          opacity={0.88}
        />
      </G>
    </Svg>
  );
}
