'use client';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ModalButton } from '@/components/ui/ModalButton';
import { dateFr, euro, tone } from '@/lib/format';

const STATUS_FR = { confirmed: 'Confirmée', pending: 'En attente', completed: 'Terminée', cancelled: 'Annulée' };

function BookingRow({ b }) {
  const upcoming = b.status === 'confirmed' || b.status === 'pending';
  return (
    <div className="card card-pad">
      <div className="row gap-4 wrap" style={{ alignItems: 'flex-start' }}>
        <Avatar src={b.practitionerPhoto} name={b.practitionerName} size={52} />
        <div className="flex-1">
          <div className="row gap-2" style={{ marginBottom: 3 }}>
            <span className="h-4" style={{ fontWeight: 500 }}>{b.practitionerName}</span>
            <Badge variant={tone(b.status)}>{STATUS_FR[b.status] || b.status}</Badge>
          </div>
          <div className="small" style={{ marginBottom: 8 }}>{b.discipline} · réf. {b.ref}</div>
          <div className="row gap-4 wrap small">
            <span className="row gap-1"><Icon name="calendar" size={13} color="var(--muted)" />{dateFr(b.date)} · {b.slot}</span>
            <span className="row gap-1"><Icon name={b.mode === 'visio' ? 'video' : 'pin'} size={13} color="var(--muted)" />{b.mode}</span>
            <span className="price" style={{ fontSize: 16 }}>{euro(b.price)}</span>
          </div>
        </div>
        <div className="stack gap-2" style={{ minWidth: 160 }}>
          <Button href={`/compte/reservation/${b.id}`} variant="soft" size="sm" block>Détail</Button>
          {upcoming && (
            <>
              <ModalButton modal="reschedule" payload={{ name: b.practitionerName }} className="btn btn-ghost btn-sm btn-block">Reprogrammer</ModalButton>
              <ModalButton modal="cancelBooking" payload={{ name: b.practitionerName }} className="btn btn-danger-soft btn-sm btn-block">Annuler</ModalButton>
            </>
          )}
          {!upcoming && b.status === 'completed' && (
            <ModalButton modal="review" payload={{ name: b.practitionerName }} className="btn btn-ghost btn-sm btn-block">Laisser un avis</ModalButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReservationsBody({ bookings }) {
  const upcoming = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const past = bookings.filter((b) => b.status === 'completed' || b.status === 'cancelled');

  return (
    <Tabs tabs={[{ key: 'a', label: `À venir (${upcoming.length})` }, { key: 'p', label: `Passées (${past.length})` }]}>
      {(active) =>
        active === 'a' ? (
          <div className="stack gap-3 mt-3">
            {upcoming.length ? upcoming.map((b) => <BookingRow key={b.id} b={b} />) : (
              <div className="empty">Aucune séance à venir. <Link className="more" href="/recherche">Trouver un praticien</Link></div>
            )}
          </div>
        ) : (
          <div className="stack gap-3 mt-3">
            {past.map((b) => <BookingRow key={b.id} b={b} />)}
          </div>
        )
      }
    </Tabs>
  );
}
