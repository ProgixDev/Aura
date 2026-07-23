'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { contactRecipient } from '@/lib/adminContact';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { euro, dateFr } from '@/lib/format';

// rendez_vous.statut is French: en_attente|confirme|annule|termine — same vocab
// and tone map as the reservations list + web/app/(site)/compte/reservation/[id].
const STATUT_LABEL = { en_attente: 'En attente', confirme: 'Confirmée', termine: 'Terminée', annule: 'Annulée' };
const STATUT_TONE = { en_attente: 'warning', confirme: 'success', termine: 'neutral', annule: 'danger' };
// paiement.statut vocab — same map as admin/paiement/[id] and admin/client/[id].
const PAIEMENT_TONE = { paid: 'success', en_attente: 'warning', rembourse: 'info' };

export default function AdminReservationDetail() {
  const { id } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'rendez-vous', id],
    queryFn: () => api.get(`/admin/rendez-vous/${id}`),
  });
  const b = data?.data;

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;

  if (isError || !b) {
    return (
      <>
        <PageHead title="Réservation introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réservations', href: '/admin/reservations' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Cette réservation n'existe pas.<div className="mt-3"><Link href="/admin/reservations" className="btn btn-soft btn-sm">Retour aux réservations</Link></div></div>
      </>
    );
  }

  const prat = b.praticien ? mapPraticien(b.praticien) : null;
  const client = b.client;
  const clientName = client ? `${client.firstname} ${client.lastname}` : '—';
  const paiement = b.paiement;

  const timeline = [
    { label: 'Réservation créée', when: dateFr(b.created_at), done: true, tone: 'sky' },
    { label: 'Paiement confirmé', when: paiement ? dateFr(paiement.date_paiement) : '—', done: !!paiement, tone: 'sage' },
    { label: 'Séance', when: dateFr(b.date_heure), done: b.statut === 'termine', tone: 'violet' },
    { label: b.statut === 'annule' ? 'Réservation annulée' : 'Séance terminée', when: b.statut === 'termine' ? dateFr(b.date_heure) : '—', done: b.statut === 'termine' || b.statut === 'annule', tone: b.statut === 'annule' ? 'gold' : 'sage' },
  ];

  return (
    <>
      <PageHead
        title={`RDV-${b.id}`}
        subtitle={`${prat?.specialties?.join(' · ') || 'Séance'} · ${dateFr(b.date_heure)}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réservations', href: '/admin/reservations' }, { label: `RDV-${b.id}` }]}
        actions={<>
          <Badge variant={STATUT_TONE[b.statut] || 'neutral'} dot>{STATUT_LABEL[b.statut] || b.statut}</Badge>
          <ModalButton modal="reschedule" payload={{ name: `RDV-${b.id}` }} className="btn btn-soft btn-sm"><Icon name="calendar" size={15} /> Reprogrammer</ModalButton>
          <ModalButton modal="refund" payload={{ ref: `RDV-${b.id}`, amount: b.tarif }} className="btn btn-soft btn-sm"><Icon name="euro" size={15} /> Rembourser</ModalButton>
          <ModalButton modal="cancelBooking" payload={{ name: `RDV-${b.id}` }} className="btn btn-danger-soft btn-sm"><Icon name="x" size={15} /> Annuler</ModalButton>
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
                <Avatar name={prat?.name} tone={prat?.tone} size={52} />
                <div>
                  <div className="row gap-2" style={{ fontWeight: 500 }}>{prat?.name}{prat?.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}</div>
                  <div className="tiny">{prat?.specialties?.join(' · ')}</div>
                </div>
              </div>
              <dl className="dl">
                <dt>Ville</dt><dd>{prat?.city}</dd>
                <dt>Email</dt><dd>{b.praticien?.email}</dd>
                <dt>Téléphone</dt><dd>{b.praticien?.telephone}</dd>
              </dl>
              <div className="row gap-2 mt-3">
                <Link href={`/admin/praticien/${prat?.id}`} className="btn btn-soft btn-sm">Voir le profil</Link>
                <ModalButton modal="contact" payload={{ name: prat?.name, onSubmit: (values) => contactRecipient('praticien', prat?.id, values) }} className="btn btn-ghost btn-sm"><Icon name="message" size={14} /> Contacter</ModalButton>
              </div>
            </div>

            <div className="card card-pad">
              <div className="eyebrow" style={{ marginBottom: 12 }}>Client</div>
              <div className="row gap-3" style={{ marginBottom: 14 }}>
                <Avatar name={clientName} size={52} />
                <div>
                  <div style={{ fontWeight: 500 }}>{clientName}</div>
                  <div className="tiny">{client?.city}</div>
                </div>
              </div>
              <dl className="dl">
                <dt>Email</dt><dd>{client?.email}</dd>
              </dl>
              <div className="row gap-2 mt-3">
                <Link href={`/admin/client/${client?.id}`} className="btn btn-soft btn-sm">Voir le client</Link>
                <ModalButton modal="contact" payload={{ name: clientName, onSubmit: (values) => contactRecipient('client', client?.id, values) }} className="btn btn-ghost btn-sm"><Icon name="message" size={14} /> Contacter</ModalButton>
              </div>
            </div>
          </div>
        </div>

        {/* Side: details + payment */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Détails de la séance</h3>
            <dl className="dl">
              <dt>Référence</dt><dd>RDV-{b.id}</dd>
              <dt>Discipline</dt><dd>{prat?.specialties?.join(' · ') || '—'}</dd>
              <dt>Date</dt><dd>{dateFr(b.date_heure)}</dd>
              <dt>Durée</dt><dd>{b.duree_minutes} min</dd>
              <dt>Mode</dt><dd><Badge variant={b.mode === 'visio' ? 'info' : 'neutral'}>{b.mode}</Badge></dd>
              <dt>Statut</dt><dd><Badge variant={STATUT_TONE[b.statut] || 'neutral'} dot>{STATUT_LABEL[b.statut] || b.statut}</Badge></dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Paiement</h3>
            {paiement ? (
              <>
                <dl className="dl">
                  <dt>Référence</dt><dd>{paiement.reference}</dd>
                  <dt>Montant brut</dt><dd><strong>{euro(paiement.montant_brut)}</strong></dd>
                  <dt>Commission GuériEnergies</dt><dd>− {euro(paiement.commission)}</dd>
                  <dt>Net praticien</dt><dd><strong>{euro(paiement.montant_net_praticien)}</strong></dd>
                  <dt>Moyen</dt><dd><Badge variant="neutral">{paiement.moyen_paiement}</Badge></dd>
                  <dt>Statut</dt><dd><Badge variant={PAIEMENT_TONE[paiement.statut] || 'neutral'}>{paiement.statut}</Badge></dd>
                </dl>
                <div className="divider" />
                <ModalButton modal="refund" payload={{ ref: `RDV-${b.id}`, amount: b.tarif }} className="btn btn-danger-soft btn-sm btn-block mt-3"><Icon name="euro" size={14} /> Émettre un remboursement</ModalButton>
              </>
            ) : (
              <p className="small muted">Aucun paiement enregistré pour cette réservation — montant dû : <strong>{euro(b.tarif)}</strong>.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
