'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr, euro } from '@/lib/format';

const STATUT_FR = { en_attente: 'En attente', en_cours: 'En cours', approuve: 'Approuvé', refuse: 'Refusé', completed: 'Complété' };
const STATUT_TONE = { en_attente: 'warning', en_cours: 'info', approuve: 'success', refuse: 'danger', completed: 'neutral' };

export default function RemboursementsBody() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['remboursements'],
    queryFn: () => api.get('/remboursements/client?per_page=50'),
  });
  const list = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['remboursements'] });

  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Remboursements</h1>
        <p className="lead" style={{ marginTop: 4 }}>Vos demandes de <span className="serif italic accent">remboursement</span> et leur statut.</p>
      </header>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Référence</th><th>Transaction</th><th>Motif</th><th>Montant</th><th>Statut</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7}><div className="empty">Chargement…</div></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7}><div className="empty">Aucune demande de remboursement.</div></td></tr>
            ) : list.map((r) => {
              const cancellable = r.statut === 'en_attente' || r.statut === 'en_cours';
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.reference}</td>
                  <td>{r.paiement?.reference ?? 'N/A'}</td>
                  <td>{r.motif}</td>
                  <td className="price" style={{ fontSize: 15 }}>{euro(r.montant)}</td>
                  <td><Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{STATUT_FR[r.statut] || r.statut}</Badge></td>
                  <td>{dateFr(r.date_traitement || r.created_at)}</td>
                  <td>
                    {cancellable && (
                      <ModalButton
                        modal="confirm"
                        payload={{
                          title: 'Annuler la demande',
                          message: `Annuler la demande de remboursement ${r.reference} ?`,
                          danger: true,
                          confirmLabel: 'Annuler la demande',
                          cancelLabel: 'Garder',
                          successToast: 'Demande annulée',
                          onConfirm: async () => {
                            await api.post(`/remboursements/client/${r.id}/cancel`);
                            await invalidate();
                          },
                        }}
                        className="btn btn-danger-soft btn-sm"
                      >Annuler</ModalButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
