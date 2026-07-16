import Link from 'next/link';

export function DisciplineTile({ d }) {
  return (
    <Link href={`/discipline/${d.slug}`} className="card-line card-hover" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
      <span className={`tile-icon glyph-${d.tone}`} style={{ fontSize: 20 }}>{d.glyph}</span>
      <div className="flex-1">
        <div style={{ fontWeight: 500, fontSize: 15 }}>{d.name}</div>
        {d.count != null && <div className="tiny">{d.count} praticiens</div>}
      </div>
    </Link>
  );
}

export default DisciplineTile;
