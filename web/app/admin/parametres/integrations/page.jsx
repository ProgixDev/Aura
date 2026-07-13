import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

const INTEGRATIONS = [
  { id: 'stripe', name: 'Stripe', icon: 'card', tint: 'tint-violet', glyph: 'var(--violet-2)', desc: 'Paiements, versements et gestion des abonnements.', connected: true, meta: 'Compte aura_live · synchronisé il y a 5 min' },
  { id: 'gcal', name: 'Google Calendar', icon: 'calendar', tint: 'tint-sky', glyph: 'var(--sky-2)', desc: 'Synchronisation des créneaux et séances des praticiens.', connected: true, meta: '142 agendas connectés' },
  { id: 'mailchimp', name: 'Mailchimp', icon: 'mail', tint: 'tint-gold', glyph: 'var(--gold)', desc: 'Campagnes email et newsletters automatisées.', connected: true, meta: 'Liste « Aura — Clients » · 6 840 contacts' },
  { id: 'twilio', name: 'Twilio', icon: 'message', tint: 'tint-sage', glyph: 'var(--sage-2)', desc: 'Notifications SMS transactionnelles et rappels.', connected: false, meta: 'Requis pour activer le canal SMS' },
  { id: 'zapier', name: 'Zapier', icon: 'layers', tint: 'tint-violet', glyph: 'var(--violet-2)', desc: 'Automatisations vers vos outils tiers.', connected: false, meta: 'Connectez plus de 5 000 applications' },
];

export default function IntegrationsSettingsPage() {
  const connected = INTEGRATIONS.filter((i) => i.connected).length;

  return (
    <>
      <PageHead
        title="Intégrations"
        subtitle={`${connected} sur ${INTEGRATIONS.length} services connectés.`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réglages', href: '/admin/parametres' }, { label: 'Intégrations' }]}
      />

      <div className="grid grid-2">
        {INTEGRATIONS.map((it) => (
          <div key={it.id} className="card card-pad">
            <div className="between" style={{ marginBottom: 12 }}>
              <div className="row gap-3">
                <span className={`tile-icon ${it.tint}`}><Icon name={it.icon} size={18} color={it.glyph} /></span>
                <div>
                  <h3 className="h-4">{it.name}</h3>
                  <Badge variant={it.connected ? 'success' : 'neutral'} dot>{it.connected ? 'Connecté' : 'Non connecté'}</Badge>
                </div>
              </div>
            </div>
            <p className="small" style={{ marginBottom: 8 }}>{it.desc}</p>
            <div className="tiny" style={{ marginBottom: 16 }}>{it.meta}</div>
            <div className="row gap-2 wrap">
              {it.connected ? (
                <>
                  <ToastButton message={`${it.name} resynchronisé`} tone="success" className="btn btn-soft btn-sm"><Icon name="layers" size={15} /> Resynchroniser</ToastButton>
                  <ToastButton message={`${it.name} déconnecté`} tone="danger" className="btn btn-danger-soft btn-sm"><Icon name="x" size={15} /> Déconnecter</ToastButton>
                </>
              ) : (
                <ToastButton message={`${it.name} connecté`} tone="success" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Connecter</ToastButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
