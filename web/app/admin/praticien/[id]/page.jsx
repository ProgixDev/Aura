import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { practitioners, getPractitioner, reviewsFor } from '@/lib/data/practitioners';
import { bookings } from '@/lib/data/admin';
import { euro, tone } from '@/lib/format';
import PractitionerTabs from './PractitionerTabs';

export function generateStaticParams() {
  return practitioners.map((p) => ({ id: p.id }));
}

export default async function PractitionerDetailPage({ params }) {
  const { id } = await params;
  const p = getPractitioner(id);

  if (!p) {
    return (
      <>
        <PageHead title="Praticien introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens', href: '/admin/praticiens' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun praticien ne correspond à cet identifiant.</div>
      </>
    );
  }

  const myBookings = bookings.filter((b) => b.practitionerId === p.id);
  const myReviews = reviewsFor(p.id);

  return (
    <>
      <PageHead
        title={p.name}
        subtitle={`${p.specialties.join(' · ')} · ${p.city}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens', href: '/admin/praticiens' }, { label: p.name }]}
        actions={<>
          <Link href={`/praticien/${p.id}`} className="btn btn-soft btn-sm"><Icon name="user" size={15} /> Profil public</Link>
          <ModalButton modal="contact" payload={{ name: p.name }} className="btn btn-soft btn-sm"><Icon name="mail" size={15} /> Contacter</ModalButton>
          <ModalButton modal="payout" payload={{ name: p.name }} successToast="Versement programmé" className="btn btn-soft btn-sm"><Icon name="euro" size={15} /> Versement</ModalButton>
          <ModalButton modal="suspendUser" payload={{ name: p.name }} className="btn btn-danger-soft btn-sm"><Icon name="shield" size={15} /> Suspendre</ModalButton>
        </>}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <Avatar src={p.photo} name={p.name} tone={p.tone} size={72} online={p.online} />
          <div className="flex-1">
            <div className="row gap-2 wrap" style={{ marginBottom: 6 }}>
              <h2 className="h-3">{p.name}</h2>
              {p.verified && <Badge variant="verified" dot>Vérifié</Badge>}
              <Badge variant={tone(p.status)} dot>{p.status}</Badge>
              {p.online && <Badge variant="online" dot>En ligne</Badge>}
            </div>
            <Rating value={p.rating} count={p.reviews} size={14} showCount />
            <p className="small" style={{ marginTop: 8, maxWidth: 640 }}>{p.bio}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <StatCard label="Revenus cumulés" value={euro(p.earnings)} icon="euro" />
        <StatCard label="Séances ce mois" value={p.sessionsThisMonth} icon="calendar" />
        <StatCard label="Note moyenne" value={p.rating.toFixed(2)} icon="star" />
        <StatCard label="Avis reçus" value={p.reviews} icon="message" />
      </div>

      <PractitionerTabs p={p} myBookings={myBookings} myReviews={myReviews} />
    </>
  );
}
