import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { bookings, getBooking } from '@/lib/data/admin';
import { getPractitioner } from '@/lib/data/practitioners';
import { dateFr, euro, tone } from '@/lib/format';

const STATUS_FR = { confirmed: 'Confirmée', pending: 'En attente', completed: 'Terminée', cancelled: 'Annulée' };

export function generateStaticParams() {
  return bookings.map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const b = getBooking(id);
  return { title: b ? `Réservation ${b.ref} — AURA` : 'Réservation — AURA' };
}

export default async function ReservationDetail({ params }) {
  const { id } = await params;
  const b = getBooking(id);
  if (!b) notFound();
  const prat = getPractitioner(b.practitionerId);
  const upcoming = b.status === 'confirmed' || b.status === 'pending';
  const fee = Math.round(b.price * 0.0);

  return (
    <div className="stack gap-5">
      <nav className="crumbs">
        <Link href="/compte">Mon espace</Link>
        <Icon name="chevronRight" size={13} color="var(--muted)" />
        <Link href="/compte/reservations">Réservations</Link>
        <Icon name="chevronRight" size={13} color="var(--muted)" />
        <span>{b.ref}</span>
      </nav>

      <header className="row between wrap gap-3">
        <div>
          <h1 className="h-1">Séance · {prat.specialties[0]}</h1>
          <p className="lead" style={{ marginTop: 4 }}>Référence <span className="serif italic accent">{b.ref}</span></p>
        </div>
        <Badge variant={tone(b.status)}>{STATUS_FR[b.status] || b.status}</Badge>
      </header>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack gap-4">
          {/* Récapitulatif séance */}
          <section className="card card-pad">
            <h2 className="h-3 mb-3">Récapitulatif</h2>
            <dl className="dl">
              <dt>Discipline</dt><dd>{prat.specialties.join(' · ')}</dd>
              <dt>Date</dt><dd>{dateFr(b.date)} · {b.slot}</dd>
              <dt>Durée</dt><dd>{prat.duration} min</dd>
              <dt>Format</dt><dd className="row gap-1"><Icon name={b.mode === 'visio' ? 'video' : 'pin'} size={13} color="var(--muted)" />{b.mode}</dd>
              <dt>Lieu</dt><dd>{b.mode === 'visio' ? 'Lien visio envoyé par message' : `${prat.city}, ${prat.region}`}</dd>
            </dl>
          </section>

          {/* Praticien */}
          <section className="card card-pad">
            <h2 className="h-3 mb-3">Votre praticien</h2>
            <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
              <Avatar src={prat.photo} name={prat.name} tone={prat.tone} size={56} online={prat.online} />
              <div className="flex-1">
                <div className="row gap-2"><span className="h-4" style={{ fontWeight: 500 }}>{prat.name}</span>{prat.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}</div>
                <div className="small" style={{ marginBottom: 6 }}>{prat.level} · {prat.city}</div>
                <Rating value={prat.rating} count={prat.reviews} size={13} />
              </div>
            </div>
            <div className="row gap-2 mt-3 wrap">
              <Button href={`/praticien/${prat.id}`} variant="ghost" size="sm">Voir le profil</Button>
              <ModalButton modal="contact" payload={{ name: prat.name }} className="btn btn-soft btn-sm">Contacter</ModalButton>
            </div>
          </section>
        </div>

        <div className="stack gap-4">
          {/* Paiement */}
          <section className="card card-pad">
            <h2 className="h-3 mb-3">Paiement</h2>
            <dl className="dl">
              <dt>Séance</dt><dd>{euro(b.price)}</dd>
              <dt>Frais de service</dt><dd>{euro(fee)}</dd>
              <dt>Moyen de paiement</dt><dd>Carte ···· 4242</dd>
              <dt>Statut</dt><dd><Badge variant={b.status === 'cancelled' ? 'danger' : 'success'}>{b.status === 'cancelled' ? 'Remboursé' : 'Payé'}</Badge></dd>
            </dl>
            <div className="divider" />
            <div className="between">
              <span className="small" style={{ fontWeight: 500 }}>Total</span>
              <span className="price" style={{ fontSize: 22 }}>{euro(b.price + fee)}</span>
            </div>
            <ToastButton message="Facture téléchargée (PDF)" className="btn btn-soft btn-block mt-3">
              <Icon name="download" size={15} /> Télécharger la facture
            </ToastButton>
          </section>

          {/* Actions */}
          <section className="card card-pad stack gap-2">
            {upcoming ? (
              <>
                <ModalButton modal="reschedule" payload={{ name: prat.name }} className="btn btn-primary btn-block">Reprogrammer la séance</ModalButton>
                <ModalButton modal="cancelBooking" payload={{ name: prat.name }} className="btn btn-danger-soft btn-block">Annuler la séance</ModalButton>
              </>
            ) : b.status === 'completed' ? (
              <ModalButton modal="review" payload={{ name: prat.name }} className="btn btn-primary btn-block">Laisser un avis</ModalButton>
            ) : (
              <Button href="/recherche" variant="primary" block>Réserver à nouveau</Button>
            )}
          </section>

          <div className="note">
            <Icon name="shield" size={15} color="var(--violet-2)" /> Annulation gratuite jusqu'à 24h avant la séance.
          </div>
        </div>
      </div>
    </div>
  );
}
