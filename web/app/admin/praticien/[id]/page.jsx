'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { contactRecipient } from '@/lib/adminContact';
import { euro } from '@/lib/format';
import PractitionerTabs from './PractitionerTabs';

export default function PractitionerDetailPage() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'praticien', id],
    queryFn: () => api.get(`/admin/praticiens/${id}`),
  });
  const p = data?.data;

  // Reuses the same admin rendez-vous endpoint the reservations list uses, scoped to
  // this praticien — real bookings, not the mock's `bookings.filter(...)`.
  const { data: rdvRes } = useQuery({
    queryKey: ['admin', 'rendez-vous', 'praticien', id],
    queryFn: () => api.get(`/admin/rendez-vous?praticien_id=${id}&per_page=100`),
    enabled: !!p,
  });
  const myBookings = rdvRes?.data ?? [];

  const { data: avisRes } = useQuery({
    queryKey: ['avis', id],
    queryFn: () => api.get(`/avis?praticien_id=${id}`),
    enabled: !!p,
  });
  const myReviews = avisRes?.data ?? [];

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !p) {
    return (
      <>
        <PageHead title="Praticien introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens', href: '/admin/praticiens' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun praticien ne correspond à cet identifiant.</div>
      </>
    );
  }

  const name = `${p.firstname} ${p.lastname}`;
  // No revenue/sessions-per-praticien endpoint exists — derive real totals from the
  // praticien's own rendez-vous rather than inventing numbers (unlike the old mock's
  // hardcoded p.earnings / p.sessionsThisMonth).
  const totalRevenue = myBookings
    .filter((b) => b.statut !== 'annule')
    .reduce((sum, b) => sum + Number(b.tarif || 0), 0);
  const now = new Date();
  const sessionsThisMonth = myBookings.filter((b) => {
    const d = new Date(b.date_heure);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  return (
    <>
      <PageHead
        title={name}
        subtitle={`${p.specialite} · ${p.ville}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens', href: '/admin/praticiens' }, { label: name }]}
        actions={<>
          <Link href={`/praticien/${p.id}`} className="btn btn-soft btn-sm"><Icon name="user" size={15} /> Profil public</Link>
          <ModalButton modal="contact" payload={{ name, onSubmit: (values) => contactRecipient('praticien', p.id, values) }} className="btn btn-soft btn-sm"><Icon name="mail" size={15} /> Contacter</ModalButton>
          <ModalButton modal="payout" payload={{ name }} successToast="Versement programmé" className="btn btn-soft btn-sm"><Icon name="euro" size={15} /> Versement</ModalButton>
          <ModalButton modal="suspendUser" payload={{ name }} className="btn btn-danger-soft btn-sm"><Icon name="shield" size={15} /> Suspendre</ModalButton>
        </>}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <Avatar name={name} size={72} />
          <div className="flex-1">
            <div className="row gap-2 wrap" style={{ marginBottom: 6 }}>
              <h2 className="h-3">{name}</h2>
              {p.statut_verification === 'valide' && <Badge variant="verified" dot>Vérifié</Badge>}
              <Badge variant={p.status === 'actif' ? 'success' : 'neutral'} dot>{p.status}</Badge>
            </div>
            <Rating value={p.rating ?? 0} count={p.reviews_count ?? 0} size={14} showCount />
            <p className="small" style={{ marginTop: 8, maxWidth: 640 }}>{p.bio}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <StatCard label="Revenus (réservations)" value={euro(totalRevenue)} icon="euro" />
        <StatCard label="Séances ce mois" value={sessionsThisMonth} icon="calendar" />
        <StatCard label="Note moyenne" value={Number(p.rating ?? 0).toFixed(1)} icon="star" />
        <StatCard label="Avis reçus" value={p.reviews_count ?? 0} icon="message" />
      </div>

      <PractitionerTabs p={p} myBookings={myBookings} myReviews={myReviews} />
    </>
  );
}
