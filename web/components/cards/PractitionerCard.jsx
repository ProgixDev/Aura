import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';

/** Horizontal result card (search/directory). */
export function PractitionerCard({ p }) {
  return (
    <Link href={`/praticien/${p.id}`} className="card card-hover" style={{ display: 'flex', gap: 16, padding: 18, alignItems: 'flex-start' }}>
      <Avatar src={p.photo} name={p.name} tone={p.tone} size={72} online={p.online} />
      <div className="flex-1">
        <div className="row gap-2" style={{ marginBottom: 2 }}>
          <span className="h-4" style={{ fontWeight: 500 }}>{p.name}</span>
          {p.verified && <Icon name="checkCircle" size={15} color="var(--violet-2)" />}
          {p.novice && <Badge variant="novice">Novice</Badge>}
        </div>
        <div className="small" style={{ marginBottom: 8 }}>{p.specialties.join(' · ')}</div>
        <Rating value={p.rating} count={p.reviews} />
        <div className="row gap-2 wrap small" style={{ marginTop: 8 }}>
          <span className="row gap-1"><Icon name="pin" size={13} color="var(--muted)" />{p.city}</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>{p.mode}</span>
          <span className="price" style={{ marginLeft: 'auto', fontSize: 18 }}>{p.price}€<small>/séance</small></span>
        </div>
      </div>
    </Link>
  );
}

/** Compact vertical card (home rails). */
export function PractitionerMini({ p }) {
  return (
    <Link href={`/praticien/${p.id}`} className="card card-hover" style={{ overflow: 'hidden', minWidth: 220, display: 'block' }}>
      <div style={{ height: 110, position: 'relative' }}>
        <img src={p.hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div className="h-4">{p.name}</div>
        <div className="small" style={{ marginBottom: 8 }}>{p.specialties[0]} · {p.city}</div>
        <div className="between"><Rating value={p.rating} showCount={false} size={12} /><span className="price" style={{ fontSize: 16 }}>{p.price}€</span></div>
      </div>
    </Link>
  );
}

export default PractitionerCard;
