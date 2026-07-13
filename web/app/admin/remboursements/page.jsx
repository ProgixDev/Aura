'use client';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { refunds } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminRemboursementsPage() {
  const total = refunds.reduce((s, r) => s + r.amount, 0);
  const pending = refunds.filter((r) => r.status === 'pending').length;

  const columns = [
    { key: 'date', label: 'Date', sortable: true, render: (r) => <span className="small">{dateFr(r.date)}</span> },
    { key: 'transactionRef', label: 'Transaction', sortable: true, render: (r) => <span className="table-cell-main">{r.transactionRef}</span> },
    { key: 'clientName', label: 'Client', sortable: true },
    { key: 'amount', label: 'Montant', sortable: true, render: (r) => <strong>{euro(r.amount)}</strong> },
    { key: 'reason', label: 'Motif', render: (r) => <span className="small">{r.reason}</span> },
    { key: 'status', label: 'Statut', render: (r) => <Badge variant={tone(r.status)}>{r.status}</Badge> },
    {
      key: 'actions', label: '', width: 160, render: (r) => (
        r.status === 'pending'
          ? <ModalButton modal="confirm" payload={{ title: 'Approuver le remboursement', message: `Confirmer le remboursement de ${euro(r.amount)} à ${r.clientName} ?`, confirmLabel: 'Approuver', successToast: 'Remboursement approuvé' }} className="btn btn-primary btn-sm">Approuver</ModalButton>
          : <ToastButton message="Reçu de remboursement envoyé" tone="success" className="btn btn-soft btn-sm">Reçu</ToastButton>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Remboursements"
        subtitle="Demandes et historique des remboursements clients."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Remboursements' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Total remboursé" value={euro(total)} icon="euro" />
        <StatCard label="En attente" value={String(pending)} icon="clock" />
        <StatCard label="Taux de remboursement" value="1,4%" delta="-0,3 pt" deltaDir="up" icon="shield" />
      </div>

      <DataTable
        columns={columns}
        rows={refunds}
        searchKeys={['transactionRef', 'clientName', 'reason']}
        filters={[{ key: 'status', label: 'Statut', options: [{ value: 'pending', label: 'En attente' }, { value: 'completed', label: 'Effectué' }] }]}
        searchPlaceholder="Rechercher un remboursement…"
        pageSize={10}
        toolbar={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Export comptable</ModalButton>}
      />
    </>
  );
}
