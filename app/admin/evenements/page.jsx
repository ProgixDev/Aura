'use client';
import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { events } from '@/lib/data/events';

export default function AdminEventsPage() {
  const totalSeats = events.reduce((s, e) => s + e.seats, 0);
  const totalLeft = events.reduce((s, e) => s + e.seatsLeft, 0);
  const filled = totalSeats - totalLeft;

  const rows = events.map((e) => ({ ...e, kindShort: e.kind.split(' · ')[0] }));

  const columns = [
    { key: 'title', label: 'Événement', sortable: true, render: (e) => (
      <div>
        <div className="row gap-2" style={{ fontWeight: 500 }}>
          <span className={`kpi-dot`} style={{ background: `var(--${e.tone}-2)` }} />{e.title}
        </div>
        <div className="tiny">{e.kind}</div>
      </div>
    ) },
    { key: 'kindShort', label: 'Type', render: (e) => <Badge variant="neutral">{e.kindShort}</Badge> },
    { key: 'when', label: 'Quand', render: (e) => <span className="small">{e.when}</span> },
    { key: 'where', label: 'Lieu', sortable: true, render: (e) => <span className="row gap-1 small"><Icon name="pin" size={13} color="var(--muted)" />{e.where}</span> },
    { key: 'seatsLeft', label: 'Places', sortable: true, render: (e) => (
      <span className="small"><strong>{e.seats - e.seatsLeft}</strong> / {e.seats} {e.seatsLeft <= 3 && <Badge variant="warning">{e.seatsLeft} restantes</Badge>}</span>
    ) },
    { key: 'price', label: 'Prix', render: (e) => <span className="small">{e.price}</span> },
  ];

  return (
    <>
      <PageHead
        title="Événements"
        subtitle={`${events.length} événements programmés · ${filled} places réservées`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements' }]}
        actions={<Link href="/admin/evenement/nouveau" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouvel événement</Link>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Programmés</div><div className="h-2" style={{ marginTop: 6 }}>{events.length}</div><div className="small">événements à venir</div></div>
        <div className="card card-pad"><div className="eyebrow">Places totales</div><div className="h-2" style={{ marginTop: 6 }}>{totalSeats}</div><div className="small">capacité cumulée</div></div>
        <div className="card card-pad"><div className="eyebrow">Réservées</div><div className="h-2" style={{ marginTop: 6 }}>{filled}</div><div className="small">inscriptions confirmées</div></div>
        <div className="card card-pad"><div className="eyebrow">Restantes</div><div className="h-2" style={{ marginTop: 6 }}>{totalLeft}</div><div className="small">places disponibles</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['title', 'where']}
        filters={[
          { key: 'kindShort', label: 'Tous les types', options: [
            { value: 'RETRAITE', label: 'Retraite' }, { value: 'ÉVÉNEMENT', label: 'Événement' },
            { value: 'FORMATION', label: 'Formation' }, { value: 'CERCLE', label: 'Cercle' },
            { value: 'ATELIER', label: 'Atelier' }, { value: 'SORTIE', label: 'Sortie' },
          ] },
        ]}
        rowHref={(e) => `/admin/evenement/${e.id}`}
        searchPlaceholder="Rechercher un événement, un lieu…"
        pageSize={8}
      />
    </>
  );
}
