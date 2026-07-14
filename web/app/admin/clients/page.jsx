'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

export default function AdminClientsPage() {
  const { data, isError } = useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: () => api.get('/clients?per_page=100'),
  });
  const clients = data?.data ?? [];

  const columns = [
    { key: 'firstname', label: 'Client', sortable: true, render: (c) => (
      <div className="row gap-3">
        <Avatar name={`${c.firstname} ${c.lastname}`} size={36} />
        <div><div style={{ fontWeight: 500 }}>{c.firstname} {c.lastname}</div><div className="tiny">{c.city}</div></div>
      </div>
    ) },
    { key: 'email', label: 'Email', render: (c) => <span className="small">{c.email}</span> },
    { key: 'city', label: 'Ville', sortable: true },
    { key: 'created_at', label: 'Inscrit le', sortable: true, render: (c) => <span className="small">{dateFr(c.created_at)}</span> },
  ];

  return (
    <>
      <PageHead
        title="Clients"
        subtitle={`${clients.length} client${clients.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients' }]}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les clients.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={clients}
          searchKeys={['firstname', 'lastname', 'email', 'city']}
          rowHref={(c) => `/admin/client/${c.id}`}
          searchPlaceholder="Rechercher un client, un email…"
          pageSize={8}
        />
      )}
    </>
  );
}
