'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const cercleFields = (c) => [
  { name: 'nom', label: 'Nom du cercle', type: 'text', value: c?.nom, required: true },
  { name: 'animateur', label: 'Animateur', type: 'text', value: c?.animateur },
  { name: 'color', label: 'Couleur', type: 'color', value: c?.color || '#7B5FCF' },
  { name: 'description', label: 'Description', type: 'textarea', value: c?.description },
];

export default function AdminCerclesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'cercles'],
    queryFn: () => api.get('/cercles?per_page=100'),
  });
  const cercles = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'cercles'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/cercles', values),
    onSuccess: () => { invalidate(); toast('Cercle créé', 'success'); },
  });

  const columns = [
    { key: 'nom', label: 'Cercle', sortable: true, render: (c) => (
      <div className="row gap-3">
        <span className="tile-icon" style={{ background: c.color || 'var(--violet-2)' }}><Icon name="users" size={16} color="#fff" /></span>
        <div>
          <div style={{ fontWeight: 500 }}>{c.nom}</div>
          {c.animateur && <div className="tiny">Animé par {c.animateur}</div>}
        </div>
      </div>
    ) },
    { key: 'description', label: 'Description', render: (c) => <span className="small" style={{ display: 'block', maxWidth: 360 }}>{c.description || '—'}</span> },
    { key: 'created_at', label: 'Créé le', sortable: true, render: (c) => <span className="small">{dateFr(c.created_at)}</span> },
  ];

  const createButton = (
    <ModalButton
      modal="form"
      payload={{
        title: 'Créer un cercle', fields: cercleFields(null),
        submitLabel: 'Créer le cercle', successToast: null,
        onSubmit: (values) => createMutation.mutateAsync(values),
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
        subtitle={isLoading ? 'Chargement…' : `${cercles.length} cercle${cercles.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles' }]}
        actions={createButton}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les cercles.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={cercles}
          searchKeys={['nom', 'animateur']}
          rowHref={(c) => `/admin/cercle/${c.id}`}
          searchPlaceholder="Rechercher un cercle…"
          toolbar={createButton}
          pageSize={8}
        />
      )}
    </>
  );
}
