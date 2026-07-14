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

const notifFields = (n) => [
  { name: 'audience', label: 'Audience', type: 'text', value: n?.audience, required: true, placeholder: 'clients' },
  { name: 'canal', label: 'Canal', type: 'text', value: n?.canal, required: true, placeholder: 'email' },
  { name: 'titre', label: 'Titre', type: 'text', value: n?.titre, required: true },
  { name: 'message', label: 'Message', type: 'textarea', value: n?.message, required: true },
  { name: 'status', label: 'Statut', type: 'text', value: n?.status },
];

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => api.get('/notifications?per_page=100'),
  });
  const notifications = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/notifications', values),
    onSuccess: () => { invalidate(); toast('Notification créée', 'success'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/notifications/${id}`, values),
    onSuccess: () => { invalidate(); toast('Notification mise à jour', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/notifications/${id}`),
    onSuccess: () => { invalidate(); toast('Notification supprimée', 'success'); },
  });

  const composeButton = (
    <ModalButton modal="form" payload={{
      title: 'Composer une notification', submitLabel: 'Créer', successToast: null,
      fields: notifFields(null),
      onSubmit: (values) => createMutation.mutateAsync(values),
    }} className="btn btn-primary btn-sm">
      <Icon name="bell" size={15} /> Composer
    </ModalButton>
  );

  const columns = [
    { key: 'titre', label: 'Notification', render: (n) => (
      <div>
        <div style={{ fontWeight: 500 }}>{n.titre}</div>
        <div className="tiny">{n.message?.length > 60 ? `${n.message.slice(0, 60)}…` : n.message}</div>
      </div>
    ) },
    { key: 'audience', label: 'Audience', render: (n) => <span className="small">{n.audience}</span> },
    { key: 'canal', label: 'Canal', render: (n) => <Badge variant="neutral">{n.canal}</Badge> },
    { key: 'created_at', label: 'Créée le', sortable: true, render: (n) => <span className="small">{dateFr(n.created_at)}</span> },
    { key: 'status', label: 'Statut', render: (n) => (n.status ? <Badge variant="info">{n.status}</Badge> : <span className="tiny muted">—</span>) },
    { key: 'actions', label: '', width: 100, render: (n) => (
      <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
        <ModalButton modal="form" payload={{
          title: `Modifier « ${n.titre} »`, submitLabel: 'Enregistrer', successToast: null,
          fields: notifFields(n),
          onSubmit: (values) => updateMutation.mutateAsync({ id: n.id, values }),
        }} className="btn btn-soft btn-sm btn-icon" as="div" title="Modifier"><Icon name="edit" size={14} /></ModalButton>
        <ModalButton modal="confirm" payload={{
          title: 'Supprimer la notification', message: `« ${n.titre} » sera définitivement supprimée.`,
          confirmLabel: 'Supprimer', danger: true, successToast: null,
          onConfirm: () => deleteMutation.mutateAsync(n.id),
        }} className="btn btn-danger-soft btn-sm btn-icon" as="div" title="Supprimer"><Icon name="trash" size={14} /></ModalButton>
      </div>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Notifications"
        subtitle={`${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Notifications' }]}
        actions={composeButton}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les notifications.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={notifications}
          searchKeys={['titre', 'message', 'audience']}
          filters={[{ key: 'canal', label: 'Tous les canaux', options: [...new Set(notifications.map((n) => n.canal))].filter(Boolean).map((c) => ({ value: c, label: c })) }]}
          searchPlaceholder="Rechercher une notification…"
          toolbar={composeButton}
          pageSize={10}
        />
      )}
    </>
  );
}
