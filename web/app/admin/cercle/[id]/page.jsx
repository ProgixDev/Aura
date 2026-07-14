'use client';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { useUI } from '@/lib/store';
import { dateFr } from '@/lib/format';

const cercleFields = (c) => [
  { name: 'nom', label: 'Nom du cercle', type: 'text', value: c?.nom, required: true },
  { name: 'animateur', label: 'Animateur', type: 'text', value: c?.animateur },
  { name: 'color', label: 'Couleur', type: 'color', value: c?.color || '#7B5FCF' },
  { name: 'description', label: 'Description', type: 'textarea', value: c?.description },
];

export default function CercleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'cercles', id],
    queryFn: () => api.get(`/cercles/${id}`),
  });
  const c = data?.data;

  const updateMutation = useMutation({
    mutationFn: (values) => api.put(`/cercles/${id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cercles', id] });
      toast('Cercle mis à jour', 'success');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/cercles/${id}`),
    onSuccess: () => { toast('Cercle supprimé', 'success'); router.push('/admin/cercles'); },
  });

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !c) {
    return (
      <>
        <PageHead title="Cercle introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles', href: '/admin/cercles' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun cercle ne correspond à cet identifiant.</div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title={c.nom}
        subtitle={c.animateur ? `Animé par ${c.animateur}` : 'Aucun animateur assigné'}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles', href: '/admin/cercles' }, { label: c.nom }]}
        actions={<>
          <ModalButton modal="form" payload={{
            title: 'Modifier le cercle', fields: cercleFields(c), submitLabel: 'Enregistrer', successToast: null,
            onSubmit: (values) => updateMutation.mutateAsync(values),
          }} className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Modifier</ModalButton>
          <ModalButton modal="confirm" payload={{
            title: 'Supprimer le cercle', message: `« ${c.nom} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutateAsync(),
          }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={15} /> Supprimer</ModalButton>
        </>}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <span className="tile-icon" style={{ width: 64, height: 64, background: c.color || 'var(--violet-2)' }}><Icon name="users" size={26} color="#fff" /></span>
          <div className="flex-1">
            <h2 className="h-3" style={{ marginBottom: 4 }}>{c.nom}</h2>
            <p className="small" style={{ maxWidth: 600 }}>{c.description || 'Aucune description.'}</p>
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="h-4" style={{ marginBottom: 16 }}>Informations</h3>
        <dl className="dl">
          <dt>Identifiant</dt><dd>{c.id}</dd>
          <dt>Animateur</dt><dd>{c.animateur || '—'}</dd>
          <dt>Couleur</dt><dd>
            <span className="row gap-2">
              <span style={{ width: 16, height: 16, borderRadius: 4, display: 'inline-block', background: c.color || 'var(--violet-2)' }} />
              {c.color || '—'}
            </span>
          </dd>
          <dt>Créé le</dt><dd>{dateFr(c.created_at)}</dd>
        </dl>
      </div>
    </>
  );
}
