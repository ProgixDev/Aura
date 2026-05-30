import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

const EVENTS = [
  { label: 'Nouvelle réservation', email: true, push: true, sms: false },
  { label: 'Confirmation de séance', email: true, push: true, sms: true },
  { label: 'Rappel 24 h avant', email: true, push: true, sms: true },
  { label: 'Annulation / report', email: true, push: true, sms: false },
  { label: 'Paiement reçu', email: true, push: false, sms: false },
  { label: 'Remboursement émis', email: true, push: false, sms: false },
  { label: 'Nouvel avis reçu', email: true, push: true, sms: false },
  { label: 'Demande de vérification', email: true, push: false, sms: false },
  { label: 'Litige ouvert', email: true, push: true, sms: false },
  { label: 'Versement effectué', email: true, push: false, sms: false },
];

function Toggle({ on }) {
  return (
    <span className={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on} style={{ display: 'inline-block' }}><span className="knob" /></span>
  );
}

export default function NotificationSettingsPage() {
  return (
    <>
      <PageHead
        title="Notifications"
        subtitle="Choisissez les canaux pour chaque type d’événement."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réglages', href: '/admin/parametres' }, { label: 'Notifications' }]}
        actions={<ToastButton message="Préférences de notification enregistrées" tone="success" className="btn btn-primary btn-sm"><Icon name="check" size={15} /> Enregistrer</ToastButton>}
      />

      <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div className="between" style={{ padding: '18px 20px' }}>
          <h3 className="h-3">Canaux par événement</h3>
          <span className="tiny">email · push · SMS</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Événement</th>
              <th className="center"><span className="row gap-2" style={{ justifyContent: 'center' }}><Icon name="mail" size={15} /> Email</span></th>
              <th className="center"><span className="row gap-2" style={{ justifyContent: 'center' }}><Icon name="bell" size={15} /> Push</span></th>
              <th className="center"><span className="row gap-2" style={{ justifyContent: 'center' }}><Icon name="message" size={15} /> SMS</span></th>
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((e) => (
              <tr key={e.label}>
                <td className="table-cell-main">{e.label}</td>
                <td className="center"><Toggle on={e.email} /></td>
                <td className="center"><Toggle on={e.push} /></td>
                <td className="center"><Toggle on={e.sms} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="note tint-sky" style={{ marginBottom: 24 }}>
        <p className="small"><strong className="serif-accent">À noter —</strong> les SMS sont facturés via le fournisseur Twilio. Vérifiez votre intégration dans <a className="more" href="/admin/parametres/integrations">Intégrations</a> pour activer ce canal.</p>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <ToastButton message="Préférences de notification enregistrées" tone="success" className="btn btn-primary"><Icon name="check" size={16} /> Enregistrer les modifications</ToastButton>
      </div>
    </>
  );
}
