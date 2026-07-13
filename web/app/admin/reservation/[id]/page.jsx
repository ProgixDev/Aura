import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { bookings, getBooking } from '@/lib/data/admin';
import { getPractitioner } from '@/lib/data/practitioners';
import { getClient } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export function generateStaticParams() {
  return bookings.map((b) => ({ id: b.id }));
}

export default async function AdminReservationDetail({ params }) {
  const { id } = await params;
  const b = getBooking(id);

  if (!b) {
    return (
      <>
        <PageHead title="Réservation introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réservations', href: '/admin/reservations' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Cette réservation n'existe pas.<div className="mt-3"><Link href="/admin/reservations" className="btn btn-soft btn-sm">Retour aux réservations</Link></div></div>
      </>
    );
  }

  const prat = getPractitioner(b.practitionerId);
  const client = getClient(b.clientId);
  const fee = Math.round(b.price * 0.15);
  const net = b.price - fee;

  const timeline = [
    { label: 'Réservation créée', when: dateFr(b.date), done: true, tone: 'sky' },
    { label: 'Paiement confirmé', when: dateFr(b.date), done: b.status !== 'pending', tone: 'sage' },
    { label: 'Séance', when: `${dateFr(b.date)} · ${b.slot}`, done: b.status === 'completed', tone: 'violet' },
    { label: b.status === 'cancelled' ? 'Réservation annulée' : 'Séance terminée', when: b.status === 'completed' ? dateFr(b.date) : '—', done: b.status === 'completed' || b.status === 'cancelled', tone: b.status === 'cancelled' ? 'gold' : 'sage' },
  ];

  return (
    <>
      <PageHead
        title={b.ref}
        subtitle={`${b.discipline} · ${dateFr(b.date)} à ${b.slot}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réservations', href: '/admin/reservations' }, { label: b.ref }]}
        actions={<>
          <Badge variant={tone(b.status)} dot>{b.status}</Badge>
          <ModalButton modal="reschedule" payload={{ name: b.ref }} className="btn btn-soft btn-sm"><Icon name="calendar" size={15} /> Reprogrammer</ModalButton>
          <ModalButton modal="refund" payload={{ ref: b.ref, amount: b.price }} className="btn btn-soft btn-sm"><Icon name="euro" size={15} /> Rembourser</ModalButton>
          <ModalButton modal="cancelBooking" payload={{ name: b.ref }} className="btn btn-danger-soft btn-sm"><Icon name="x" size={15} /> Annuler</ModalButton>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          {/* Timeline */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 18 }}>Suivi de la réservation</h3>
            <div className="stack gap-4">
              {timeline.map((t, i) => (
                <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span className="kpi-dot" style={{ marginTop: 5, background: t.done ? `var(--${t.tone}-2)` : 'var(--line)' }} />
                  <div className="flex-1">
                    <div className="row gap-2" style={{ fontWeight: 500, fontSize: 14 }}>
                      {t.label}
                      {t.done && <Icon name="check" size={13} color="var(--sage-2)" />}
                    </div>
                    <div className="tiny">{t.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Practitioner + client cards */}
          <div className="grid grid-2">
            <div className="card card-pad">
              <div className="eyebrow" style={{ marginBottom: 12 }}>Praticien</div>
              <div className="row gap-3" style={{ marginBottom: 14 }}>
                <Avatar src={prat?.photo} name={prat?.name} tone={prat?.tone} size={52} online={prat?.online} />
                <div>
                  <div className="row gap-2" style={{ fontWeight: 500 }}>{prat?.name}{prat?.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}</div>
                  <div className="tiny">{prat?.specialties?.join(' · ')}</div>
                </div>
              </div>
              <dl className="dl">
                <dt>Ville</dt><dd>{prat?.city}</dd>
                <dt>Email</dt><dd>{prat?.email}</dd>
                <dt>Téléphone</dt><dd>{prat?.phone}</dd>
              </dl>
              <div className="row gap-2 mt-3">
                <Link href={`/admin/praticien/${prat?.id}`} className="btn btn-soft btn-sm">Voir le profil</Link>
                <ModalButton modal="contact" payload={{ name: prat?.name }} className="btn btn-ghost btn-sm"><Icon name="message" size={14} /> Contacter</ModalButton>
              </div>
            </div>

            <div className="card card-pad">
              <div className="eyebrow" style={{ marginBottom: 12 }}>Client</div>
              <div className="row gap-3" style={{ marginBottom: 14 }}>
                <Avatar name={b.clientName} tone={client?.tone} size={52} />
                <div>
                  <div style={{ fontWeight: 500 }}>{b.clientName}</div>
                  <div className="tiny">{client?.city}</div>
                </div>
              </div>
              <dl className="dl">
                <dt>Email</dt><dd>{client?.email}</dd>
                <dt>Réservations</dt><dd>{client?.bookings ?? '—'}</dd>
                <dt>Statut</dt><dd><Badge variant={tone(client?.status)} dot>{client?.status}</Badge></dd>
              </dl>
              <div className="row gap-2 mt-3">
                <Link href={`/admin/client/${client?.id}`} className="btn btn-soft btn-sm">Voir le client</Link>
                <ModalButton modal="contact" payload={{ name: b.clientName }} className="btn btn-ghost btn-sm"><Icon name="message" size={14} /> Contacter</ModalButton>
              </div>
            </div>
          </div>
        </div>

        {/* Side: details + payment */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Détails de la séance</h3>
            <dl className="dl">
              <dt>Référence</dt><dd>{b.ref}</dd>
              <dt>Discipline</dt><dd>{b.discipline}</dd>
              <dt>Date</dt><dd>{dateFr(b.date)}</dd>
              <dt>Créneau</dt><dd>{b.slot}</dd>
              <dt>Mode</dt><dd><Badge variant={b.mode === 'visio' ? 'info' : 'neutral'}>{b.mode}</Badge></dd>
              <dt>Statut</dt><dd><Badge variant={tone(b.status)} dot>{b.status}</Badge></dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Paiement</h3>
            <dl className="dl">
              <dt>Montant</dt><dd><strong>{euro(b.price)}</strong></dd>
              <dt>Commission Aura (15 %)</dt><dd>− {euro(fee)}</dd>
              <dt>Net praticien</dt><dd><strong>{euro(net)}</strong></dd>
            </dl>
            <div className="divider" />
            <div className="between">
              <span className="small muted">Encaissé via</span>
              <span className="small">Carte · Stripe</span>
            </div>
            <ModalButton modal="refund" payload={{ ref: b.ref, amount: b.price }} className="btn btn-danger-soft btn-sm btn-block mt-3"><Icon name="euro" size={14} /> Émettre un remboursement</ModalButton>
          </div>
        </div>
      </div>
    </>
  );
}
