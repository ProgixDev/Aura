import Link from 'next/link';
import { StatCard } from '@/components/ui/StatCard';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { BarChart, LineChart, Donut } from '@/components/ui/MiniChart';
import { ModalButton } from '@/components/ui/ModalButton';
import { bookings, transactions, reports, analytics, adminNotifications } from '@/lib/data/admin';
import { practitioners } from '@/lib/data/practitioners';
import { euro, dateFr, tone } from '@/lib/format';

export default function AdminDashboard() {
  const recent = bookings.slice(0, 6);
  const pendingVerif = practitioners.slice(0, 4);
  return (
    <>
      <PageHead title="Tableau de bord" subtitle="Bonjour Aïcha — voici l'activité d'Aura aujourd'hui."
        actions={<>
          <ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
          <ModalButton modal="sendNotification" className="btn btn-primary btn-sm"><Icon name="bell" size={15} /> Notifier</ModalButton>
        </>} />

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Revenu du mois" value={euro(64500)} delta="+8,2%" deltaDir="up" icon="euro" />
        <StatCard label="Réservations" value="340" delta="+14%" deltaDir="up" icon="calendar" />
        <StatCard label="Nouveaux praticiens" value="28" delta="+5" deltaDir="up" icon="sparkle" />
        <StatCard label="Taux de litige" value="0,7%" delta="-0,2 pt" deltaDir="up" icon="shield" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <div className="between" style={{ marginBottom: 18 }}>
            <div><div className="eyebrow">12 derniers mois</div><h3 className="h-3" style={{ marginTop: 4 }}>Revenu</h3></div>
            <Link href="/admin/analytique/revenus" className="more">Détails →</Link>
          </div>
          <LineChart data={analytics.revenueMonthly} height={180} />
        </div>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Réservations / semaine</h3>
          <BarChart data={analytics.bookingsWeekly} labels={analytics.weekLabels} height={150} color="var(--sage-2)" />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Recent bookings */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Réservations récentes</h3>
            <Link href="/admin/reservations" className="more">Tout voir →</Link>
          </div>
          <table className="table">
            <thead><tr><th>Réf.</th><th>Praticien</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id} className="clickable">
                  <td className="table-cell-main">{b.ref}</td>
                  <td><div className="row gap-2"><Avatar src={b.practitionerPhoto} name={b.practitionerName} size={28} />{b.practitionerName}</div></td>
                  <td>{b.clientName}</td>
                  <td className="small">{dateFr(b.date)}</td>
                  <td>{euro(b.price)}</td>
                  <td><Badge variant={tone(b.status)}>{b.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Side column */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 className="h-3">File de vérification</h3>
              <Badge variant="warning">{pendingVerif.length}</Badge>
            </div>
            <div className="stack gap-3">
              {pendingVerif.map((p) => (
                <Link key={p.id} href="/admin/praticiens/verification" className="row gap-3">
                  <Avatar src={p.photo} name={p.name} size={36} tone={p.tone} />
                  <div className="flex-1"><div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div><div className="tiny">{p.specialties[0]} · {p.city}</div></div>
                  <Icon name="chevronRight" size={16} color="var(--muted)" />
                </Link>
              ))}
            </div>
          </div>

          <div className="card card-pad center">
            <h3 className="h-3" style={{ marginBottom: 14 }}>Rétention 90j</h3>
            <div className="row" style={{ justifyContent: 'center' }}><Donut value={analytics.retention} label="reviennent" /></div>
          </div>
        </div>
      </div>

      {/* Alerts + reports */}
      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 14 }}>Alertes système</h3>
          <div className="stack gap-3">
            {adminNotifications.map((n) => (
              <div key={n.id} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                <span className={`kpi-dot`} style={{ marginTop: 6, background: n.kind === 'danger' ? 'var(--danger)' : n.kind === 'warning' ? 'var(--gold)' : n.kind === 'success' ? 'var(--sage-2)' : 'var(--sky-2)' }} />
                <div><div style={{ fontWeight: 500, fontSize: 14 }}>{n.title}</div><div className="small">{n.body}</div><div className="tiny" style={{ marginTop: 2 }}>{n.when}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Signalements à traiter</h3>
            <Link href="/admin/signalements" className="more">Modérer →</Link>
          </div>
          <table className="table">
            <thead><tr><th>Type</th><th>Sujet</th><th>Priorité</th></tr></thead>
            <tbody>
              {reports.filter((r) => r.status === 'pending').map((r) => (
                <tr key={r.id}><td><Badge variant="neutral">{r.type}</Badge></td><td className="small">{r.target}</td><td><Badge variant={r.priority === 'haute' ? 'danger' : 'warning'}>{r.priority}</Badge></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
