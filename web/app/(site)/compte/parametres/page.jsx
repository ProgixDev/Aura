import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { Toggle } from './Toggle';

export const metadata = { title: 'Paramètres — AURA' };

const NOTIFS = [
  { label: 'Rappels de séance', desc: 'Un rappel 24h et 1h avant chaque rendez-vous.', on: true },
  { label: 'Nouveaux messages', desc: 'Soyez averti dès qu\'un praticien vous répond.', on: true },
  { label: 'Réponses à mes avis', desc: 'Quand un praticien réagit à votre retour.', on: false },
  { label: 'Newsletter AURA', desc: 'Inspirations, événements et nouveautés, une fois par mois.', on: true },
];

function Row({ label, desc, on }) {
  return (
    <div className="row between gap-3" style={{ padding: '12px 0' }}>
      <div>
        <div className="small" style={{ fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div className="tiny muted">{desc}</div>
      </div>
      <Toggle defaultOn={on} />
    </div>
  );
}

export default function ParametresPage() {
  return (
    <div className="stack gap-6">
      <header className="reveal r-1">
        <h1 className="h-1">Paramètres</h1>
        <p className="lead" style={{ marginTop: 4 }}>Gérez votre compte et vos <span className="serif italic accent">préférences</span>.</p>
      </header>

      {/* Profil */}
      <section className="card card-pad">
        <h2 className="h-3 mb-3">Profil</h2>
        <div className="grid grid-2">
          <div className="field"><label>Prénom</label><input className="input" defaultValue="Sarah" /></div>
          <div className="field"><label>Nom</label><input className="input" defaultValue="Lemoine" /></div>
          <div className="field"><label>Email</label><input className="input" type="email" defaultValue="sarah.lemoine@example.com" /></div>
          <div className="field"><label>Téléphone</label><input className="input" type="tel" defaultValue="+33 6 11 22 33 44" /></div>
          <div className="field" style={{ gridColumn: '1 / -1' }}><label>Ville</label><input className="input" defaultValue="Annecy" /></div>
        </div>
        <div className="row gap-2 mt-3"><ToastButton message="Profil enregistré" className="btn btn-primary">Enregistrer</ToastButton></div>
      </section>

      {/* Notifications */}
      <section className="card card-pad">
        <h2 className="h-3 mb-2">Notifications</h2>
        <div className="stack" style={{ divideColor: 'var(--line)' }}>
          {NOTIFS.map((n, i) => (
            <div key={n.label}>
              {i > 0 && <div className="divider" />}
              <Row {...n} />
            </div>
          ))}
        </div>
      </section>

      {/* Confidentialité */}
      <section className="card card-pad">
        <h2 className="h-3 mb-2">Confidentialité</h2>
        <div className="stack">
          <Row label="Profil visible des praticiens" desc="Autoriser les praticiens à voir votre prénom et votre ville." on />
          <div className="divider" />
          <Row label="Partage des données d'usage" desc="Aider à améliorer AURA de façon anonyme." on={false} />
        </div>
        <div className="divider" />
        <div className="row gap-2 wrap mt-2">
          <ModalButton modal="exportData" payload={{ title: 'Exporter mes données' }} className="btn btn-soft btn-sm"><Icon name="download" size={14} /> Exporter mes données</ModalButton>
          <ToastButton message="Demande envoyée" className="btn btn-ghost btn-sm">Demander la suppression de l'historique</ToastButton>
        </div>
      </section>

      {/* Langue */}
      <section className="card card-pad">
        <h2 className="h-3 mb-3">Langue & région</h2>
        <div className="grid grid-2">
          <div className="field"><label>Langue</label><select className="input" defaultValue="fr"><option value="fr">Français</option><option value="en">English</option></select></div>
          <div className="field"><label>Fuseau horaire</label><select className="input" defaultValue="paris"><option value="paris">Europe / Paris (GMT+1)</option><option value="brussels">Europe / Bruxelles</option><option value="geneva">Europe / Genève</option></select></div>
        </div>
        <div className="row gap-2 mt-3"><ToastButton message="Préférences enregistrées" className="btn btn-primary">Enregistrer</ToastButton></div>
      </section>

      {/* Sécurité */}
      <section className="card card-pad">
        <h2 className="h-3 mb-3">Sécurité</h2>
        <div className="row gap-2 wrap">
          <ModalButton modal="form" payload={{ title: 'Changer le mot de passe', fields: [{ name: 'current', label: 'Mot de passe actuel', type: 'password', required: true }, { name: 'next', label: 'Nouveau mot de passe', type: 'password', required: true }, { name: 'confirm', label: 'Confirmer', type: 'password', required: true }], submitLabel: 'Mettre à jour', successToast: 'Mot de passe mis à jour' }} className="btn btn-soft btn-sm"><Icon name="shield" size={14} /> Changer le mot de passe</ModalButton>
          <ToastButton message="Déconnecté de tous les appareils" tone="danger" className="btn btn-ghost btn-sm"><Icon name="logout" size={14} /> Déconnecter tous les appareils</ToastButton>
        </div>
      </section>

      {/* Danger zone */}
      <section className="card card-pad" style={{ borderColor: 'var(--danger, #d98b8b)' }}>
        <h2 className="h-3 mb-1" style={{ color: 'var(--danger, #b5524f)' }}>Zone sensible</h2>
        <p className="small mb-3">La suppression de votre compte est définitive. Vos réservations, messages et avis seront effacés.</p>
        <ModalButton modal="deleteItem" payload={{ title: 'Supprimer mon compte', message: 'Cette action est irréversible. Toutes vos données seront définitivement supprimées. Confirmez-vous ?', confirmLabel: 'Supprimer mon compte', danger: true, successToast: 'Compte supprimé' }} className="btn btn-danger"><Icon name="trash" size={15} /> Supprimer mon compte</ModalButton>
      </section>
    </div>
  );
}
