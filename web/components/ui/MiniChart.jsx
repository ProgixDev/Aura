// Pure-SVG charts for analytics — no chart library. Pass series of numbers.

export function BarChart({ data = [], height = 160, color = 'var(--violet-2)', labels = [] }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 8, height }}>
        {data.map((v, i) => (
          <div key={i} className="flex-1" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ height: `${(v / max) * 100}%`, background: color, borderRadius: '6px 6px 0 0', minHeight: 4, transition: 'height 0.4s' }} title={String(v)} />
          </div>
        ))}
      </div>
      {labels.length > 0 && (
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {labels.map((l, i) => <div key={i} className="flex-1 tiny center">{l}</div>)}
        </div>
      )}
    </div>
  );
}

export function LineChart({ data = [], height = 160, color = 'var(--violet-2)', fill = 'rgba(164,139,216,0.14)' }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const W = 500, H = height;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * W, H - ((v - min) / (max - min || 1)) * (H - 10) - 5]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Donut({ value = 70, size = 120, color = 'var(--violet-2)', track = 'var(--line)', label }) {
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span className="serif" style={{ fontSize: 26, fontWeight: 500 }}>{value}%</span>
        {label && <span className="tiny">{label}</span>}
      </div>
    </div>
  );
}
