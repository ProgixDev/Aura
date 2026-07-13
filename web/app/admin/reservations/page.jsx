'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { bookings } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminReservationsPage() {
  const upcoming = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
  const revenue = bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.price, 0);

  const columns = [
    { key: 'ref', label: 'Réf.', sortable: true, render: (b) => <span className="table-cell-main">{b.ref}</span> },
    {
      key: 'practitionerName', label: 'Praticien',
      render: (b) => (
        <div className="row gap-2">
          <Avatar src={b.practitionerPhoto} name={b.practitionerName} size={28} />
          <span>{b.practitionerName}</span>
        </div>
      ),
    },
    { key: 'clientName', label: 'Client' },
    { key: 'discipline', label: 'Discipline', render: (b) => <span className="small">{b.discipline}</span> },
    { key: 'date', label: 'Date', sortable: true, render: (b) => <span className="small">{dateFr(b.date)} · {b.slot}</span> },
    { key: 'mode', label: 'Mode', render: (b) => <Badge variant={b.mode === 'visio' ? 'info' : 'neutral'}>{b.mode}</Badge> },
    { key: 'price', label: 'Montant', sortable: true, render: (b) => <strong>{euro(b.price)}</strong> },
    { key: 'status', label: 'Statut', render: (b) => <Badge variant={tone(b.status)} dot>{b.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Réservations"
        subtitle={`${bookings.length} réservations sur la plateforme`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réservations' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Total</div><div className="h-2" style={{ marginTop: 6 }}>{bookings.length}</div><div className="small">réservations enregistrées</div></div>
        <div className="card card-pad"><div className="eyebrow">À venir</div><div className="h-2" style={{ marginTop: 6 }}>{upcoming}</div><div className="small">confirmées ou en attente</div></div>
        <div className="card card-pad"><div className="eyebrow">Annulées</div><div className="h-2" style={{ marginTop: 6 }}>{cancelled}</div><div className="small">sur la période</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={bookings}
        searchKeys={['ref', 'practitionerName', 'clientName']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [
            { value: 'confirmed', label: 'Confirmée' }, { value: 'completed', label: 'Terminée' },
            { value: 'pending', label: 'En attente' }, { value: 'cancelled', label: 'Annulée' },
          ] },
          { key: 'mode', label: 'Tous les modes', options: [
            { value: 'présentiel', label: 'Présentiel' }, { value: 'visio', label: 'Visio' },
          ] },
        ]}
        rowHref={(b) => `/admin/reservation/${b.id}`}
        searchPlaceholder="Rechercher une réf., un praticien, un client…"
        pageSize={8}
      />
    </>
  );
}
