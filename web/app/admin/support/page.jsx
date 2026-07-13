'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { tickets } from '@/lib/data/admin';
import { dateFr, tone } from '@/lib/format';

const PRIORITY_TONE = { haute: 'danger', normale: 'warning', basse: 'neutral' };

export default function SupportPage() {
  const open = tickets.filter((t) => t.status === 'open').length;
  const pending = tickets.filter((t) => t.status === 'pending').length;

  const columns = [
    { key: 'ref', label: 'Réf.', sortable: true, render: (t) => <span className="table-cell-main">{t.ref}</span> },
    { key: 'subject', label: 'Sujet', render: (t) => <span style={{ fontWeight: 500 }}>{t.subject}</span> },
    { key: 'from', label: 'Auteur', sortable: true, render: (t) => <span className="small">{t.from}</span> },
    { key: 'channel', label: 'Canal', render: (t) => <Badge variant="neutral">{t.channel}</Badge> },
    { key: 'date', label: 'Date', sortable: true, render: (t) => <span className="small">{dateFr(t.date)}</span> },
    { key: 'priority', label: 'Priorité', render: (t) => <Badge variant={PRIORITY_TONE[t.priority] || 'neutral'} dot>{t.priority}</Badge> },
    { key: 'status', label: 'Statut', render: (t) => <Badge variant={tone(t.status)} dot>{t.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Support"
        subtitle={`${open} ticket${open > 1 ? 's' : ''} ouvert${open > 1 ? 's' : ''} · ${pending} en attente`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Support' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Ouverts</div><div className="h-2" style={{ marginTop: 6 }}>{open}</div><div className="small">à traiter</div></div>
        <div className="card card-pad"><div className="eyebrow">En attente</div><div className="h-2" style={{ marginTop: 6 }}>{pending}</div><div className="small">réponse client</div></div>
        <div className="card card-pad"><div className="eyebrow">Résolus</div><div className="h-2" style={{ marginTop: 6 }}>{tickets.filter((t) => t.status === 'resolved').length}</div><div className="small">cette semaine</div></div>
        <div className="card card-pad"><div className="eyebrow">Délai moyen</div><div className="h-2" style={{ marginTop: 6 }}>3 h 12</div><div className="small">1ère réponse</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={tickets}
        searchKeys={['ref', 'subject', 'from']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [{ value: 'open', label: 'Ouvert' }, { value: 'pending', label: 'En attente' }, { value: 'resolved', label: 'Résolu' }, { value: 'closed', label: 'Clôturé' }] },
          { key: 'priority', label: 'Toutes priorités', options: [{ value: 'haute', label: 'Haute' }, { value: 'normale', label: 'Normale' }, { value: 'basse', label: 'Basse' }] },
        ]}
        rowHref={(t) => `/admin/support/${t.id}`}
        searchPlaceholder="Rechercher un ticket…"
        pageSize={8}
      />
    </>
  );
}
