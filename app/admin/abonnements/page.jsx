'use client';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { subscriptions } from '@/lib/data/admin';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminAbonnementsPage() {
  const active = subscriptions.filter((s) => s.status === 'active');
  const mrr = subscriptions.reduce((s, sub) => s + (sub.status === 'active' ? sub.price : 0), 0);

  const columns = [
    { key: 'practitionerName', label: 'Praticien', sortable: true, render: (r) => <div className="row gap-2"><Avatar name={r.practitionerName} size={28} tone="violet" />{r.practitionerName}</div> },
    { key: 'plan', label: 'Formule', sortable: true, render: (r) => <Badge variant={r.plan.includes('Premium') ? 'featured' : r.plan.includes('Pro') ? 'info' : 'neutral'}>{r.plan}</Badge> },
    { key: 'price', label: 'Prix', sortable: true, render: (r) => r.price === 0 ? <span className="muted">Gratuit</span> : <strong>{euro(r.price)}<small className="muted"> /mois</small></strong> },
    { key: 'since', label: 'Depuis', sortable: true, render: (r) => <span className="small">{dateFr(r.since)}</span> },
    { key: 'renews', label: 'Renouvellement', render: (r) => <span className="small">{r.renews === '—' ? '—' : dateFr(r.renews)}</span> },
    { key: 'status', label: 'Statut', render: (r) => <Badge variant={tone(r.status)}>{r.status === 'past_due' ? 'impayé' : r.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Abonnements"
        subtitle="Formules praticien et revenus récurrents."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Abonnements' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="MRR" value={euro(mrr)} delta="+4,2%" deltaDir="up" icon="euro" />
        <StatCard label="Abonnés actifs" value={String(active.length)} delta="+2" deltaDir="up" icon="users" />
        <StatCard label="Revenu annuel projeté" value={euro(mrr * 12)} icon="chart" />
      </div>

      <DataTable
        columns={columns}
        rows={subscriptions}
        searchKeys={['practitionerName', 'plan']}
        filters={[{ key: 'status', label: 'Statut', options: [{ value: 'active', label: 'Actif' }, { value: 'past_due', label: 'Impayé' }] }]}
        searchPlaceholder="Rechercher un abonné…"
        pageSize={10}
        toolbar={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Export</ModalButton>}
      />
    </>
  );
}
