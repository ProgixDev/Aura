'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { euro, dateFr } from '@/lib/format';

// rendez_vous.statut is French: en_attente|confirme|annule|termine — same vocab
// and tone map as web/app/(site)/compte/reservations/ReservationsBody.jsx.
const STATUT_LABEL = { en_attente: 'En attente', confirme: 'Confirmée', termine: 'Terminée', annule: 'Annulée' };
const STATUT_TONE = { en_attente: 'warning', confirme: 'success', termine: 'neutral', annule: 'danger' };

export default function AdminReservationsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'rendez-vous'],
    queryFn: () => api.get('/admin/rendez-vous?per_page=100'),
  });
  const rows = (data?.data ?? []).map((b) => {
    const prat = b.praticien ? mapPraticien(b.praticien) : null;
    return {
      ...b,
      clientName: b.client ? `${b.client.firstname} ${b.client.lastname}` : '—',
      praticienName: prat?.name ?? '—',
      discipline: prat?.specialties?.join(' · ') || '—',
    };
  });
  const stats = data?.statistiques;

  const columns = [
    { key: 'id', label: 'Réf.', sortable: true, render: (b) => <span className="table-cell-main">RDV-{b.id}</span> },
    {
      key: 'praticienName', label: 'Praticien', sortable: true,
      render: (b) => (
        <div className="row gap-2">
          <Avatar name={b.praticienName} size={28} />
          <span>{b.praticienName}</span>
        </div>
      ),
    },
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'discipline', label: 'Discipline', render: (b) => <span className="small">{b.discipline}</span> },
    { key: 'date_heure', label: 'Date', sortable: true, render: (b) => <span className="small">{dateFr(b.date_heure)}</span> },
    { key: 'mode', label: 'Mode', render: (b) => <Badge variant={b.mode === 'visio' ? 'info' : 'neutral'}>{b.mode}</Badge> },
    { key: 'tarif', label: 'Montant', sortable: true, render: (b) => <strong>{euro(b.tarif)}</strong> },
    { key: 'statut', label: 'Statut', render: (b) => <Badge variant={STATUT_TONE[b.statut] || 'neutral'} dot>{STATUT_LABEL[b.statut] || b.statut}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Réservations"
        subtitle={isLoading ? 'Chargement…' : `${stats?.total ?? rows.length} réservations sur la plateforme`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réservations' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Total</div><div className="h-2" style={{ marginTop: 6 }}>{stats?.total ?? 0}</div><div className="small">réservations enregistrées</div></div>
        <div className="card card-pad"><div className="eyebrow">À venir</div><div className="h-2" style={{ marginTop: 6 }}>{(stats?.en_attente ?? 0) + (stats?.confirme ?? 0)}</div><div className="small">confirmées ou en attente</div></div>
        <div className="card card-pad"><div className="eyebrow">Annulées</div><div className="h-2" style={{ marginTop: 6 }}>{stats?.annule ?? 0}</div><div className="small">sur la période</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les réservations.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={rows}
          searchKeys={['clientName', 'praticienName']}
          filters={[
            { key: 'statut', label: 'Tous les statuts', options: [
              { value: 'confirme', label: 'Confirmée' }, { value: 'termine', label: 'Terminée' },
              { value: 'en_attente', label: 'En attente' }, { value: 'annule', label: 'Annulée' },
            ] },
            { key: 'mode', label: 'Tous les modes', options: [
              { value: 'présentiel', label: 'Présentiel' }, { value: 'visio', label: 'Visio' },
            ] },
          ]}
          rowHref={(b) => `/admin/reservation/${b.id}`}
          searchPlaceholder="Rechercher un praticien, un client…"
          pageSize={8}
        />
      )}
    </>
  );
}
