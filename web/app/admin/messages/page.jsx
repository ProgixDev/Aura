'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { conversations } from '@/lib/data/messages';

const KIND_TONE = { praticien: 'info', cercle: 'featured' };

export default function AdminMessagesPage() {
  // flag the conversation referenced by reports for safety review
  const rows = conversations.map((c, i) => ({ ...c, flagged: i === 0 }));
  const flagged = rows.filter((c) => c.flagged).length;

  const columns = [
    {
      key: 'name', label: 'Conversation',
      render: (c) => (
        <div className="row gap-2">
          <Avatar src={c.photo} name={c.name} size={32} tone={c.tone} online={c.online} />
          <div>
            <div className="table-cell-main">{c.name}</div>
            <div className="tiny">{c.kind === 'cercle' ? 'Groupe communautaire' : 'Échange praticien · client'}</div>
          </div>
        </div>
      ),
    },
    { key: 'preview', label: 'Dernier message', render: (c) => <span className="small" style={{ display: 'block', maxWidth: 340 }}>{c.preview}</span> },
    { key: 'kind', label: 'Type', width: 110, render: (c) => <Badge variant={KIND_TONE[c.kind] || 'neutral'}>{c.kind}</Badge> },
    { key: 'when', label: 'Activité', width: 100, render: (c) => <span className="tiny">{c.when}</span> },
    {
      key: 'flagged', label: 'État', width: 120,
      render: (c) => c.flagged
        ? <Badge variant="danger" dot>signalé</Badge>
        : <Badge variant="success">sain</Badge>,
    },
    { key: 'go', label: '', width: 50, render: () => <Icon name="chevronRight" size={16} color="var(--muted)" /> },
  ];

  return (
    <>
      <PageHead
        title="Surveillance des messages"
        subtitle={`${conversations.length} conversations actives · ${flagged} en revue`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération' }, { label: 'Messages' }]}
      />

      <div className="note tint-violet" style={{ marginBottom: 22 }}>
        <div className="row gap-2"><Icon name="shield" size={16} color="var(--violet-2)" /><strong>Confidentialité & sécurité.</strong></div>
        <p className="small" style={{ marginTop: 6 }}>
          L'accès au contenu des conversations est <span className="serif italic accent">strictement réservé</span> à la modération et journalisé. Il n'est ouvert qu'en cas de signalement ou de suspicion de paiement hors plateforme. Toute consultation est tracée dans le journal d'audit.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['name', 'preview']}
        filters={[
          { key: 'kind', label: 'Tous les types', options: [
            { value: 'praticien', label: 'Praticien' },
            { value: 'cercle', label: 'Cercle' },
          ] },
        ]}
        rowHref={(c) => `/admin/message/${c.id}`}
        searchPlaceholder="Rechercher une conversation…"
        pageSize={10}
      />
    </>
  );
}
