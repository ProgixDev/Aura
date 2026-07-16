'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Rating } from '@/components/ui/Rating';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { dateFr, euro } from '@/lib/format';

// rendez_vous.statut is French: en_attente|confirme|annule|termine.
const STATUT_LABEL = { en_attente: 'En attente', confirme: 'Confirmée', termine: 'Terminée', annule: 'Annulée' };
const STATUT_TONE = { en_attente: 'warning', confirme: 'success', termine: 'neutral', annule: 'danger' };

export default function ReservationDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rendez-vous-client', id],
    queryFn: () => api.get(`/rendez-vous/client/${id}`),
  });

  if (!isLoading && !data?.data) {
    return (
      <section className="section">
        <div className="container-narrow center">
          <h1 className="h-2">Réservation introuvable</h1>
          <p className="lead mt-2">Cette réservation n’existe pas ou ne vous appartient pas.</p>
          <Link href="/compte/reservations" className="btn btn-primary mt-4">Retour à mes réservations</Link>
        </div>
      </section>
    );
  }
  if (!data?.data) return null;

  const b = data.data;
  const prat = mapPraticien(b.praticien);
  const upcoming = b.statut === 'confirme' || b.statut === 'en_attente';

  return (
    <div className="stack gap-5">
      <nav className="crumbs">
        <Link href="/compte">Mon espace</Link>
        <Icon name="chevronRight" size={13} color="var(--muted)" />
        <Link href="/compte/reservations">Réservations</Link>
        <Icon name="chevronRight" size={13} color="var(--muted)" />
        <span>RDV-{b.id}</span>
      </nav>

      <header className="row between wrap gap-3">
        <div>
          <h1 className="h-1">Séance · {prat.specialties[0]}</h1>
          <p className="lead" style={{ marginTop: 4 }}>Référence <span className="serif italic accent">RDV-{b.id}</span></p>
        </div>
        <Badge variant={STATUT_TONE[b.statut] || 'neutral'}>{STATUT_LABEL[b.statut] || b.statut}</Badge>
      </header>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack gap-4">
          {/* Récapitulatif séance */}
          <section className="card card-pad">
            <h2 className="h-3 mb-3">Récapitulatif</h2>
            <dl className="dl">
              <dt>Discipline</dt><dd>{prat.specialties.join(' · ')}</dd>
              <dt>Date</dt><dd>{dateFr(b.date_heure)}</dd>
              <dt>Durée</dt><dd>{b.duree_minutes} min</dd>
              <dt>Format</dt><dd className="row gap-1"><Icon name={b.mode === 'visio' ? 'video' : 'pin'} size={13} color="var(--muted)" />{b.mode}</dd>
              <dt>Lieu</dt><dd>{b.mode === 'visio' ? 'Lien visio envoyé par message' : prat.city}</dd>
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
              {/* Same contract as praticien/[id]/page.jsx's "Contacter" button: creates
                  (or reuses) the conversation, then navigates to it. */}
              <ModalButton
                modal="contact"
                payload={{
                  name: prat.name,
                  onSubmit: async (values) => {
                    const res = await api.post('/client/conversations', {
                      praticien_id: Number(prat.id),
                      text: values.message,
                    });
                    router.push(`/compte/message/${res.data.conversation.id}`);
                  },
                }}
                className="btn btn-soft btn-sm"
              >Contacter</ModalButton>
            </div>
          </section>
        </div>

        <div className="stack gap-4">
          {/* Paiement */}
          <section className="card card-pad">
            <h2 className="h-3 mb-3">Paiement</h2>
            <dl className="dl">
              <dt>Séance</dt><dd>{euro(b.tarif)}</dd>
              <dt>Statut</dt><dd><Badge variant={b.statut === 'annule' ? 'danger' : 'success'}>{b.statut === 'annule' ? 'Remboursé' : 'Payé'}</Badge></dd>
            </dl>
            <div className="divider" />
            <div className="between">
              <span className="small" style={{ fontWeight: 500 }}>Total</span>
              <span className="price" style={{ fontSize: 22 }}>{euro(b.tarif)}</span>
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
                <ModalButton
                  modal="cancelBooking"
                  payload={{
                    name: prat.name,
                    onConfirm: async () => {
                      await api.post(`/rendez-vous/client/${b.id}/cancel`);
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ['rendez-vous-client', id] }),
                        queryClient.invalidateQueries({ queryKey: ['rendez-vous-client'] }),
                      ]);
                    },
                  }}
                  className="btn btn-danger-soft btn-block"
                >Annuler la séance</ModalButton>
              </>
            ) : b.statut === 'termine' ? (
              <ModalButton
                modal="review"
                payload={{
                  name: prat.name,
                  onSubmit: async (values) => {
                    await api.post('/client/avis', {
                      praticien_id: b.praticien.id,
                      note: Number(values.rating) || 5,
                      avis: values.text,
                    });
                    await queryClient.invalidateQueries({ queryKey: ['mes-avis'] });
                  },
                }}
                className="btn btn-primary btn-block"
              >Laisser un avis</ModalButton>
            ) : (
              <Button href="/praticiens" variant="primary" block>Réserver à nouveau</Button>
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
