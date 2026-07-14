'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr, euro } from '@/lib/format';

const promoFields = (p) => [
  { name: 'code', label: 'Code', type: 'text', value: p?.code, required: true, placeholder: 'EQUINOXE25' },
  { name: 'type', label: 'Type', type: 'select', options: ['pourcentage', 'fixe'], value: p?.type || 'pourcentage', required: true },
  { name: 'valeur', label: 'Valeur', type: 'number', value: p?.valeur, required: true },
  { name: 'date_expiration', label: "Date d'expiration", type: 'date', value: p?.date_expiration, required: true },
];

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'promotions'],
    queryFn: () => api.get('/promotions?per_page=100'),
  });
  const promos = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'promotions'] });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/promotions', { ...values, valeur: Number(values.valeur) }),
    onSuccess: () => { invalidate(); toast('Code promo créé', 'success'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/promotions/${id}`, { ...values, valeur: Number(values.valeur) }),
    onSuccess: () => { invalidate(); toast('Code promo mis à jour', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.del(`/promotions/${id}`),
    onSuccess: () => { invalidate(); toast('Code promo supprimé', 'success'); },
  });

  const createButton = (
    <ModalButton modal="form" payload={{
      title: 'Créer un code promo', submitLabel: 'Créer', successToast: null,
      fields: promoFields(null),
      onSubmit: (values) => createMutation.mutateAsync(values),
    }} className="btn btn-primary btn-sm">
      <Icon name="plus" size={15} /> Nouveau code
    </ModalButton>
  );

  const columns = [
    { key: 'code', label: 'Code', sortable: true, render: (r) => <span className="table-cell-main" style={{ fontFamily: 'monospace', letterSpacing: '.04em' }}>{r.code}</span> },
    { key: 'type', label: 'Remise', render: (r) => <Badge variant="info">{r.type === 'pourcentage' ? `${r.valeur}%` : euro(r.valeur)}</Badge> },
    { key: 'date_expiration', label: 'Expiration', sortable: true, render: (r) => <span className="small">{dateFr(r.date_expiration)}</span> },
    { key: 'status', label: 'Statut', render: (r) => (r.status ? <Badge variant="neutral">{r.status}</Badge> : <span className="tiny muted">—</span>) },
    { key: 'actions', label: '', width: 100, render: (r) => (
      <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
        <ModalButton modal="form" payload={{
          title: `Modifier ${r.code}`, submitLabel: 'Enregistrer', successToast: null,
          fields: promoFields(r),
          onSubmit: (values) => updateMutation.mutateAsync({ id: r.id, values }),
        }} className="btn btn-soft btn-sm btn-icon" as="div"><Icon name="edit" size={15} /></ModalButton>
        <ModalButton modal="confirm" payload={{
          title: `Supprimer ${r.code}`, message: `Le code ${r.code} sera définitivement supprimé.`,
          confirmLabel: 'Supprimer', danger: true, successToast: null,
          onConfirm: () => deleteMutation.mutateAsync(r.id),
        }} className="btn btn-danger-soft btn-sm btn-icon" as="div"><Icon name="trash" size={15} /></ModalButton>
      </div>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Codes promo"
        subtitle="Réductions et campagnes d'acquisition."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Promotions' }]}
        actions={createButton}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Codes" value={String(promos.length)} icon="ticket" />
        <StatCard label="En pourcentage" value={String(promos.filter((p) => p.type === 'pourcentage').length)} icon="tag" />
        <StatCard label="Montant fixe" value={String(promos.filter((p) => p.type === 'fixe').length)} icon="euro" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les codes promo.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={promos}
          searchKeys={['code']}
          filters={[{ key: 'type', label: 'Tous les types', options: [{ value: 'pourcentage', label: 'Pourcentage' }, { value: 'fixe', label: 'Montant fixe' }] }]}
          searchPlaceholder="Rechercher un code…"
          pageSize={10}
          toolbar={createButton}
        />
      )}
    </>
  );
}
