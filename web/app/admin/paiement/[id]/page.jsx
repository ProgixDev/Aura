import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { transactions, getTransaction, getBooking } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export function generateStaticParams() {
  return transactions.map((t) => ({ id: t.id }));
}

export default async function AdminPaiementDetailPage({ params }) {
  const { id } = await params;
  const tx = getTransaction(id);
  if (!tx) notFound();
  const booking = tx.bookingId ? getBooking(tx.bookingId) : null;

  return (
    <>
      <PageHead
        title={tx.ref}
        subtitle={`Transaction du ${dateFr(tx.date)}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements', href: '/admin/paiements' }, { label: tx.ref }]}
        actions={<>
          <ToastButton message="Reçu téléchargé" tone="success" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Télécharger le reçu</ToastButton>
          {tx.status !== 'refunded' && (
            <ModalButton modal="refund" payload={{ ref: tx.ref, amount: euro(tx.gross) }} className="btn btn-danger-soft btn-sm"><Icon name="arrowLeft" size={15} /> Rembourser</ModalButton>
          )}
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 18 }}>
              <h3 className="h-3">Détail du montant</h3>
              <Badge variant={tone(tx.status)}>{tx.status}</Badge>
            </div>
            <div className="stack gap-3">
              <div className="between"><span className="muted">Montant brut</span><strong>{euro(tx.gross)}</strong></div>
              <div className="between"><span className="muted">Commission Aura (15 %)</span><span style={{ color: 'var(--danger)' }}>− {euro(tx.fee)}</span></div>
              <div className="divider" />
              <div className="between"><span style={{ fontWeight: 500 }}>Net reversé au praticien</span><strong className="h-4">{euro(tx.net)}</strong></div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Parties</h3>
            <div className="dl">
              <dt>Client</dt><dd>{tx.clientName}</dd>
              <dt>Praticien</dt><dd>{tx.practitionerName}</dd>
              <dt>Moyen de paiement</dt><dd><Badge variant="neutral">{tx.method}</Badge></dd>
            </div>
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Informations</h3>
            <div className="dl">
              <dt>Référence</dt><dd>{tx.ref}</dd>
              <dt>Date</dt><dd>{dateFr(tx.date)}</dd>
              <dt>Statut</dt><dd><Badge variant={tone(tx.status)}>{tx.status}</Badge></dd>
            </div>
          </div>

          {booking && (
            <div className="card card-pad">
              <h3 className="h-3" style={{ marginBottom: 12 }}>Réservation liée</h3>
              <Link href={'/admin/reservation/' + booking.id} className="row gap-3 between">
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{booking.ref}</div>
                  <div className="tiny">{booking.discipline} · {dateFr(booking.date)} · {booking.slot}</div>
                </div>
                <Icon name="chevronRight" size={16} color="var(--muted)" />
              </Link>
            </div>
          )}

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Actions</h3>
            <div className="stack gap-2">
              <ToastButton message="Reçu envoyé au client" tone="success" className="btn btn-soft btn-sm btn-block"><Icon name="mail" size={15} /> Renvoyer le reçu</ToastButton>
              {tx.status !== 'refunded' && (
                <ModalButton modal="refund" payload={{ ref: tx.ref, amount: euro(tx.gross) }} className="btn btn-danger-soft btn-sm btn-block">Rembourser la transaction</ModalButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
