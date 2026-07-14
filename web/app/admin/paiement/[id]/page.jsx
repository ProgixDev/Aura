'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { paid: 'success', en_attente: 'warning', rembourse: 'info' };

export default function AdminPaiementDetailPage() {
  const { id } = useParams();
  // No dedicated admin GET /paiements/:id exists (`:id` is ClientGuard-only, scoped to
  // the calling client) — reuse the same admin-index query + queryKey the list page
  // uses and find the row client-side. See the note above Task 20 in the plan for the
  // "outside the first 100 rows" limitation this implies.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'paiements'],
    queryFn: () => api.get('/paiements?per_page=100'),
  });
  const tx = (data?.data ?? []).find((p) => String(p.id) === String(id));

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !tx) {
    return (
      <>
        <PageHead title="Paiement introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements', href: '/admin/paiements' }, { label: 'Introuvable' }]} />
        <div className="empty">
          <div className="glyph">❍</div>
          Ce paiement n'existe pas, ou n'est pas dans les 100 transactions les plus récentes.
          <div className="mt-3"><Link href="/admin/paiements" className="btn btn-soft btn-sm">Retour aux paiements</Link></div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title={tx.reference}
        subtitle={`Transaction du ${dateFr(tx.date_paiement)}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements', href: '/admin/paiements' }, { label: tx.reference }]}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 18 }}>
              <h3 className="h-3">Détail du montant</h3>
              <Badge variant={STATUT_TONE[tx.statut] || 'neutral'}>{tx.statut}</Badge>
            </div>
            <div className="stack gap-3">
              <div className="between"><span className="muted">Montant brut</span><strong>{euro(tx.montant_brut)}</strong></div>
              <div className="between"><span className="muted">Commission Aura</span><span style={{ color: 'var(--danger)' }}>− {euro(tx.commission)}</span></div>
              <div className="divider" />
              <div className="between"><span style={{ fontWeight: 500 }}>Net reversé au praticien</span><strong className="h-4">{euro(tx.montant_net_praticien)}</strong></div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Parties</h3>
            <div className="dl">
              <dt>Client</dt><dd>{tx.client ? `${tx.client.firstname} ${tx.client.lastname}` : '—'}</dd>
              <dt>Praticien</dt><dd>{tx.praticien ? `${tx.praticien.firstname} ${tx.praticien.lastname}` : 'N/A'}</dd>
              <dt>Moyen de paiement</dt><dd><Badge variant="neutral">{tx.moyen_paiement}</Badge></dd>
            </div>
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Informations</h3>
            <div className="dl">
              <dt>Référence</dt><dd>{tx.reference}</dd>
              <dt>Date</dt><dd>{dateFr(tx.date_paiement)}</dd>
              <dt>Statut</dt><dd><Badge variant={STATUT_TONE[tx.statut] || 'neutral'}>{tx.statut}</Badge></dd>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Remboursement</h3>
            <p className="small" style={{ marginBottom: 12 }}>
              Les remboursements sont initiés par le client puis traités depuis la file dédiée — il n'existe pas d'action « rembourser » directe depuis un paiement.
            </p>
            <Link href="/admin/remboursements" className="btn btn-soft btn-sm btn-block">Voir la file des remboursements</Link>
          </div>
        </div>
      </div>
    </>
  );
}
