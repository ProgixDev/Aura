import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart } from '@/components/ui/MiniChart';
import { analytics } from '@/lib/data/admin';
import { num } from '@/lib/format';

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

const FUNNEL = [
  { label: 'Visiteurs', value: 42800, tone: 'var(--sky-2)' },
  { label: 'Inscrits', value: 6840, tone: 'var(--violet-2)' },
  { label: 'Profil complété', value: 4120, tone: 'var(--sage-2)' },
  { label: '1ère réservation', value: 1456, tone: 'var(--gold)' },
];

const CHANNELS = [
  { name: 'Recherche organique', pct: 38, tone: 'var(--sage-2)' },
  { name: 'Réseaux sociaux', pct: 24, tone: 'var(--violet-2)' },
  { name: 'Bouche-à-oreille', pct: 18, tone: 'var(--sky-2)' },
  { name: 'Publicité', pct: 12, tone: 'var(--gold)' },
  { name: 'Direct', pct: 8, tone: 'var(--violet-2)' },
];

const COHORTS = [
  { cohort: 'Janv. 2026', size: 410, m1: 64, m2: 48, m3: 39 },
  { cohort: 'Févr. 2026', size: 480, m1: 67, m2: 51, m3: 41 },
  { cohort: 'Mars 2026', size: 520, m1: 69, m2: 54, m3: null },
  { cohort: 'Avr. 2026', size: 560, m1: 71, m2: null, m3: null },
  { cohort: 'Mai 2026', size: 680, m1: null, m2: null, m3: null },
];

export default function GrowthAnalyticsPage() {
  const signups = analytics.signups;
  const lastSignups = signups[signups.length - 1];
  const maxFunnel = FUNNEL[0].value;

  return (
    <>
      <PageHead
        title="Croissance"
        subtitle="Acquisition, activation et conversion."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Croissance' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Nouveaux inscrits" value={num(lastSignups)} delta="+11%" deltaDir="up" icon="users" />
        <StatCard label="Taux d’activation" value="60%" delta="+3 pt" deltaDir="up" icon="sparkle" />
        <StatCard label="Conversion 1ère résa" value="3,4%" delta="+0,3 pt" deltaDir="up" icon="chart" />
        <StatCard label="Coût d’acquisition" value="8,40 €" delta="-0,90 €" deltaDir="up" icon="euro" />
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Inscriptions</h3></div>
          <span className="price">{num(lastSignups)} <small>/ dernier mois</small></span>
        </div>
        <LineChart data={signups} height={210} color="var(--sky-2)" fill="rgba(125,180,222,0.14)" />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {MONTH_LABELS.map((l, i) => <div key={i} className="flex-1 tiny center">{l}</div>)}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Entonnoir de conversion</h3>
          <div className="stack gap-4">
            {FUNNEL.map((f, i) => {
              const w = (f.value / maxFunnel) * 100;
              const conv = i === 0 ? 100 : Math.round((f.value / FUNNEL[i - 1].value) * 100);
              return (
                <div key={f.label}>
                  <div className="between" style={{ marginBottom: 6 }}>
                    <span className="small">{f.label}</span>
                    <span className="small"><strong>{num(f.value)}</strong> {i > 0 && <span className="tiny">· {conv}%</span>}</span>
                  </div>
                  <div style={{ height: 22, borderRadius: 8, background: 'var(--line)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${w}%`, background: f.tone, borderRadius: 8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Canaux d’acquisition</h3>
          <div className="stack gap-4">
            {CHANNELS.map((c) => (
              <div key={c.name}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">{c.name}</span>
                  <strong className="small">{c.pct}%</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct * 2.6}%`, maxWidth: '100%', background: c.tone, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="between" style={{ padding: '18px 20px' }}>
          <h3 className="h-3">Rétention par cohorte</h3>
          <span className="tiny">% revenus le mois suivant</span>
        </div>
        <table className="table">
          <thead><tr><th>Cohorte</th><th>Taille</th><th>M+1</th><th>M+2</th><th>M+3</th></tr></thead>
          <tbody>
            {COHORTS.map((c) => (
              <tr key={c.cohort}>
                <td className="table-cell-main">{c.cohort}</td>
                <td>{num(c.size)}</td>
                {[c.m1, c.m2, c.m3].map((v, i) => (
                  <td key={i}>{v == null ? <span className="tiny">—</span> : <Badge variant={v >= 55 ? 'success' : v >= 45 ? 'warning' : 'neutral'}>{v}%</Badge>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
