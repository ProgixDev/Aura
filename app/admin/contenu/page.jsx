'use client';
import { Button } from '@/components/ui/Button';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { blogPosts } from '@/lib/data/content';
import { dateFr } from '@/lib/format';

const CAT_TONE = { Guide: 'info', Discipline: 'featured', Conseils: 'success', 'Communauté': 'warning', 'Bien-être': 'novice' };

export default function AdminContentPage() {
  const rows = blogPosts.map((p) => ({ ...p, status: 'Publié' }));

  const columns = [
    { key: 'title', label: 'Titre', render: (p) => <span className="table-cell-main" style={{ display: 'block', maxWidth: 320 }}>{p.title}</span> },
    { key: 'category', label: 'Catégorie', width: 130, render: (p) => <Badge variant={CAT_TONE[p.category] || 'neutral'}>{p.category}</Badge> },
    { key: 'author', label: 'Auteur', width: 150, render: (p) => <span className="small">{p.author}</span> },
    { key: 'readTime', label: 'Lecture', width: 90, render: (p) => <span className="tiny">{p.readTime}</span> },
    { key: 'date', label: 'Date', width: 120, sortable: true, render: (p) => <span className="small">{dateFr(p.date)}</span> },
    { key: 'status', label: 'Statut', width: 110, render: () => <Badge variant="success" dot>Publié</Badge> },
    {
      key: 'actions', label: '', width: 110,
      render: (p) => (
        <div className="row gap-1">
          <ModalButton modal="editField" payload={{ title: `Modifier « ${p.title} »`, fields: [{ name: 'title', label: 'Titre', type: 'text' }, { name: 'category', label: 'Catégorie', type: 'text' }, { name: 'excerpt', label: 'Extrait', type: 'textarea' }] }} className="btn btn-soft btn-sm btn-icon" title="Modifier">
            <Icon name="edit" size={15} />
          </ModalButton>
          <ModalButton modal="deleteItem" payload={{ title: p.title }} className="btn btn-danger-soft btn-sm btn-icon" title="Supprimer">
            <Icon name="trash" size={15} />
          </ModalButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Journal & contenus"
        subtitle={`${blogPosts.length} articles publiés sur le magazine Aura`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Contenus' }]}
        actions={<Button href="/admin/contenu/nouveau" variant="primary" size="sm"><Icon name="plus" size={15} /> Nouvel article</Button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Articles</div><div className="h-2" style={{ marginTop: 6 }}>{blogPosts.length}</div><div className="small">en ligne</div></div>
        <div className="card card-pad"><div className="eyebrow">Catégories</div><div className="h-2" style={{ marginTop: 6 }}>{new Set(blogPosts.map((p) => p.category)).size}</div><div className="small">thématiques éditoriales</div></div>
        <div className="card card-pad"><div className="eyebrow">Dernière parution</div><div className="h-3" style={{ marginTop: 8 }}>{dateFr(blogPosts[0].date)}</div><div className="small">{blogPosts[0].title}</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['title', 'author', 'category']}
        filters={[
          { key: 'category', label: 'Toutes les catégories', options: [...new Set(blogPosts.map((p) => p.category))].map((c) => ({ value: c, label: c })) },
        ]}
        rowHref={(p) => `/blog/${p.slug}`}
        searchPlaceholder="Rechercher un article…"
        toolbar={<Button href="/admin/contenu/nouveau" variant="soft" size="sm"><Icon name="plus" size={15} /> Nouvel article</Button>}
        pageSize={8}
      />
    </>
  );
}
