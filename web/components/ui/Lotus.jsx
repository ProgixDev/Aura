// Lotus mark — the Aura brand glyph & rating unit (replaces the star).
export function Lotus({ size = 16, filled = true, color = 'currentColor', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden>
      <path
        d="M12 21c-4.5-1.2-7-4.2-7-8 0 0 2.6.3 4.3 2.1M12 21c4.5-1.2 7-4.2 7-8 0 0-2.6.3-4.3 2.1M12 21V8M12 21c-1.6-1-2.6-2.8-2.6-5 0-2.6 1.2-4.8 2.6-6 1.4 1.2 2.6 3.4 2.6 6 0 2.2-1 4-2.6 5Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.16 : 0}
      />
    </svg>
  );
}

export default Lotus;
