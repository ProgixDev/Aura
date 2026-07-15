'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

export default function AdminMessagesPage() {
  const { data: res } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => api.get('/admin/conversations?per_page=100'),
  });
  const rows = (res?.data ?? []).map((c) => ({
    ...c,
    moderation_state: c.flagged_count > 0 ? 'signalé' : 'sain',
    client_name: c.client ? `${c.client.firstname} ${c.client.lastname}` : 'Client',
    praticien_name: c.praticien ? `${c.praticien.firstname} ${c.praticien.lastname}` : 'Praticien',
  }));
  const flagged = rows.filter((c) => c.flagged_count > 0).length;

  const columns = [
    {
      key: 'name', label: 'Conversation',
      render: (c) => (
        <div className="row gap-2">
          <Avatar name={c.client_name} size={32} tone="sky" />
          <div>
            <div className="table-cell-main">{c.client_name} <span className="tiny muted">↔</span> {c.praticien_name}</div>
            <div className="tiny">{c.message_count} message{c.message_count > 1 ? 's' : ''}</div>
          </div>
        </div>
      ),
    },
    { key: 'preview', label: 'Dernier message', render: (c) => <span className="small" style={{ display: 'block', maxWidth: 340 }}>{c.last_message?.text ?? '—'}</span> },
    { key: 'when', label: 'Activité', width: 100, render: (c) => <span className="tiny">{dateFr(c.last_message?.created_at ?? c.updated_at)}</span> },
    {
      key: 'moderation_state', label: 'État', width: 130,
      render: (c) => c.flagged_count > 0
        ? <Badge variant="danger" dot>{c.flagged_count} signalé{c.flagged_count > 1 ? 's' : ''}</Badge>
        : <Badge variant="success">sain</Badge>,
    },
    { key: 'go', label: '', width: 50, render: () => <Icon name="chevronRight" size={16} color="var(--muted)" /> },
  ];

  return (
    <>
      <PageHead
        title="Surveillance des messages"
        subtitle={`${rows.length} conversation${rows.length > 1 ? 's' : ''} · ${flagged} en revue`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération' }, { label: 'Messages' }]}
      />

      <div className="note tint-violet" style={{ marginBottom: 22 }}>
        <div className="row gap-2"><Icon name="shield" size={16} color="var(--violet-2)" /><strong>Confidentialité & sécurité.</strong></div>
        <p className="small" style={{ marginTop: 6 }}>
          L'accès au contenu des conversations est <span className="serif italic accent">strictement réservé</span> à la modération. Il n'est ouvert qu'en cas de signalement ou de suspicion de paiement hors plateforme.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['client_name', 'praticien_name']}
        filters={[
          { key: 'moderation_state', label: 'Tous les états', options: [
            { value: 'signalé', label: 'Signalé' },
            { value: 'sain', label: 'Sain' },
          ] },
        ]}
        rowHref={(c) => `/admin/message/${c.id}`}
        searchPlaceholder="Rechercher une conversation…"
        pageSize={10}
      />
    </>
  );
}
