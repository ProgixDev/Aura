'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { relativeFr, downloadCsv } from '@/lib/format';

const KIND_LABEL = {
  moderation: 'Modération', verification: 'Vérification', finance: 'Finance',
  security: 'Sécurité', support: 'Support', system: 'Système',
};
const KIND_TONE = {
  moderation: 'info', verification: 'verified', finance: 'warning',
  security: 'danger', support: 'success', system: 'neutral',
};
const KIND_TONE_AVATAR = {
  moderation: 'sky', verification: 'violet', finance: 'gold',
  security: 'violet', support: 'sage', system: 'sky',
};

export default function AuditPage() {
  const { data, isError } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api.get('/admin/audit-logs?per_page=100'),
  });

  const rows = (data?.data ?? []).map((row) => ({
    id: row.id,
    when: relativeFr(row.created_at),
    who: row.actor?.name ?? 'Système',
    action: row.action,
    target: row.metadata?.target_label || `${row.target_type} #${row.target_id ?? ''}`,
    kind: row.category,
  }));
  const stats = data?.statistiques;

  const exportCsv = async () => {
    const res = await api.get('/admin/audit-logs/export');
    downloadCsv(res.data);
  };

  const columns = [
    { key: 'when', label: 'Quand', render: (a) => <span className="small">{a.when}</span> },
    {
      key: 'who', label: 'Auteur', sortable: true,
      render: (a) => (
        <div className="row gap-2">
          <Avatar name={a.who} tone={KIND_TONE_AVATAR[a.kind]} size={28} />
          <span style={{ fontWeight: 500 }}>{a.who}</span>
        </div>
      ),
    },
    { key: 'action', label: 'Action', render: (a) => <span className="small">{a.action}</span> },
    { key: 'target', label: 'Cible', render: (a) => <span className="table-cell-main">{a.target}</span> },
    { key: 'kind', label: 'Type', render: (a) => <Badge variant={KIND_TONE[a.kind] || 'neutral'} dot>{KIND_LABEL[a.kind] || a.kind}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Journal d’audit"
        subtitle="Toutes les actions sensibles effectuées sur la plateforme."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Audit' }]}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> Exporter</button>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Événements</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.total : '—'}</div><div className="small">récents</div></div>
        <div className="card card-pad"><div className="eyebrow">Sécurité</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.security : '—'}</div><div className="small">alertes</div></div>
        <div className="card card-pad"><div className="eyebrow">Modération</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.moderation : '—'}</div><div className="small">actions</div></div>
        <div className="card card-pad"><div className="eyebrow">Finance</div><div className="h-2" style={{ marginTop: 6 }}>{stats ? stats.finance : '—'}</div><div className="small">opérations</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger le journal d’audit.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={rows}
          searchKeys={['who', 'action', 'target']}
          filters={[
            {
              key: 'kind', label: 'Tous les types',
              options: Object.keys(KIND_LABEL).map((k) => ({ value: k, label: KIND_LABEL[k] })),
            },
          ]}
          searchPlaceholder="Rechercher une action, un auteur…"
          pageSize={10}
        />
      )}
    </>
  );
}
