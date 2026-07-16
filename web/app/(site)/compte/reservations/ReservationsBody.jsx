'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { dateFr, euro } from '@/lib/format';

// rendez_vous.statut is French: en_attente|confirme|annule|termine.
const STATUT_LABEL = { en_attente: 'En attente', confirme: 'Confirmée', termine: 'Terminée', annule: 'Annulée' };
const STATUT_TONE = { en_attente: 'warning', confirme: 'success', termine: 'neutral', annule: 'danger' };

function BookingRow({ rdv }) {
  const queryClient = useQueryClient();
  const prat = mapPraticien(rdv.praticien);
  const upcoming = rdv.statut === 'confirme' || rdv.statut === 'en_attente';
  return (
    <div className="card card-pad">
      <div className="row gap-4 wrap" style={{ alignItems: 'flex-start' }}>
        <Avatar src={prat.photo} name={prat.name} tone={prat.tone} size={52} />
        <div className="flex-1">
          <div className="row gap-2" style={{ marginBottom: 3 }}>
            <span className="h-4" style={{ fontWeight: 500 }}>{prat.name}</span>
            <Badge variant={STATUT_TONE[rdv.statut] || 'neutral'}>{STATUT_LABEL[rdv.statut] || rdv.statut}</Badge>
          </div>
          <div className="small" style={{ marginBottom: 8 }}>{prat.specialties.join(' · ')} · réf. RDV-{rdv.id}</div>
          <div className="row gap-4 wrap small">
            <span className="row gap-1"><Icon name="calendar" size={13} color="var(--muted)" />{dateFr(rdv.date_heure)}</span>
            <span className="row gap-1"><Icon name={rdv.mode === 'visio' ? 'video' : 'pin'} size={13} color="var(--muted)" />{rdv.mode}</span>
            <span className="price" style={{ fontSize: 16 }}>{euro(rdv.tarif)}</span>
          </div>
        </div>
        <div className="stack gap-2" style={{ minWidth: 160 }}>
          <Button href={`/compte/reservation/${rdv.id}`} variant="soft" size="sm" block>Détail</Button>
          {upcoming && (
            <>
              <ModalButton modal="reschedule" payload={{ name: prat.name }} className="btn btn-ghost btn-sm btn-block">Reprogrammer</ModalButton>
              <ModalButton
                modal="cancelBooking"
                payload={{
                  name: prat.name,
                  onConfirm: async () => {
                    await api.post(`/rendez-vous/client/${rdv.id}/cancel`);
                    await queryClient.invalidateQueries({ queryKey: ['rendez-vous-client'] });
                  },
                }}
                className="btn btn-danger-soft btn-sm btn-block"
              >Annuler</ModalButton>
            </>
          )}
          {!upcoming && rdv.statut === 'termine' && (
            <ModalButton
              modal="review"
              payload={{
                name: prat.name,
                onSubmit: async (values) => {
                  await api.post('/client/avis', {
                    praticien_id: rdv.praticien.id,
                    note: Number(values.rating) || 5,
                    avis: values.text,
                  });
                  await queryClient.invalidateQueries({ queryKey: ['mes-avis'] });
                },
              }}
              className="btn btn-ghost btn-sm btn-block"
            >Laisser un avis</ModalButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReservationsBody() {
  const { data: res, isLoading } = useQuery({
    queryKey: ['rendez-vous-client'],
    queryFn: () => api.get('/rendez-vous/client?per_page=100'),
  });
  const bookings = res?.data ?? [];
  const upcoming = bookings.filter((b) => b.statut === 'confirme' || b.statut === 'en_attente');
  const past = bookings.filter((b) => b.statut === 'termine' || b.statut === 'annule');

  if (isLoading) return <div className="empty">Chargement…</div>;

  return (
    <Tabs tabs={[{ key: 'a', label: `À venir (${upcoming.length})` }, { key: 'p', label: `Passées (${past.length})` }]}>
      {(active) =>
        active === 'a' ? (
          <div className="stack gap-3 mt-3">
            {upcoming.length ? upcoming.map((b) => <BookingRow key={b.id} rdv={b} />) : (
              <div className="empty">Aucune séance à venir. <Link className="more" href="/praticiens">Trouver un praticien</Link></div>
            )}
          </div>
        ) : (
          <div className="stack gap-3 mt-3">
            {past.map((b) => <BookingRow key={b.id} rdv={b} />)}
          </div>
        )
      }
    </Tabs>
  );
}
