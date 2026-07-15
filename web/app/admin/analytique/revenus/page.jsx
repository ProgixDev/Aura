'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart } from '@/components/ui/MiniChart';
import { subscriptions } from '@/lib/data/admin';
import { api } from '@/lib/api';
import { euro } from '@/lib/format';

const TONE_VAR = { sky: 'var(--sky-2)', violet: 'var(--violet-2)', sage: 'var(--sage-2)', gold: 'var(--gold)' };
const DISCIPLINE_TONES = ['sky', 'violet', 'sage', 'gold'];

export default function RevenueAnalyticsPage() {
  const { data: revenueData, isError } = useQuery({
    queryKey: ['admin', 'analytics', 'revenue'],
    queryFn: () => api.get('/admin/analytics/revenue'),
  });
  const revenue = revenueData?.data;
  const parMois = revenue?.par_mois ?? [];
  const byDiscipline = revenue?.par_discipline ?? [];
  const general = revenue?.general;

  // MRR/ARR/subscriber counts still come from the `subscriptions` mock — the real
  // `subscriptions` table is 08e's job and doesn't exist yet. Not part of this endpoint.
  const mrr = subscriptions.filter((s) => s.status !== 'cancelled').reduce((s, x) => s + x.price, 0);
  const arr = mrr * 12;

  return (
    <>
      <PageHead
        title="Revenus"
        subtitle="Analyse détaillée du chiffre d’affaires."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Revenus' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les données de revenus.</div>}

      {!isError && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Chiffre d’affaires" value={euro(general?.montant_total)} icon="euro" />
            <StatCard label="Commissions" value={euro(general?.commission_totale)} icon="card" />
            <StatCard label="Reversé aux praticiens" value={euro(general?.net_total)} icon="users" />
            <StatCard label="MRR abonnements" value={euro(mrr)} icon="sparkle" hint="Basé sur le mock — dépend de 08e" />
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="between" style={{ marginBottom: 18 }}>
              <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Chiffre d’affaires mensuel</h3></div>
              <span className="price">{euro(parMois[parMois.length - 1]?.total)} <small>/ dernier mois</small></span>
            </div>
            <LineChart data={parMois.map((r) => r.total)} height={220} />
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              {parMois.map((r) => <div key={r.mois} className="flex-1 tiny center">{r.mois.slice(5)}</div>)}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="between" style={{ padding: '18px 20px' }}>
                <h3 className="h-3">Détail par mois</h3>
                <span className="tiny">commission et net réels, calculés par transaction</span>
              </div>
              <table className="table">
                <thead><tr><th>Mois</th><th>Brut</th><th>Commission</th><th>Net praticiens</th></tr></thead>
                <tbody>
                  {parMois.map((r) => (
                    <tr key={r.mois}>
                      <td className="table-cell-main">{r.mois}</td>
                      <td><strong>{euro(r.total)}</strong></td>
                      <td className="small">{euro(r.commission)}</td>
                      <td className="small">{euro(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 600 }}>
                    <td>Total</td><td>{euro(general?.montant_total)}</td>
                    <td>{euro(general?.commission_totale)}</td><td>{euro(general?.net_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="stack gap-5">
              <div className="card card-pad">
                <h3 className="h-3" style={{ marginBottom: 18 }}>Revenu par discipline</h3>
                <div className="stack gap-4">
                  {byDiscipline.map((d, i) => (
                    <div key={d.specialite}>
                      <div className="between" style={{ marginBottom: 6 }}>
                        <span className="small">{d.specialite}</span>
                        <strong className="small">{euro(d.total)}</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${d.pct}%`, background: TONE_VAR[DISCIPLINE_TONES[i % DISCIPLINE_TONES.length]], borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 14 }}>Revenu récurrent</h3>
                <p className="tiny" style={{ marginBottom: 10 }}>Basé sur le mock d’abonnements — sera réel une fois 08e livré.</p>
                <dl className="dl">
                  <dt>MRR</dt><dd><strong>{euro(mrr)}</strong></dd>
                  <dt>ARR (projeté)</dt><dd>{euro(arr)}</dd>
                  <dt>Abonnés actifs</dt><dd>{subscriptions.filter((s) => s.status === 'active').length}</dd>
                  <dt>En impayé</dt><dd>{subscriptions.filter((s) => s.status === 'past_due').length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
