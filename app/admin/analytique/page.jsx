import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { BarChart, LineChart, Donut } from '@/components/ui/MiniChart';
import { analytics } from '@/lib/data/admin';
import { practitioners } from '@/lib/data/practitioners';
import { euro } from '@/lib/format';

const TONE_VAR = { sky: 'var(--sky-2)', violet: 'var(--violet-2)', sage: 'var(--sage-2)', gold: 'var(--gold)' };

const SUBPAGES = [
  { href: '/admin/analytique/revenus', icon: 'euro', tint: 'tint-violet', glyph: 'var(--violet-2)', title: 'Revenus', desc: 'Détail mensuel, commissions, net et MRR.' },
  { href: '/admin/analytique/croissance', icon: 'chart', tint: 'tint-sky', glyph: 'var(--sky-2)', title: 'Croissance', desc: 'Inscriptions, entonnoir et canaux d’acquisition.' },
  { href: '/admin/analytique/retention', icon: 'users', tint: 'tint-sage', glyph: 'var(--sage-2)', title: 'Rétention', desc: 'Fidélité, réservations répétées et churn.' },
];

export default function AnalyticsOverviewPage() {
  const topPraticiens = [...practitioners].sort((a, b) => (b.earnings || 0) - (a.earnings || 0)).slice(0, 6);

  return (
    <>
      <PageHead
        title="Analytique"
        subtitle="Vue d’ensemble de la performance d’Aura."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique' }]}
        actions={<>
          <select className="input btn-sm" style={{ width: 'auto', minWidth: 150 }} defaultValue="12m">
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
            <option value="12m">12 derniers mois</option>
            <option value="all">Depuis le début</option>
          </select>
          <ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
        </>}
      />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Revenu (12 mois)" value={euro(64500)} delta="+8,2%" deltaDir="up" icon="euro" />
        <StatCard label="Réservations" value="340" delta="+14%" deltaDir="up" icon="calendar" />
        <StatCard label="Nouveaux clients" value="680" delta="+11%" deltaDir="up" icon="users" />
        <StatCard label="Taux de conversion" value="3,4%" delta="+0,3 pt" deltaDir="up" icon="chart" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 18 }}>
            <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Revenu mensuel</h3></div>
            <Link href="/admin/analytique/revenus" className="more">Détails →</Link>
          </div>
          <LineChart data={analytics.revenueMonthly} height={190} />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            {analytics.revenueLabels.map((l, i) => <div key={i} className="flex-1 tiny center">{l}</div>)}
          </div>
        </div>
        <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h3 className="h-3" style={{ marginBottom: 16 }}>Rétention 90 j</h3>
          <Donut value={analytics.retention} label="reviennent" size={140} />
          <Link href="/admin/analytique/retention" className="more" style={{ marginTop: 16 }}>Analyser →</Link>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations / semaine</h3>
          <BarChart data={analytics.bookingsWeekly} labels={analytics.weekLabels} height={170} color="var(--sage-2)" />
        </div>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 18 }}>
            <h3 className="h-3">Répartition par discipline</h3>
            <span className="tiny">part du chiffre</span>
          </div>
          <div className="stack gap-4">
            {analytics.disciplineShare.map((d) => (
              <div key={d.name}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">{d.name}</span>
                  <strong className="small">{d.pct}%</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.pct * 3.5}%`, maxWidth: '100%', background: TONE_VAR[d.tone] || 'var(--violet-2)', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Top praticiens</h3>
            <Link href="/admin/praticiens" className="more">Tout voir →</Link>
          </div>
          <table className="table">
            <thead><tr><th>Praticien</th><th>Discipline</th><th>Séances</th><th>Revenu généré</th></tr></thead>
            <tbody>
              {topPraticiens.map((p) => (
                <tr key={p.id}>
                  <td><div className="row gap-2"><Avatar src={p.photo} name={p.name} tone={p.tone} size={28} />{p.name}</div></td>
                  <td className="small">{p.specialties[0]}</td>
                  <td>{p.experience?.sessions ?? p.sessionsThisMonth}</td>
                  <td><strong>{euro(p.earnings)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stack gap-5">
          {SUBPAGES.map((s) => (
            <Link key={s.href} href={s.href} className="card card-pad card-hover">
              <div className="row gap-3">
                <span className={`tile-icon ${s.tint}`}><Icon name={s.icon} size={18} color={s.glyph} /></span>
                <div className="flex-1">
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div className="tiny">{s.desc}</div>
                </div>
                <Icon name="chevronRight" size={16} color="var(--muted)" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
