'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';

const TONES = ['violet', 'sky', 'sage', 'gold'];

const FIELDS = [
  { name: 'nom', label: 'Nom', type: 'text', required: true },
  { name: 'tonalite', label: 'Tonalité', type: 'select', options: TONES, required: true },
  { name: 'glyphe', label: 'Glyphe', type: 'text', placeholder: '☾', required: true },
  { name: 'accroche', label: 'Accroche', type: 'text', required: true },
];

export default function AdminDisciplinesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const disciplines = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'disciplines'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/disciplines/create-discipline', values),
    onSuccess: () => { invalidate(); toast('Discipline créée', 'success'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/disciplines/${id}`, values),
    onSuccess: () => { invalidate(); toast('Discipline mise à jour', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/disciplines/${id}`),
    onSuccess: () => { invalidate(); toast('Discipline supprimée', 'success'); },
  });

  return (
    <>
      <PageHead
        title="Disciplines"
        subtitle={`${disciplines.length} discipline${disciplines.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Disciplines' }]}
        actions={
          <ModalButton
            modal="form"
            payload={{
              title: 'Nouvelle discipline', fields: FIELDS,
              submitLabel: 'Créer', successToast: null,
              onSubmit: (values) => createMutation.mutateAsync(values),
            }}
            className="btn btn-primary btn-sm"
          >
            <Icon name="plus" size={15} /> Ajouter une discipline
          </ModalButton>
        }
      />

      {isLoading && <div className="empty"><div className="glyph">❍</div>Chargement…</div>}
      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les disciplines.</div>}

      {!isLoading && !isError && (
        <div className="grid grid-3">
          {disciplines.map((d) => (
            <div key={d.id} className="card card-pad card-hover">
              <div className={`tile-icon glyph-${d.tonalite}`} style={{ fontSize: 22 }}>{d.glyphe}</div>
              <h3 className="h-3" style={{ marginTop: 14 }}>{d.nom}</h3>
              <p className="small" style={{ marginTop: 6, minHeight: 38 }}>{d.accroche}</p>
              <div className="row gap-2" style={{ marginTop: 14 }}>
                <ModalButton
                  modal="form"
                  payload={{
                    title: `Modifier « ${d.nom} »`,
                    fields: FIELDS.map((f) => ({ ...f, value: d[f.name] })),
                    submitLabel: 'Enregistrer', successToast: null,
                    onSubmit: (values) => updateMutation.mutateAsync({ id: d.id, values }),
                  }}
                  className="btn btn-soft btn-sm flex-1"
                >
                  <Icon name="edit" size={14} /> Modifier
                </ModalButton>
                <ModalButton
                  modal="confirm"
                  payload={{
                    title: 'Supprimer la discipline',
                    message: `« ${d.nom} » sera définitivement supprimée.`,
                    confirmLabel: 'Supprimer', danger: true, successToast: null,
                    onConfirm: () => deleteMutation.mutateAsync(d.id),
                  }}
                  className="btn btn-danger-soft btn-sm btn-icon" title="Supprimer"
                >
                  <Icon name="trash" size={14} />
                </ModalButton>
              </div>
            </div>
          ))}
          {disciplines.length === 0 && (
            <div className="empty"><div className="glyph">❍</div>Aucune discipline pour l'instant.</div>
          )}
        </div>
      )}
    </>
  );
}
