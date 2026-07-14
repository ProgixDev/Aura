'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const EVENT_TYPES = ['Retraite', 'Événement', 'Formation', 'Cercle', 'Atelier', 'Sortie'];
const STATUS_TONE = { brouillon: 'neutral', publié: 'success', archivé: 'neutral' };

function whenLabel(dates) {
  if (!dates?.length) return '—';
  return dates.length === 1 ? dateFr(dates[0]) : `${dateFr(dates[0])} – ${dateFr(dates[dates.length - 1])}`;
}

export default function AdminEventsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => api.get('/events?per_page=100'),
  });
  const events = data?.data ?? [];
  const totalSeats = events.reduce((s, e) => s + (e.nombre_places || 0), 0);

  const columns = [
    { key: 'titre', label: 'Événement', sortable: true, render: (e) => (
      <div>
        <div style={{ fontWeight: 500 }}>{e.titre}</div>
        <div className="tiny">{e.type}</div>
      </div>
    ) },
    { key: 'type', label: 'Type', render: (e) => <Badge variant="neutral">{e.type}</Badge> },
    { key: 'when', label: 'Quand', render: (e) => <span className="small">{whenLabel(e.dates)}</span> },
    { key: 'lieu', label: 'Lieu', sortable: true, render: (e) => <span className="row gap-1 small"><Icon name="pin" size={13} color="var(--muted)" />{e.lieu}</span> },
    { key: 'nombre_places', label: 'Places', sortable: true, render: (e) => <span className="small">{e.nombre_places}</span> },
    { key: 'prix', label: 'Prix', sortable: true, render: (e) => <span className="small">{euro(e.prix)}</span> },
    { key: 'status', label: 'Statut', render: (e) => <Badge variant={STATUS_TONE[e.status] || 'neutral'} dot>{e.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Événements"
        subtitle={isLoading ? 'Chargement…' : `${events.length} événements · ${totalSeats} places au total`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements' }]}
        actions={<Link href="/admin/evenement/nouveau" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouvel événement</Link>}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les événements.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={events}
          searchKeys={['titre', 'lieu']}
          filters={[{ key: 'type', label: 'Tous les types', options: EVENT_TYPES.map((t) => ({ value: t, label: t })) }]}
          rowHref={(e) => `/admin/evenement/${e.id}`}
          searchPlaceholder="Rechercher un événement, un lieu…"
          pageSize={8}
        />
      )}
    </>
  );
}
