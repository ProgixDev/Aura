'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { api } from '@/lib/api';
import { dateFr, euro, tone } from '@/lib/format';
import { canRequestRefund } from '@/lib/refund';

const STATUS_FR = { paid: 'Payé', en_attente: 'En attente', rembourse: 'Remboursé' };

export default function PaiementsBody() {
  const queryClient = useQueryClient();
  const { data: paiementsRes, isLoading } = useQuery({
    queryKey: ['paiements'],
    queryFn: () => api.get('/paiements/clients?per_page=50'),
  });
  const { data: remboursementsRes } = useQuery({
    queryKey: ['remboursements'],
    queryFn: () => api.get('/remboursements/client?per_page=50'),
  });
  const history = paiementsRes?.data ?? [];
  const remboursements = remboursementsRes?.data ?? [];

  return (
    <div className="stack gap-6">
      <header className="reveal r-1">
        <h1 className="h-1">Paiements</h1>
        <p className="lead" style={{ marginTop: 4 }}>Votre <span className="serif italic accent">historique</span> de transactions.</p>
      </header>

      <section className="reveal r-3">
        <div className="section-head"><h2 className="h-3">Historique des transactions</h2><ToastButton message="Export CSV téléchargé" className="btn btn-soft btn-sm"><Icon name="download" size={14} /> Exporter</ToastButton></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Référence</th><th>Date</th><th>Praticien</th><th>Montant</th><th>Moyen</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7}><div className="empty">Chargement…</div></td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={7}><div className="empty">Aucune transaction pour le moment.</div></td></tr>
              ) : history.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.reference}</td>
                  <td>{dateFr(t.date_paiement)}</td>
                  <td>{t.praticien ? `${t.praticien.firstname} ${t.praticien.lastname}` : 'N/A'}</td>
                  <td className="price" style={{ fontSize: 15 }}>{euro(t.montant_brut)}</td>
                  <td>{t.moyen_paiement}</td>
                  <td><Badge variant={tone(t.statut)}>{STATUS_FR[t.statut] || t.statut}</Badge></td>
                  <td>
                    {canRequestRefund(t, remboursements) && (
                      <ModalButton
                        modal="form"
                        payload={{
                          title: 'Demander un remboursement',
                          subtitle: `Transaction ${t.reference} · ${euro(t.montant_brut)}`,
                          fields: [
                            { name: 'motif', label: 'Motif', type: 'text', required: true },
                            { name: 'description', label: 'Description (optionnel)', type: 'textarea' },
                            { name: 'documents', label: 'Justificatif (optionnel)', type: 'file' },
                          ],
                          submitLabel: 'Envoyer la demande',
                          successToast: 'Demande de remboursement envoyée',
                          onSubmit: async (values) => {
                            const fd = new FormData();
                            fd.append('paiement_id', String(t.id));
                            fd.append('motif', values.motif);
                            if (values.description) fd.append('description', values.description);
                            if (values.documents) fd.append('documents', values.documents);
                            await api.post('/remboursements/client', fd);
                            await queryClient.invalidateQueries({ queryKey: ['paiements'] });
                            await queryClient.invalidateQueries({ queryKey: ['remboursements'] });
                          },
                        }}
                        className="btn btn-icon btn-ghost"
                        title="Demander un remboursement"
                      ><Icon name="euro" size={15} /></ModalButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="note"><Icon name="shield" size={15} color="var(--violet-2)" /> Vos paiements sont sécurisés et chiffrés. GUÉRIENERGIES ne conserve jamais vos données bancaires complètes.</div>
    </div>
  );
}
