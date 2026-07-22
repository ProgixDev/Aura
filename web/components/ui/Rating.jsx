import { Lotus } from './Lotus';

/** Rating with lotus glyphs (GuériEnergies uses lotuses, not stars). */
export function Rating({ value = 5, count, size = 14, showCount = true }) {
  const full = Math.round(value);
  return (
    <span className="rating">
      {[0, 1, 2, 3, 4].map((i) => (
        <Lotus key={i} size={size} filled={i < full} color="var(--violet-2)" />
      ))}
      <span className="num">{Number(value).toFixed(value % 1 === 0 ? 1 : (Math.round(value * 10) === value * 10 ? 1 : 2))}</span>
      {showCount && count != null && <span className="count">· {count} avis</span>}
    </span>
  );
}

export default Rating;
