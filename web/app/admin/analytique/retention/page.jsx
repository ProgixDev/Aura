'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { LineChart, Donut } from '@/components/ui/MiniChart';
import { api } from '@/lib/api';
import { num, euro } from '@/lib/format';

export default function RetentionAnalyticsPage() {
  const { data: retentionData, isError } = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: () => api.get('/admin/analytics/retention'),
  });
  const retention = retentionData?.data;
  const overall = retention?.overall;
  const curve = overall?.curve ?? [];
  const repeatBookings = retention?.repeat_bookings ?? [];
  const repeatTones = ['var(--line)', 'var(--sky-2)', 'var(--sage-2)', 'var(--violet-2)'];

  return (
    <>
      <PageHead
        title="Rétention"
        subtitle="Fidélité, réservations répétées et attrition."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Analytique', href: '/admin/analytique' }, { label: 'Rétention' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les données de rétention.</div>}

      {!isError && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Rétention 90 j" value={overall?.retention_90j_pct != null ? `${overall.retention_90j_pct}%` : '—'} icon="users" />
            <StatCard label="Réservations répétées" value={retention?.repeat_rate_pct != null ? `${retention.repeat_rate_pct}%` : '—'} icon="calendar" />
            <StatCard label="Valeur vie client" value={euro(retention?.avg_lifetime_value)} icon="euro" />
            <StatCard label="Taux d’attrition" value={retention?.churn_rate_pct != null ? `${retention.churn_rate_pct}%` : '—'} icon="chart" />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 30 j</h3>
              <Donut value={overall?.retention_30j_pct ?? 0} label="actifs" color="var(--sky-2)" />
            </div>
            <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 90 j</h3>
              <Donut value={overall?.retention_90j_pct ?? 0} label="reviennent" color="var(--violet-2)" />
            </div>
            <div className="card card-pad center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 className="h-4" style={{ marginBottom: 16 }}>Rétention 12 mois</h3>
              <Donut value={overall?.retention_12m_pct ?? 0} label="fidèles" color="var(--sage-2)" />
            </div>
          </div>

          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div className="between" style={{ marginBottom: 18 }}>
              <div><div className="eyebrow">Cohortes d’inscription combinées</div><h3 className="h-3" style={{ marginTop: 4 }}>Courbe de rétention</h3></div>
              <span className="small">% ayant réservé N mois après l’inscription</span>
            </div>
            <LineChart data={curve.map((c) => c.pct ?? 0)} height={200} color="var(--violet-2)" />
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
              {curve.map((c) => <div key={c.offset} className="flex-1 tiny center">{c.offset}</div>)}
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            <div className="card card-pad">
              <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations répétées</h3>
              <div className="stack gap-4">
                {repeatBookings.map((r, i) => (
                  <div key={r.label}>
                    <div className="between" style={{ marginBottom: 6 }}>
                      <span className="small">{r.label}</span>
                      <span className="small"><strong>{num(r.count)}</strong> <span className="tiny">· {r.pct}%</span></span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${r.pct}%`, maxWidth: '100%', background: repeatTones[i % repeatTones.length], borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="note tint-gold">
              <h3 className="h-4" style={{ marginBottom: 10 }}>À propos du churn</h3>
              <p className="small">
                L’attrition (mois +3 après inscription) s’établit à{' '}
                <strong className="serif-accent">{retention?.churn_rate_pct != null ? `${retention.churn_rate_pct}%` : '—'}</strong>.
              </p>
              <p className="small" style={{ marginTop: 10 }}>
                Motifs de départ : non disponible — aucun champ de motif d’annulation n’existe aujourd’hui dans le schéma des réservations.
              </p>
              <div className="row gap-2 wrap" style={{ marginTop: 14 }}>
                <ModalButton modal="sendNotification" className="btn btn-soft btn-sm"><Icon name="bell" size={15} /> Campagne de réactivation</ModalButton>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
