'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { euro, dateFr, tone } from '@/lib/format';

const PLAN_LABEL = { essentiel: 'Essentiel', pro: 'Pro', premium: 'Premium' };
const STATUT_LABEL = { active: 'actif', past_due: 'impayé', canceled: 'résilié', trialing: 'essai' };

export default function AdminAbonnementsPage() {
  const { data } = useQuery({
    queryKey: ['admin', 'subscriptions'],
    queryFn: () => api.get('/admin/subscriptions?per_page=100'),
  });
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'subscriptions', 'statistics'],
    queryFn: () => api.get('/admin/subscriptions/statistics'),
  });
  const stats = statsData?.data?.general;

  const subscriptions = (data?.data ?? []).map((s) => ({
    ...s,
    praticien_nom: s.praticien ? `${s.praticien.firstname} ${s.praticien.lastname}` : '',
  }));

  const columns = [
    {
      key: 'praticien_nom', label: 'Praticien', sortable: true,
      render: (r) => (
        <div className="row gap-2">
          <Avatar name={r.praticien_nom || '—'} size={28} tone="violet" />
          {r.praticien_nom || '—'}
        </div>
      ),
    },
    { key: 'plan', label: 'Formule', sortable: true, render: (r) => <Badge variant={r.plan === 'premium' ? 'featured' : r.plan === 'pro' ? 'info' : 'neutral'}>{PLAN_LABEL[r.plan] ?? r.plan}</Badge> },
    { key: 'created_at', label: 'Depuis', sortable: true, render: (r) => <span className="small">{dateFr(r.created_at)}</span> },
    { key: 'current_period_end', label: 'Renouvellement', render: (r) => <span className="small">{r.current_period_end ? dateFr(r.current_period_end) : '—'}</span> },
    { key: 'statut', label: 'Statut', render: (r) => <Badge variant={tone(r.statut)}>{STATUT_LABEL[r.statut] ?? r.statut}</Badge> },
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
        <StatCard label="MRR" value={euro(stats?.mrr)} icon="euro" />
        <StatCard label="Abonnés actifs" value={String(stats?.active_count ?? 0)} icon="users" />
        <StatCard label="Revenu annuel projeté" value={euro((stats?.mrr ?? 0) * 12)} icon="chart" />
      </div>

      <DataTable
        columns={columns}
        rows={subscriptions}
        searchKeys={['praticien_nom']}
        filters={[{ key: 'statut', label: 'Statut', options: [
          { value: 'active', label: 'Actif' },
          { value: 'trialing', label: 'Essai' },
          { value: 'past_due', label: 'Impayé' },
          { value: 'canceled', label: 'Résilié' },
        ] }]}
        searchPlaceholder="Rechercher un abonné…"
        pageSize={10}
        toolbar={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Export</ModalButton>}
      />
    </>
  );
}
