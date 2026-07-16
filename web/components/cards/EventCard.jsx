import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export function EventCard({ e }) {
  return (
    <Link href={`/evenement/${e.id}`} className="card card-hover" style={{ overflow: 'hidden', display: 'block' }}>
      <div
        className="aurora-dark grain"
        style={{
          height: 160, padding: 18, display: 'flex', alignItems: 'flex-end',
          '--orb-1': e.tone === 'gold' ? '#E4C896' : e.tone === 'sage' ? '#B8D4C2' : e.tone === 'violet' ? '#C4B0E8' : '#A8C8E8',
          ...(e.image ? { backgroundImage: `linear-gradient(rgba(20,12,35,0.25), rgba(10,6,20,0.55)), url(${e.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
        }}
      >
        <span className="badge featured" style={{ position: 'absolute', top: 14, left: 14 }}>{e.kind}</span>
        <div className="serif" style={{ color: '#fff', fontSize: 22, fontWeight: 500, lineHeight: 1.1 }}>{e.title}</div>
      </div>
      <div style={{ padding: 18 }}>
        <div className="row gap-2 small" style={{ marginBottom: 6 }}><Icon name="calendar" size={14} color="var(--muted)" />{e.when}</div>
        <div className="row gap-2 small"><Icon name="pin" size={14} color="var(--muted)" />{e.where}</div>
        <div className="between" style={{ marginTop: 12 }}>
          <span className="price" style={{ fontSize: 18 }}>{e.price}</span>
          {e.seatsLeft <= 5 && <span className="badge warning">{e.seatsLeft} places restantes</span>}
        </div>
      </div>
    </Link>
  );
}

export default EventCard;
