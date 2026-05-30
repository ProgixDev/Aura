'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { clients } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminClientsPage() {
  const active = clients.filter((c) => c.status === 'active').length;
  const totalSpent = clients.reduce((s, c) => s + (c.spent || 0), 0);
  const totalBookings = clients.reduce((s, c) => s + (c.bookings || 0), 0);

  const columns = [
    {
      key: 'name', label: 'Client', sortable: true,
      render: (c) => (
        <div className="row gap-3">
          <Avatar name={c.name} tone={c.tone} size={36} />
          <div><div style={{ fontWeight: 500 }}>{c.name}</div><div className="tiny">{c.city}</div></div>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (c) => <span className="small">{c.email}</span> },
    { key: 'city', label: 'Ville', sortable: true },
    { key: 'joined', label: 'Inscrit le', sortable: true, render: (c) => <span className="small">{dateFr(c.joined)}</span> },
    { key: 'bookings', label: 'Réservations', sortable: true, render: (c) => <span>{c.bookings}</span> },
    { key: 'spent', label: 'Dépensé', sortable: true, render: (c) => <strong>{euro(c.spent)}</strong> },
    { key: 'status', label: 'Statut', render: (c) => <Badge variant={tone(c.status)} dot>{c.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Clients"
        subtitle={`${clients.length} clients · ${active} actifs`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Comptes</div><div className="h-2" style={{ marginTop: 6 }}>{clients.length}</div><div className="small">{active} actifs</div></div>
        <div className="card card-pad"><div className="eyebrow">Réservations</div><div className="h-2" style={{ marginTop: 6 }}>{totalBookings}</div><div className="small">toutes périodes confondues</div></div>
        <div className="card card-pad"><div className="eyebrow">Valeur cumulée</div><div className="h-2" style={{ marginTop: 6 }}>{euro(totalSpent)}</div><div className="small">dépensé par les clients</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={clients}
        searchKeys={['name', 'email', 'city']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [{ value: 'active', label: 'Actif' }, { value: 'suspended', label: 'Suspendu' }, { value: 'pending', label: 'En attente' }] },
        ]}
        rowHref={(c) => `/admin/client/${c.id}`}
        searchPlaceholder="Rechercher un client, un email…"
        pageSize={8}
      />
    </>
  );
}
