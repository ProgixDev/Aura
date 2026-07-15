'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart } from '@/components/ui/MiniChart';
import { api } from '@/lib/api';
import { num } from '@/lib/format';

export default function GrowthAnalyticsPage() {
  const { data: growthData, isError: growthError } = useQuery({
    queryKey: ['admin', 'analytics', 'growth'],
    queryFn: () => api.get('/admin/analytics/growth'),
  });
  const { data: retentionData, isError: retentionError } = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: () => api.get('/admin/analytics/retention'),
  });
  const isError = growthError || retentionError;
  const growth = growthData?.data;
  const signups = growth?.signups ?? [];
  const lastSignups = signups[signups.length - 1]?.count ?? 0;
  const funnel = growth?.funnel;
  const maxFunnel = Math.max(funnel?.inscrits ?? 1, 1);
  const cohorts = retentionData?.data?.cohorts ?? [];

  return (
    <>
      <PageHead
        title="Croissance"
        subtitle="Acquisition, activation et conversion."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Croissance' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les données de croissance.</div>}

      {!isError && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Nouveaux inscrits" value={num(lastSignups)} icon="users" />
            <StatCard label="Taux d’activation" value={growth?.activation_rate_pct != null ? `${growth.activation_rate_pct}%` : '—'} icon="sparkle" hint="Clients des 30 derniers jours ayant réservé" />
            <StatCard label="Taux de conversion" value={growth?.conversion_rate_pct != null ? `${growth.conversion_rate_pct}%` : '—'} icon="chart" hint="Sur l’ensemble des clients" />
            <StatCard label="Délai moyen 1ère résa" value={growth?.avg_days_to_first_booking != null ? `${growth.avg_days_to_first_booking} j` : '—'} icon="calendar" />
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="between" style={{ marginBottom: 18 }}>
              <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Inscriptions</h3></div>
              <span className="price">{num(lastSignups)} <small>/ dernier mois</small></span>
            </div>
            <LineChart data={signups.map((s) => s.count)} height={210} color="var(--sky-2)" fill="rgba(125,180,222,0.14)" />
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              {signups.map((s) => <div key={s.mois} className="flex-1 tiny center">{s.mois.slice(5)}</div>)}
            </div>
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <h3 className="h-3" style={{ marginBottom: 18 }}>Entonnoir de conversion</h3>
            <div className="stack gap-4">
              <div>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">Visiteurs</span>
                  <Badge variant="neutral">Non disponible</Badge>
                </div>
                <div style={{ height: 22, borderRadius: 8, background: 'var(--line)' }} />
              </div>
              <div>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">Inscrits</span>
                  <span className="small"><strong>{num(funnel?.inscrits ?? 0)}</strong> <span className="tiny">· 100%</span></span>
                </div>
                <div style={{ height: 22, borderRadius: 8, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: 'var(--violet-2)', borderRadius: 8 }} />
                </div>
              </div>
              <div>
                <div className="between" style={{ marginBottom: 6 }}>
                  <span className="small">1ère réservation</span>
                  <span className="small"><strong>{num(funnel?.a_reserve ?? 0)}</strong> <span className="tiny">· {funnel?.inscrits ? Math.round((funnel.a_reserve / funnel.inscrits) * 100) : 0}%</span></span>
                </div>
                <div style={{ height: 22, borderRadius: 8, background: 'var(--line)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${((funnel?.a_reserve ?? 0) / maxFunnel) * 100}%`, background: 'var(--gold)', borderRadius: 8 }} />
                </div>
              </div>
            </div>
            <p className="tiny" style={{ marginTop: 14 }}>
              Les visites et les canaux d’acquisition ne sont pas suivis aujourd’hui (aucune infrastructure de tracking) — hors périmètre de ce plan.
            </p>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="between" style={{ padding: '18px 20px' }}>
              <h3 className="h-3">Rétention par cohorte</h3>
              <span className="tiny">% ayant réservé le mois indiqué après l’inscription</span>
            </div>
            <table className="table">
              <thead><tr><th>Cohorte</th><th>Taille</th><th>M+1</th><th>M+2</th><th>M+3</th></tr></thead>
              <tbody>
                {cohorts.map((c) => (
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
      )}
    </>
  );
}
