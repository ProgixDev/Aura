'use client';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { transactions } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminPaiementsPage() {
  const volume = transactions.reduce((s, t) => s + t.gross, 0);
  const fees = transactions.reduce((s, t) => s + t.fee, 0);
  const net = transactions.reduce((s, t) => s + t.net, 0);

  const columns = [
    { key: 'ref', label: 'Réf.', sortable: true, render: (r) => <span className="table-cell-main">{r.ref}</span> },
    { key: 'date', label: 'Date', sortable: true, render: (r) => <span className="small">{dateFr(r.date)}</span> },
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'practitionerName', label: 'Praticien', sortable: true },
    { key: 'gross', label: 'Brut', sortable: true, render: (r) => euro(r.gross) },
    { key: 'fee', label: 'Commission', sortable: true, render: (r) => <span className="muted">{euro(r.fee)}</span> },
    { key: 'net', label: 'Net praticien', sortable: true, render: (r) => <strong>{euro(r.net)}</strong> },
    { key: 'method', label: 'Moyen', render: (r) => <Badge variant="neutral">{r.method}</Badge> },
    { key: 'status', label: 'Statut', render: (r) => <Badge variant={tone(r.status)}>{r.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Paiements"
        subtitle="Tous les flux financiers transitant par Aura."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Volume total" value={euro(volume)} delta="+8,2%" deltaDir="up" icon="euro" />
        <StatCard label="Commissions Aura" value={euro(fees)} delta="+6,1%" deltaDir="up" icon="chart" />
        <StatCard label="Net reversé" value={euro(net)} delta="+9,0%" deltaDir="up" icon="card" />
      </div>

      <DataTable
        columns={columns}
        rows={transactions}
        searchKeys={['ref', 'clientName', 'practitionerName']}
        filters={[
          { key: 'status', label: 'Statut', options: [{ value: 'paid', label: 'Payé' }, { value: 'processing', label: 'En cours' }, { value: 'refunded', label: 'Remboursé' }] },
          { key: 'method', label: 'Moyen', options: [{ value: 'Carte', label: 'Carte' }, { value: 'PayPal', label: 'PayPal' }, { value: 'Apple Pay', label: 'Apple Pay' }] },
        ]}
        rowHref={(r) => '/admin/paiement/' + r.id}
        searchPlaceholder="Rechercher une transaction…"
        pageSize={10}
        toolbar={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Export comptable</ModalButton>}
      />
    </>
  );
}
