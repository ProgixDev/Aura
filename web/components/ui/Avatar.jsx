import { initials as toInitials } from '@/lib/format';

const TONE_GRAD = {
  violet: 'linear-gradient(135deg,#C4B0E8,#A8C8E8)',
  sky: 'linear-gradient(135deg,#A8C8E8,#B8D4C2)',
  sage: 'linear-gradient(135deg,#B8D4C2,#C4B0E8)',
  gold: 'linear-gradient(135deg,#E4C896,#C4B0E8)',
};

/**
 * Avatar — real photo when `src` is set, else a soft aurora gradient with initials.
 * `size` is a pixel number (any value). `online` shows the sage status dot,
 * `rounded` renders a rounded square instead of a circle.
 *
 * Dimensions are applied via inline style (not CSS size classes) so any numeric
 * size is constrained — otherwise an unsized container lets the photo expand to
 * its intrinsic resolution.
 */
export function Avatar({ src, name = '', size = 52, tone = 'violet', online = false, rounded = false, alt }) {
  const px = typeof size === 'number' ? size : parseInt(size, 10) || 52;
  const radius = rounded ? Math.round(px * 0.28) : '50%';
  return (
    <div
      className="avatar"
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        ...(!src ? { background: TONE_GRAD[tone] || TONE_GRAD.violet } : {}),
      }}
    >
      {src ? (
        <img src={src} alt={alt || name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 500, fontSize: px * 0.34, fontFamily: 'var(--font-serif)' }}>
          {toInitials(name)}
        </span>
      )}
      {online && <span className="online-dot" />}
    </div>
  );
}

export default Avatar;
