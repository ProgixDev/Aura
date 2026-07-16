'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/ui/StatCard';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { BarChart, LineChart, Donut } from '@/components/ui/MiniChart';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { euro, dateFr, relativeFr } from '@/lib/format';

// rendez_vous.statut vocab — same map as web/app/admin/reservations/page.jsx.
const STATUT_LABEL = { en_attente: 'En attente', confirme: 'Confirmée', termine: 'Terminée', annule: 'Annulée' };
const STATUT_TONE = { en_attente: 'warning', confirme: 'success', termine: 'neutral', annule: 'danger' };
// audit-log.category vocab — same map as web/app/admin/audit/page.jsx.
const KIND_LABEL = {
  moderation: 'Modération', verification: 'Vérification', finance: 'Finance',
  security: 'Sécurité', support: 'Support', system: 'Système',
};
const KIND_TONE = {
  moderation: 'info', verification: 'verified', finance: 'warning',
  security: 'danger', support: 'success', system: 'neutral',
};

export default function AdminDashboard() {
  const { data: dashboardData, isError: dashboardError } = useQuery({
    queryKey: ['admin', 'analytics', 'dashboard'],
    queryFn: () => api.get('/admin/analytics/dashboard'),
  });
  const { data: revenueData, isError: revenueError } = useQuery({
    queryKey: ['admin', 'analytics', 'revenue'],
    queryFn: () => api.get('/admin/analytics/revenue'),
  });
  const { data: growthData, isError: growthError } = useQuery({
    queryKey: ['admin', 'analytics', 'growth'],
    queryFn: () => api.get('/admin/analytics/growth'),
  });
  const { data: retentionData, isError: retentionError } = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: () => api.get('/admin/analytics/retention'),
  });
  // Only the analytics-driven widgets below (StatCards, charts, retention donut) depend on
  // these queries — the rest of this page (recent bookings, verification queue, alerts,
  // recent activity) fetches independently and degrades per-widget on failure.
  const analyticsError = dashboardError || revenueError || growthError || retentionError;

  const dash = dashboardData?.data;
  const revenueMonthly = (revenueData?.data?.par_mois ?? []).map((r) => r.total);
  const bookingsWeekly = growthData?.data?.bookings_this_week ?? [];
  const retention90 = retentionData?.data?.overall?.retention_90j_pct;

  const { data: bookingsData, isError: bookingsError } = useQuery({
    queryKey: ['admin', 'rendez-vous', 'recent'],
    queryFn: () => api.get('/admin/rendez-vous?per_page=5'),
  });
  const recentBookings = (bookingsData?.data ?? []).map((b) => {
    const prat = b.praticien ? mapPraticien(b.praticien) : null;
    return {
      id: b.id,
      praticienName: prat?.name ?? '—',
      praticienPhoto: prat?.photo ?? null,
      clientName: b.client ? `${b.client.firstname} ${b.client.lastname}` : '—',
      date: b.date_heure,
      price: b.tarif,
      statut: b.statut,
    };
  });

  const { data: verifData, isError: verifError } = useQuery({
    queryKey: ['admin', 'praticiens', 'verification', 'recent'],
    queryFn: () => api.get('/v1/admin/praticiens/verification?per_page=4'),
  });
  const pendingVerif = verifData?.data ?? [];

  const { data: notifData, isError: notifError } = useQuery({
    queryKey: ['admin', 'notifications', 'recent'],
    queryFn: () => api.get('/notifications?per_page=4'),
  });
  const alerts = notifData?.data ?? [];

  const { data: auditData, isError: auditError } = useQuery({
    queryKey: ['admin', 'audit-logs', 'recent'],
    queryFn: () => api.get('/admin/audit-logs?per_page=5'),
  });
  const recentActivity = (auditData?.data ?? []).map((row) => ({
    id: row.id,
    when: relativeFr(row.created_at),
    action: row.action,
    kind: row.category,
  }));

  return (
    <>
      <PageHead title="Tableau de bord" subtitle="Bonjour Aïcha — voici l'activité d'Aura aujourd'hui."
        actions={<>
          <ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
          <ModalButton modal="sendNotification" className="btn btn-primary btn-sm"><Icon name="bell" size={15} /> Notifier</ModalButton>
        </>} />

      {analyticsError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les statistiques analytiques.</div>}

      {!analyticsError && (
        <>
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Revenu du mois" value={euro(dash?.revenue_this_month)}
              delta={dash?.revenue_delta_pct != null ? `${dash.revenue_delta_pct > 0 ? '+' : ''}${dash.revenue_delta_pct}%` : undefined}
              deltaDir={dash?.revenue_delta_pct != null && dash.revenue_delta_pct < 0 ? 'down' : 'up'}
              icon="euro" />
            <StatCard label="Réservations" value={dash?.bookings_this_month ?? '—'}
              delta={dash?.bookings_delta_pct != null ? `${dash.bookings_delta_pct > 0 ? '+' : ''}${dash.bookings_delta_pct}%` : undefined}
              deltaDir={dash?.bookings_delta_pct != null && dash.bookings_delta_pct < 0 ? 'down' : 'up'}
              icon="calendar" />
            <StatCard label="Nouveaux praticiens" value={dash?.new_praticiens_this_month ?? '—'}
              delta={dash?.new_praticiens_delta != null ? `${dash.new_praticiens_delta > 0 ? '+' : ''}${dash.new_praticiens_delta}` : undefined}
              deltaDir={dash?.new_praticiens_delta != null && dash.new_praticiens_delta < 0 ? 'down' : 'up'}
              icon="sparkle" />
            <StatCard label="Taux de remboursement" value={dash?.refund_rate ?? '—'} icon="shield" />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card card-pad">
              <div className="between" style={{ marginBottom: 18 }}>
                <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Revenu</h3></div>
                <Link href="/admin/analytique/revenus" className="more">Détails →</Link>
              </div>
              <LineChart data={revenueMonthly} height={180} />
            </div>
            <div className="card card-pad">
              <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations / semaine</h3>
              <BarChart data={bookingsWeekly.map((d) => d.count)} labels={bookingsWeekly.map((d) => d.jour)} height={150} color="var(--sage-2)" />
            </div>
          </div>
        </>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Recent bookings */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Réservations récentes</h3>
            <Link href="/admin/reservations" className="more">Tout voir →</Link>
          </div>
          {bookingsError ? (
            <div className="empty"><div className="glyph">❍</div>Impossible de charger les réservations.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Réf.</th><th>Praticien</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="clickable">
                    <td className="table-cell-main">RDV-{b.id}</td>
                    <td><div className="row gap-2"><Avatar src={b.praticienPhoto} name={b.praticienName} size={28} />{b.praticienName}</div></td>
                    <td>{b.clientName}</td>
                    <td className="small">{dateFr(b.date)}</td>
                    <td>{euro(b.price)}</td>
                    <td><Badge variant={STATUT_TONE[b.statut] || 'neutral'} dot>{STATUT_LABEL[b.statut] || b.statut}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Side column */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 className="h-3">File de vérification</h3>
              <Badge variant="warning">{pendingVerif.length}</Badge>
            </div>
            {verifError ? (
              <div className="small muted">Impossible de charger la file de vérification.</div>
            ) : (
              <div className="stack gap-3">
                {pendingVerif.map((p) => (
                  <Link key={p.id} href="/admin/praticiens/verification" className="row gap-3">
                    <Avatar name={`${p.firstname} ${p.lastname}`} size={36} />
                    <div className="flex-1"><div style={{ fontWeight: 500, fontSize: 14 }}>{p.firstname} {p.lastname}</div><div className="tiny">{p.specialite} · {p.ville}</div></div>
                    <Icon name="chevronRight" size={16} color="var(--muted)" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card card-pad center">
            <h3 className="h-3" style={{ marginBottom: 14 }}>Rétention 90j</h3>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Donut value={retention90 ?? 0} label="reviennent" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts + recent activity */}
      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 14 }}>Alertes système</h3>
          {notifError ? (
            <div className="small muted">Impossible de charger les alertes.</div>
          ) : (
            <div className="stack gap-3">
              {alerts.map((n) => (
                <div key={n.id} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span className="kpi-dot" style={{ marginTop: 6, background: 'var(--sky-2)' }} />
                  <div className="flex-1">
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{n.titre}</div>
                    <div className="small">{n.message}</div>
                    <div className="tiny" style={{ marginTop: 2 }}>{relativeFr(n.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Activité récente</h3>
            <Link href="/admin/audit" className="more">Journal complet →</Link>
          </div>
          {auditError ? (
            <div className="empty"><div className="glyph">❍</div>Impossible de charger l’activité récente.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Action</th><th>Catégorie</th><th>Quand</th></tr></thead>
              <tbody>
                {recentActivity.map((a) => (
                  <tr key={a.id}>
                    <td className="small">{a.action}</td>
                    <td><Badge variant={KIND_TONE[a.kind] || 'neutral'} dot>{KIND_LABEL[a.kind] || a.kind}</Badge></td>
                    <td className="tiny">{a.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
