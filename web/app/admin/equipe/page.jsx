'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { useAdminAuth } from '@/lib/admin-auth-store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';
import { ROLE_ORDER, ROLE_LABELS } from '@/lib/capabilities';

const roleOptions = ROLE_ORDER.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export default function TeamPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const me = useAdminAuth((s) => s.admin);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: () => api.get('/admin/list?per_page=100'),
  });
  const team = data?.data ?? [];
  const everLoggedIn = team.filter((u) => u.last_login_at).length;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'team'] });

  const addAdminMutation = useMutation({
    mutationFn: (values) => api.post('/admin/register', values),
    onSuccess: () => { invalidate(); toast('Administrateur ajouté', 'success'); },
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.post(`/admin/${id}/role`, { role }),
    onSuccess: () => { invalidate(); toast('Rôle mis à jour', 'success'); },
  });
  const deactivateMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/${id}/deactivate`),
    onSuccess: () => { invalidate(); toast('Administrateur désactivé', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/admin/${id}`),
    onSuccess: () => { invalidate(); toast('Administrateur supprimé', 'success'); },
  });

  const columns = [
    { key: 'name', label: 'Membre', sortable: true, render: (u) => (
      <div className="row gap-3">
        <Avatar name={u.name} size={36} />
        <div><div style={{ fontWeight: 500 }}>{u.name}</div><div className="tiny">{u.email}</div></div>
      </div>
    ) },
    { key: 'role', label: 'Rôle', sortable: true, render: (u) => <span className="small">{ROLE_LABELS[u.role ?? 'admin']}</span> },
    { key: 'last_login_at', label: 'Dernière connexion', sortable: true, render: (u) => <span className="small">{u.last_login_at ? dateFr(u.last_login_at) : 'Jamais connecté'}</span> },
    { key: 'created_at', label: 'Membre depuis', sortable: true, render: (u) => <span className="small">{dateFr(u.created_at)}</span> },
    {
      key: 'actions', label: '', width: 170,
      render: (u) => {
        if (me?.id === u.id) return <span className="tiny muted">Vous</span>;
        return (
          <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
            <ModalButton modal="form" payload={{
              title: 'Modifier le rôle',
              subtitle: `${u.name} — rôle actuel : ${ROLE_LABELS[u.role ?? 'admin']}`,
              submitLabel: 'Enregistrer', successToast: null,
              fields: [{ name: 'role', label: 'Rôle', type: 'select', required: true, value: u.role ?? 'admin', options: roleOptions }],
              onSubmit: (values) => updateRoleMutation.mutateAsync({ id: u.id, role: values.role }),
            }} className="btn btn-soft btn-sm btn-icon" as="button" title="Modifier le rôle">
              <Icon name="edit" size={15} />
            </ModalButton>
            <ModalButton modal="confirm" payload={{
              title: 'Désactiver cet administrateur', danger: true,
              message: `${u.name} perdra l'accès à l'administration.`,
              confirmLabel: 'Désactiver', successToast: null,
              onConfirm: () => deactivateMutation.mutateAsync(u.id),
            }} className="btn btn-danger-soft btn-sm btn-icon" as="button" title="Désactiver">
              <Icon name="shield" size={15} />
            </ModalButton>
            <ModalButton modal="confirm" payload={{
              title: 'Supprimer cet administrateur', danger: true,
              message: `« ${u.name} » sera définitivement supprimé.`,
              confirmLabel: 'Supprimer', successToast: null,
              onConfirm: () => deleteMutation.mutateAsync(u.id),
            }} className="btn btn-danger-soft btn-sm btn-icon" as="button" title="Supprimer">
              <Icon name="trash" size={15} />
            </ModalButton>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHead
        title="Équipe"
        subtitle={`${team.length} administrateur${team.length > 1 ? 's' : ''}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Équipe' }]}
        actions={
          <ModalButton modal="form" payload={{
            title: 'Ajouter un administrateur',
            subtitle: "Crée directement un compte avec ce mot de passe — il n'y a pas de flux d'invitation par email.",
            submitLabel: 'Créer le compte', successToast: null,
            fields: [
              { name: 'name', label: 'Nom', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'role', label: 'Rôle', type: 'select', required: true, value: 'admin', options: roleOptions },
              { name: 'password', label: 'Mot de passe (8 caractères min.)', type: 'password', required: true },
              { name: 'password_confirmation', label: 'Confirmer le mot de passe', type: 'password', required: true },
            ],
            onSubmit: (values) => addAdminMutation.mutateAsync(values),
          }} className="btn btn-primary btn-sm">
            <Icon name="plus" size={15} /> Ajouter un administrateur
          </ModalButton>
        }
      />

      <div className="grid grid-2" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Membres</div><div className="h-2" style={{ marginTop: 6 }}>{team.length}</div><div className="small">administrateurs actifs</div></div>
        <div className="card card-pad"><div className="eyebrow">Déjà connectés</div><div className="h-2" style={{ marginTop: 6 }}>{everLoggedIn}</div><div className="small">au moins une fois</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger l'équipe.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={team}
          searchKeys={['name', 'email']}
          searchPlaceholder="Rechercher un membre…"
          pageSize={10}
        />
      )}
    </>
  );
}
