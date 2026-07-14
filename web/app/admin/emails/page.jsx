'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_LABEL = { actif: 'Actif', inactif: 'Inactif', archive: 'Archivé' };
const STATUT_TONE = { actif: 'success', inactif: 'neutral', archive: 'neutral' };

const templateFields = (t) => [
  { name: 'nom', label: 'Nom du modèle', type: 'text', value: t?.nom, required: true },
  { name: 'objet', label: 'Objet', type: 'text', value: t?.objet, required: true },
  { name: 'corps', label: "Corps de l'email", type: 'textarea', value: t?.corps, required: true },
  { name: 'statut', label: 'Statut', type: 'select', options: Object.keys(STATUT_LABEL), value: t?.statut || 'actif' },
];

export default function AdminEmailsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'emails'],
    queryFn: () => api.get('/emails?per_page=100'),
  });
  const templates = data?.data ?? [];
  const active = templates.filter((t) => t.statut === 'actif').length;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'emails'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/emails', values),
    onSuccess: () => { invalidate(); toast('Modèle créé', 'success'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/emails/${id}`, values),
    onSuccess: () => { invalidate(); toast('Modèle mis à jour', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/emails/${id}`),
    onSuccess: () => { invalidate(); toast('Modèle supprimé', 'success'); },
  });

  const columns = [
    { key: 'nom', label: 'Modèle', render: (t) => (
      <div className="row gap-2">
        <span className="tile-icon glyph-violet" style={{ fontSize: 15, width: 30, height: 30 }}><Icon name="mail" size={15} /></span>
        <div>
          <span className="table-cell-main">{t.nom}</span>
          {t.variables?.length > 0 && <div className="tiny muted">{t.variables.map((v) => `{{${v}}}`).join(' ')}</div>}
        </div>
      </div>
    ) },
    { key: 'objet', label: 'Objet', render: (t) => <span className="small" style={{ display: 'block', maxWidth: 320 }}>{t.objet}</span> },
    { key: 'updated_at', label: 'Mis à jour', width: 130, sortable: true, render: (t) => <span className="small">{dateFr(t.updated_at)}</span> },
    { key: 'statut', label: 'Statut', width: 110, render: (t) => <Badge variant={STATUT_TONE[t.statut] || 'neutral'} dot>{STATUT_LABEL[t.statut] || t.statut}</Badge> },
    { key: 'actions', label: '', width: 100, render: (t) => (
      <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
        <ModalButton modal="form" payload={{
          title: `Modifier « ${t.nom} »`, submitLabel: 'Enregistrer', successToast: null,
          fields: templateFields(t),
          onSubmit: (values) => updateMutation.mutateAsync({ id: t.id, values }),
        }} className="btn btn-soft btn-sm btn-icon" as="div" title="Modifier"><Icon name="edit" size={15} /></ModalButton>
        <ModalButton modal="confirm" payload={{
          title: 'Supprimer le modèle', message: `« ${t.nom} » sera archivé (suppression douce).`,
          confirmLabel: 'Supprimer', danger: true, successToast: null,
          onConfirm: () => deleteMutation.mutateAsync(t.id),
        }} className="btn btn-danger-soft btn-sm btn-icon" as="div" title="Supprimer"><Icon name="trash" size={15} /></ModalButton>
      </div>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Modèles d'emails"
        subtitle={`${templates.length} modèles · ${active} actifs`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Emails' }]}
        actions={
          <ModalButton modal="form" payload={{
            title: 'Nouveau modèle', submitLabel: 'Créer le modèle', successToast: null,
            fields: templateFields(null),
            onSubmit: (values) => createMutation.mutateAsync(values),
          }} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> Nouveau modèle
          </ModalButton>
        }
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les modèles.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={templates}
          searchKeys={['nom', 'objet']}
          filters={[{ key: 'statut', label: 'Tous les statuts', options: Object.entries(STATUT_LABEL).map(([value, label]) => ({ value, label })) }]}
          searchPlaceholder="Rechercher un modèle…"
          pageSize={8}
        />
      )}
    </>
  );
}
