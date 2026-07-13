import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart } from '@/components/ui/MiniChart';
import { analytics, subscriptions } from '@/lib/data/admin';
import { euro } from '@/lib/format';

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const TONE_VAR = { sky: 'var(--sky-2)', violet: 'var(--violet-2)', sage: 'var(--sage-2)', gold: 'var(--gold)' };

export default function RevenueAnalyticsPage() {
  const rev = analytics.revenueMonthly;
  const total = rev.reduce((s, v) => s + v, 0);
  const commission = Math.round(total * 0.15);
  const net = total - commission;
  const mrr = subscriptions.filter((s) => s.status !== 'cancelled').reduce((s, x) => s + x.price, 0);
  const arr = mrr * 12;

  const byDiscipline = analytics.disciplineShare.map((d) => ({ ...d, value: Math.round((total * d.pct) / 100) }));
  const maxRevDisc = Math.max(...byDiscipline.map((d) => d.value), 1);

  return (
    <>
      <PageHead
        title="Revenus"
        subtitle="Analyse détaillée du chiffre d’affaires."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Revenus' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Chiffre d’affaires" value={euro(total)} delta="+8,2%" deltaDir="up" icon="euro" />
        <StatCard label="Commissions (15%)" value={euro(commission)} delta="+8,2%" deltaDir="up" icon="card" />
        <StatCard label="Reversé aux praticiens" value={euro(net)} delta="+8,1%" deltaDir="up" icon="users" />
        <StatCard label="MRR abonnements" value={euro(mrr)} delta="+2 abonnés" deltaDir="up" icon="sparkle" />
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div><div className="eyebrow">Évolution annuelle</div><h3 className="h-3" style={{ marginTop: 4 }}>Chiffre d’affaires mensuel</h3></div>
          <span className="price">{euro(rev[rev.length - 1])} <small>/ dernier mois</small></span>
        </div>
        <LineChart data={rev} height={220} />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {analytics.revenueLabels.map((l, i) => <div key={i} className="flex-1 tiny center">{l}</div>)}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Détail par mois</h3>
            <span className="tiny">commission 15% · TVA incluse</span>
          </div>
          <table className="table">
            <thead><tr><th>Mois</th><th>Brut</th><th>Commission</th><th>Net praticiens</th></tr></thead>
            <tbody>
              {rev.map((v, i) => {
                const c = Math.round(v * 0.15);
                return (
                  <tr key={i}>
                    <td className="table-cell-main">{MONTHS[i]}</td>
                    <td><strong>{euro(v)}</strong></td>
                    <td className="small">{euro(c)}</td>
                    <td className="small">{euro(v - c)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600 }}>
                <td>Total</td><td>{euro(total)}</td><td>{euro(commission)}</td><td>{euro(net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 18 }}>Revenu par discipline</h3>
            <div className="stack gap-4">
              {byDiscipline.map((d) => (
                <div key={d.name}>
                  <div className="between" style={{ marginBottom: 6 }}>
                    <span className="small">{d.name}</span>
                    <strong className="small">{euro(d.value)}</strong>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(d.value / maxRevDisc) * 100}%`, background: TONE_VAR[d.tone] || 'var(--violet-2)', borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Revenu récurrent</h3>
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
  );
}
