import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart, Donut } from '@/components/ui/MiniChart';
import { analytics } from '@/lib/data/admin';
import { num } from '@/lib/format';

// Retention curve — % of clients still active over weeks since first booking.
const CURVE = [100, 78, 64, 56, 51, 47, 44, 42, 40, 39, 38, 37];
const WEEKS = ['S0', 'S1', 'S2', 'S3', 'S4', 'S6', 'S8', 'S10', 'S12', 'S16', 'S20', 'S24'];

const REPEAT = [
  { label: '1 séance', count: 2840, pct: 41, tone: 'var(--line)' },
  { label: '2 à 3 séances', count: 2210, pct: 32, tone: 'var(--sky-2)' },
  { label: '4 à 6 séances', count: 1180, pct: 17, tone: 'var(--sage-2)' },
  { label: '7 séances et +', count: 690, pct: 10, tone: 'var(--violet-2)' },
];

export default function RetentionAnalyticsPage() {
  return (
    <>
      <PageHead
        title="Rétention"
        subtitle="Fidélité, réservations répétées et attrition."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Rétention' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Rétention 90 j" value={`${analytics.retention}%`} delta="+2 pt" deltaDir="up" icon="users" />
        <StatCard label="Réservations répétées" value="59%" delta="+4 pt" deltaDir="up" icon="calendar" />
        <StatCard label="Valeur vie client" value="312 €" delta="+18 €" deltaDir="up" icon="euro" />
        <StatCard label="Taux d’attrition" value="4,1%" delta="-0,6 pt" deltaDir="up" icon="chart" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 30 j</h3>
          <Donut value={78} label="actifs" color="var(--sky-2)" />
        </div>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 90 j</h3>
          <Donut value={analytics.retention} label="reviennent" color="var(--violet-2)" />
        </div>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 12 mois</h3>
          <Donut value={54} label="fidèles" color="var(--sage-2)" />
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div><div className="eyebrow">Cohorte moyenne</div><h3 className="h-3" style={{ marginTop: 4 }}>Courbe de rétention</h3></div>
          <span className="small">% encore actifs après la 1ère séance</span>
        </div>
        <LineChart data={CURVE} height={200} color="var(--violet-2)" />
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          {WEEKS.map((l, i) => <div key={i} className="flex-1 tiny center">{l}</div>)}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations répétées</h3>
          <div className="stack gap-4">
            {REPEAT.map((r) => (
              <div key={r.label}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">{r.label}</span>
                  <span className="small"><strong>{num(r.count)}</strong> <span className="tiny">· {r.pct}%</span></span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct * 2.4}%`, maxWidth: '100%', background: r.tone, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="note tint-gold">
          <h3 className="h-4" style={{ marginBottom: 10 }}>À propos du churn</h3>
          <p className="small">L’attrition mensuelle s’établit à <strong className="serif-accent">4,1%</strong>, en baisse de 0,6 point sur le trimestre. Les rappels 24 h et les recommandations personnalisées de praticiens contribuent fortement à la rétention.</p>
          <p className="small" style={{ marginTop: 10 }}>Principaux motifs de départ : besoin ponctuel résolu (52%), prix perçu (21%), manque de disponibilités (16%).</p>
          <div className="row gap-2 wrap" style={{ marginTop: 14 }}>
            <ModalButton modal="sendNotification" className="btn btn-soft btn-sm"><Icon name="bell" size={15} /> Campagne de réactivation</ModalButton>
          </div>
        </div>
      </div>
    </>
  );
}
