import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { adminNotifications } from '@/lib/data/admin';

const KIND_COLOR = { danger: 'var(--danger)', warning: 'var(--gold)', success: 'var(--sage-2)', info: 'var(--sky-2)' };
const KIND_TONE = { danger: 'danger', warning: 'warning', success: 'success', info: 'info' };

// Faux sent history
const sentHistory = [
  { id: 'sn1', title: 'Nouvelle retraite en Ardèche', audience: 'Tous les clients', channel: 'Push + Email', sent: '28 mai 2026', reach: '12 480', status: 'sent' },
  { id: 'sn2', title: 'Rappel : complétez votre profil', audience: 'Praticiens non vérifiés', channel: 'Email', sent: '24 mai 2026', reach: '46', status: 'sent' },
  { id: 'sn3', title: 'Code BIENVENUE15 prolongé', audience: 'Nouveaux inscrits', channel: 'Push', sent: '20 mai 2026', reach: '3 210', status: 'sent' },
  { id: 'sn4', title: 'Maintenance planifiée dimanche', audience: 'Tous les utilisateurs', channel: 'In-app', sent: 'Programmée · 2 juin', reach: '—', status: 'scheduled' },
];

export default function AdminNotificationsPage() {
  return (
    <>
      <PageHead
        title="Notifications"
        subtitle="Alertes système et envois aux utilisateurs"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Notifications' }]}
        actions={
          <ModalButton modal="sendNotification" className="btn btn-primary btn-sm"><Icon name="bell" size={15} /> Composer</ModalButton>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 20, alignItems: 'start' }}>
        {/* System alerts + composer */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 className="h-3">Alertes système</h3>
              <Badge variant="warning">{adminNotifications.length}</Badge>
            </div>
            <div className="stack gap-3">
              {adminNotifications.map((n) => (
                <div key={n.id} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span className="kpi-dot" style={{ marginTop: 6, background: KIND_COLOR[n.kind] || 'var(--sky-2)' }} />
                  <div className="flex-1">
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{n.title}</div>
                    <div className="small">{n.body}</div>
                    <div className="tiny" style={{ marginTop: 2 }}>{n.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad tint-violet">
            <h3 className="h-4" style={{ marginBottom: 6 }}>Composer une notification</h3>
            <p className="small" style={{ marginBottom: 14 }}>
              Diffusez une annonce <span className="serif italic accent">ciblée</span> par push, email ou in-app à un segment d'utilisateurs.
            </p>
            <ModalButton modal="sendNotification" className="btn btn-primary btn-block"><Icon name="bell" size={15} /> Nouvelle notification</ModalButton>
          </div>
        </div>

        {/* Sent history */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-3">Historique des envois</h3>
            <ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={14} /> Exporter</ModalButton>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Notification</th><th>Audience</th><th>Canal</th><th>Envoyée</th><th>Portée</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {sentHistory.map((s) => (
                  <tr key={s.id}>
                    <td className="table-cell-main">{s.title}</td>
                    <td className="small">{s.audience}</td>
                    <td className="small">{s.channel}</td>
                    <td className="small">{s.sent}</td>
                    <td>{s.reach}</td>
                    <td><Badge variant={s.status === 'scheduled' ? 'warning' : 'success'} dot>{s.status === 'scheduled' ? 'Programmée' : 'Envoyée'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
