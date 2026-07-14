'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { en_attente: 'warning', en_cours: 'info', approuve: 'success', refuse: 'danger', completed: 'neutral' };
const STATUT_LABEL = { en_attente: 'En attente', en_cours: 'En cours', approuve: 'Approuvé', refuse: 'Refusé', completed: 'Complété' };

export default function AdminRemboursementsPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'remboursements'],
    queryFn: () => api.get('/remboursements/admin?per_page=100'),
  });
  const remboursements = (data?.data ?? []).map((r) => ({
    ...r,
    client_nom: r.client ? `${r.client.firstname} ${r.client.lastname}` : '',
    transaction_ref: r.paiement?.reference ?? '',
  }));
  const stats = data?.statistiques;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'remboursements'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, commentaire_admin }) =>
      api.post(`/remboursements/admin/${id}/approve`, commentaire_admin ? { commentaire_admin } : {}),
    onSuccess: () => { invalidate(); toast('Remboursement approuvé', 'success'); },
  });
  const refuseMutation = useMutation({
    mutationFn: ({ id, commentaire_admin }) => api.post(`/remboursements/admin/${id}/refuse`, { commentaire_admin }),
    onSuccess: () => { invalidate(); toast('Remboursement refusé', 'success'); },
  });
  const completeMutation = useMutation({
    mutationFn: (id) => api.post(`/remboursements/admin/${id}/complete`),
    onSuccess: () => { invalidate(); toast('Remboursement marqué comme complété', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'created_at', label: 'Date', sortable: true, render: (r) => <span className="small">{dateFr(r.created_at)}</span> },
    { key: 'transaction_ref', label: 'Transaction', sortable: true, render: (r) => <span className="table-cell-main">{r.transaction_ref || '—'}</span> },
    { key: 'client_nom', label: 'Client', sortable: true, render: (r) => <span className="small">{r.client_nom || '—'}</span> },
    { key: 'montant', label: 'Montant', sortable: true, render: (r) => <strong>{euro(r.montant)}</strong> },
    { key: 'motif', label: 'Motif', render: (r) => <span className="small">{r.motif}</span> },
    { key: 'statut', label: 'Statut', render: (r) => <Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{STATUT_LABEL[r.statut] || r.statut}</Badge> },
    {
      key: 'actions', label: '', width: 190,
      render: (r) => {
        if (r.statut === 'en_attente' || r.statut === 'en_cours') {
          return (
            <div className="row gap-1" onClick={(e) => e.stopPropagation()}>
              <ModalButton modal="confirm" payload={{
                title: 'Approuver le remboursement',
                message: `Confirmer le remboursement de ${euro(r.montant)} à ${r.client_nom || 'ce client'} ?`,
                withReason: true, reasonLabel: 'Commentaire (optionnel)', confirmLabel: 'Approuver', successToast: null,
                onConfirm: (reason) => approveMutation.mutateAsync({ id: r.id, commentaire_admin: reason || undefined }),
              }} className="btn btn-primary btn-sm" as="div">Approuver</ModalButton>
              <ModalButton modal="confirm" payload={{
                title: 'Refuser le remboursement', danger: true, withReason: true,
                reasonLabel: 'Motif du refus (10 caractères minimum)', confirmLabel: 'Refuser', successToast: null,
                onConfirm: (reason) => refuseMutation.mutateAsync({ id: r.id, commentaire_admin: reason }),
              }} className="btn btn-danger-soft btn-sm" as="div">Refuser</ModalButton>
            </div>
          );
        }
        if (r.statut === 'approuve') {
          return (
            <button className="btn btn-soft btn-sm" onClick={(e) => { e.stopPropagation(); completeMutation.mutate(r.id); }}>
              Marquer complété
            </button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <>
      <PageHead
        title="Remboursements"
        subtitle="Demandes et historique des remboursements clients."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Remboursements' }]}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Total remboursé" value={stats ? euro(stats.completed) : '—'} icon="euro" />
        <StatCard label="En attente" value={stats ? String(stats.en_attente) : '—'} icon="clock" />
        <StatCard label="Taux de remboursement" value={stats?.taux_remboursement ?? '—'} icon="shield" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les remboursements.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={remboursements}
          searchKeys={['transaction_ref', 'client_nom', 'motif', 'reference']}
          filters={[{ key: 'statut', label: 'Statut', options: Object.keys(STATUT_LABEL).map((s) => ({ value: s, label: STATUT_LABEL[s] })) }]}
          searchPlaceholder="Rechercher un remboursement…"
          pageSize={10}
        />
      )}
    </>
  );
}
