'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { cercles } from '@/lib/data/admin';
import { num, tone } from '@/lib/format';

export default function AdminCerclesPage() {
  const activeCount = cercles.filter((c) => c.status === 'active').length;
  const totalMembers = cercles.reduce((s, c) => s + c.members, 0);
  const totalPosts = cercles.reduce((s, c) => s + c.posts, 0);

  const columns = [
    {
      key: 'name', label: 'Cercle', sortable: true,
      render: (c) => (
        <div className="row gap-3">
          <span className={`tile-icon glyph-${c.tone}`}><Icon name="users" size={16} /></span>
          <div><div style={{ fontWeight: 500 }}>{c.name}</div><div className="tiny">Animé par {c.lead}</div></div>
        </div>
      ),
    },
    { key: 'members', label: 'Membres', sortable: true, render: (c) => <span>{num(c.members)}</span> },
    { key: 'posts', label: 'Publications', sortable: true, render: (c) => <span>{num(c.posts)}</span> },
    { key: 'lead', label: 'Animateur', render: (c) => <span className="small">{c.lead}</span> },
    { key: 'status', label: 'Statut', render: (c) => <Badge variant={tone(c.status)} dot>{c.status}</Badge> },
  ];

  const createCercle = (
    <ModalButton
      modal="form"
      payload={{
        title: 'Créer un cercle',
        submitLabel: 'Créer le cercle',
        successToast: 'Cercle créé',
        fields: [
          { name: 'name', label: 'Nom du cercle', type: 'text', required: true },
          { name: 'lead', label: 'Animateur', type: 'text', required: true },
          { name: 'tone', label: 'Couleur', type: 'select', options: ['violet', 'sky', 'sage', 'gold'] },
          { name: 'desc', label: 'Description', type: 'textarea' },
        ],
      }}
      className="btn btn-primary btn-sm"
    >
      <Icon name="plus" size={15} /> Créer un cercle
    </ModalButton>
  );

  return (
    <>
      <PageHead
        title="Cercles"
        subtitle={`${cercles.length} cercles · ${activeCount} actifs`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles' }]}
        actions={createCercle}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Communautés</div><div className="h-2" style={{ marginTop: 6 }}>{cercles.length}</div><div className="small">{activeCount} actifs</div></div>
        <div className="card card-pad"><div className="eyebrow">Membres</div><div className="h-2" style={{ marginTop: 6 }}>{num(totalMembers)}</div><div className="small">toutes communautés</div></div>
        <div className="card card-pad"><div className="eyebrow">Publications</div><div className="h-2" style={{ marginTop: 6 }}>{num(totalPosts)}</div><div className="small">échanges partagés</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={cercles}
        searchKeys={['name', 'lead']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [{ value: 'active', label: 'Actif' }, { value: 'archived', label: 'Archivé' }] },
        ]}
        rowHref={(c) => `/admin/cercle/${c.id}`}
        searchPlaceholder="Rechercher un cercle…"
        toolbar={createCercle}
        pageSize={8}
      />
    </>
  );
}
