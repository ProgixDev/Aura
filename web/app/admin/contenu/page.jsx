'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const CAT_TONE = { Guide: 'info', Discipline: 'featured', Conseils: 'success', 'Communauté': 'warning', 'Bien-être': 'novice' };
const STATUS_TONE = { brouillon: 'neutral', en_revue: 'warning', publié: 'success', archivé: 'neutral' };
const STATUS_OPTIONS = ['brouillon', 'en_revue', 'publié', 'archivé'];

const editFields = (a) => [
  { name: 'titre', label: 'Titre', type: 'text', value: a.titre, required: true },
  { name: 'categorie', label: 'Catégorie', type: 'text', value: a.categorie, required: true },
  { name: 'tonalite', label: 'Tonalité', type: 'text', value: a.tonalite, required: true },
  { name: 'auteur', label: 'Auteur', type: 'text', value: a.auteur, required: true },
  { name: 'temps_lecture', label: 'Temps de lecture (min)', type: 'number', value: a.temps_lecture, required: true },
  { name: 'status', label: 'Statut', type: 'select', options: STATUS_OPTIONS, value: a.status, required: true },
  { name: 'extrait', label: 'Extrait', type: 'textarea', value: a.extrait, required: true },
  { name: 'corps', label: 'Corps', type: 'textarea', value: a.corps, required: true },
];

export default function AdminContentPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'articles'],
    queryFn: () => api.get('/articles?per_page=100'),
  });
  const articles = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/articles/${id}`, { ...values, temps_lecture: Number(values.temps_lecture) }),
    onSuccess: () => { invalidate(); toast('Article mis à jour', 'success'); },
  });
  const publishMutation = useMutation({
    mutationFn: (id) => api.put(`/articles/${id}/publish`),
    onSuccess: () => { invalidate(); toast('Article publié', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const archiveMutation = useMutation({
    mutationFn: (id) => api.put(`/articles/${id}/archive`),
    onSuccess: () => { invalidate(); toast('Article archivé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/articles/${id}`),
    onSuccess: () => { invalidate(); toast('Article supprimé', 'success'); },
  });

  const columns = [
    { key: 'titre', label: 'Titre', render: (a) => <span className="table-cell-main" style={{ display: 'block', maxWidth: 320 }}>{a.titre}</span> },
    { key: 'categorie', label: 'Catégorie', width: 130, render: (a) => <Badge variant={CAT_TONE[a.categorie] || 'neutral'}>{a.categorie}</Badge> },
    { key: 'auteur', label: 'Auteur', width: 150, render: (a) => <span className="small">{a.auteur}</span> },
    { key: 'temps_lecture', label: 'Lecture', width: 90, render: (a) => <span className="tiny">{a.temps_lecture} min</span> },
    { key: 'created_at', label: 'Créé le', width: 120, sortable: true, render: (a) => <span className="small">{dateFr(a.created_at)}</span> },
    { key: 'status', label: 'Statut', width: 120, render: (a) => <Badge variant={STATUS_TONE[a.status] || 'neutral'} dot>{a.status}</Badge> },
    {
      key: 'actions', label: '', width: 190,
      render: (a) => (
        <div className="row gap-1" onClick={(ev) => ev.stopPropagation()}>
          {(a.status === 'brouillon' || a.status === 'en_revue') && (
            <button className="btn btn-soft btn-sm" onClick={() => publishMutation.mutate(a.id)}>Publier</button>
          )}
          {a.status === 'publié' && (
            <button className="btn btn-soft btn-sm" onClick={() => archiveMutation.mutate(a.id)}>Archiver</button>
          )}
          <ModalButton modal="form" payload={{
            title: `Modifier « ${a.titre} »`, fields: editFields(a), submitLabel: 'Enregistrer', successToast: null,
            onSubmit: (values) => updateMutation.mutateAsync({ id: a.id, values }),
          }} className="btn btn-soft btn-sm btn-icon" as="div" title="Modifier">
            <Icon name="edit" size={15} />
          </ModalButton>
          <ModalButton modal="confirm" payload={{
            title: "Supprimer l'article", message: `« ${a.titre} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutateAsync(a.id),
          }} className="btn btn-danger-soft btn-sm btn-icon" as="div" title="Supprimer">
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
        subtitle={isLoading ? 'Chargement…' : `${articles.length} article${articles.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Contenus' }]}
        actions={<Button href="/admin/contenu/nouveau" variant="primary" size="sm"><Icon name="plus" size={15} /> Nouvel article</Button>}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les articles.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={articles}
          searchKeys={['titre', 'auteur', 'categorie']}
          filters={[
            { key: 'categorie', label: 'Toutes les catégories', options: [...new Set(articles.map((a) => a.categorie))].map((c) => ({ value: c, label: c })) },
            { key: 'status', label: 'Tous les statuts', options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })) },
          ]}
          rowHref={(a) => `/blog/${a.slug}`}
          searchPlaceholder="Rechercher un article…"
          toolbar={<Button href="/admin/contenu/nouveau" variant="soft" size="sm"><Icon name="plus" size={15} /> Nouvel article</Button>}
          pageSize={8}
        />
      )}
    </>
  );
}
