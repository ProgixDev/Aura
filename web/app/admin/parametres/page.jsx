import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

const SUBPAGES = [
  { href: '/admin/parametres/facturation', icon: 'euro', tint: 'tint-violet', glyph: 'var(--violet-2)', title: 'Facturation', desc: 'Commission, versements, TVA et mentions légales.' },
  { href: '/admin/parametres/notifications', icon: 'bell', tint: 'tint-sky', glyph: 'var(--sky-2)', title: 'Notifications', desc: 'Canaux email, push et SMS par type d’événement.' },
  { href: '/admin/parametres/integrations', icon: 'layers', tint: 'tint-sage', glyph: 'var(--sage-2)', title: 'Intégrations', desc: 'Stripe, Google Calendar, Mailchimp, Twilio, Zapier.' },
];

const MODERATION = [
  { label: 'Modération automatique des avis', desc: 'Détecter et masquer les contenus signalés.', on: true },
  { label: 'Validation manuelle des praticiens', desc: 'Vérifier chaque profil avant publication.', on: true },
  { label: 'Filtre anti-contournement', desc: 'Bloquer les coordonnées dans les messages.', on: true },
  { label: 'Mode maintenance', desc: 'Suspendre temporairement l’accès public au site.', on: false },
];

export default function SettingsHubPage() {
  return (
    <>
      <PageHead
        title="Réglages"
        subtitle="Configuration générale de la plateforme GuériEnergies."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réglages' }]}
        actions={<ToastButton message="Réglages enregistrés" tone="success" className="btn btn-primary btn-sm"><Icon name="check" size={15} /> Enregistrer</ToastButton>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Général</h3>
          <div className="stack gap-4">
            <div className="field">
              <label>Nom de la plateforme</label>
              <input className="input" defaultValue="GuériEnergies" />
            </div>
            <div className="field">
              <label>Email de contact</label>
              <input className="input" type="email" defaultValue="bonjour@aura.fr" />
            </div>
            <div className="grid grid-2 gap-4">
              <div className="field">
                <label>Langue par défaut</label>
                <select className="input" defaultValue="fr">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="field">
                <label>Fuseau horaire</label>
                <select className="input" defaultValue="paris">
                  <option value="paris">Europe/Paris (UTC+1)</option>
                  <option value="london">Europe/London (UTC)</option>
                  <option value="montreal">America/Montreal (UTC-5)</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Devise</label>
              <select className="input" defaultValue="eur">
                <option value="eur">Euro (€)</option>
                <option value="chf">Franc suisse (CHF)</option>
                <option value="cad">Dollar canadien ($)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Modération & sécurité</h3>
          <div className="stack gap-4">
            {MODERATION.map((m) => (
              <div key={m.label} className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="flex-1" style={{ paddingRight: 12 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{m.label}</div>
                  <div className="tiny">{m.desc}</div>
                </div>
                <span className={`switch${m.on ? ' on' : ''}`} role="switch" aria-checked={m.on}><span className="knob" /></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-head" style={{ marginBottom: 14 }}>
        <h3 className="h-3">Réglages avancés</h3>
      </div>
      <div className="grid grid-3">
        {SUBPAGES.map((s) => (
          <Link key={s.href} href={s.href} className="card card-pad card-hover">
            <div className="row gap-3" style={{ marginBottom: 10 }}>
              <span className={`tile-icon ${s.tint}`}><Icon name={s.icon} size={18} color={s.glyph} /></span>
              <div className="flex-1"><div style={{ fontWeight: 600 }}>{s.title}</div></div>
              <Icon name="chevronRight" size={16} color="var(--muted)" />
            </div>
            <p className="tiny">{s.desc}</p>
          </Link>
        ))}
      </div>

      <div className="row" style={{ marginTop: 24, justifyContent: 'flex-end' }}>
        <ToastButton message="Réglages enregistrés" tone="success" className="btn btn-primary"><Icon name="check" size={16} /> Enregistrer les modifications</ToastButton>
      </div>
    </>
  );
}
