import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

export const metadata = { title: 'Contact — Aura' };

const CHANNELS = [
  { i: 'mail', t: 'Écrire à l’équipe', d: 'Une question, une suggestion ? On répond sous 24h ouvrées.', v: 'bonjour@aura.fr' },
  { i: 'shield', t: 'Confiance & sécurité', d: 'Signaler un comportement, un litige, un abus.', v: 'securite@aura.fr' },
  { i: 'star', t: 'Presse', d: 'Demandes média, interviews, kit de presse.', v: 'presse@aura.fr' },
];

const LINKS = [
  { t: 'Centre d’aide', d: 'Articles, guides et réponses immédiates.', href: '/aide', i: 'book' },
  { t: 'Questions fréquentes', d: 'Réservation, paiement, vérification.', href: '/faq', i: 'message' },
  { t: 'Devenir praticien', d: 'Rejoignez la communauté Aura.', href: '/devenir-praticien', i: 'sparkle' },
];

const FORM_FIELDS = [
  { name: 'name', label: 'Votre nom', type: 'text', required: true },
  { name: 'email', label: 'Votre email', type: 'email', required: true },
  { name: 'sujet', label: 'Sujet', type: 'select', options: ['Question générale', 'Réservation', 'Paiement', 'Praticiens', 'Presse', 'Autre'], required: true },
  { name: 'message', label: 'Votre message', type: 'textarea', required: true },
];

export default function ContactPage() {
  return (
    <>
      <section className="aurora-dark grain" style={{ '--orb-x': '78%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '96px 0 100px' }}>
        <div className="container-narrow reveal center">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Parlons-en</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 18px' }}>
            Une question ? Nous sommes <span className="italic" style={{ color: 'var(--violet)' }}>à l’écoute</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto' }}>
            Que vous soyez en pleine recherche, praticien curieux ou journaliste, écrivez-nous. Une vraie personne vous répondra.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1.1fr', gap: 40, alignItems: 'start' }}>
            {/* LEFT — info */}
            <div className="stack" style={{ gap: 28 }}>
              <div>
                <span className="eyebrow">Nous joindre</span>
                <h2 className="h-2" style={{ marginTop: 8 }}>Le bon interlocuteur</h2>
              </div>
              <div className="stack" style={{ gap: 14 }}>
                {CHANNELS.map((c) => (
                  <div key={c.t} className="card card-pad row gap-3" style={{ alignItems: 'flex-start' }}>
                    <span className="tile-icon tint-violet"><Icon name={c.i} size={20} color="var(--violet-2)" /></span>
                    <div className="flex-1">
                      <h3 className="h-4" style={{ marginBottom: 4 }}>{c.t}</h3>
                      <p className="small" style={{ marginBottom: 6 }}>{c.d}</p>
                      <span className="serif italic accent">{c.v}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card card-pad tint-sage">
                <div className="row gap-2" style={{ marginBottom: 8 }}>
                  <Icon name="pin" size={18} color="var(--muted)" />
                  <h3 className="h-4">Nos bureaux</h3>
                </div>
                <p className="body">12 rue des Lilas, 75011 Paris — France.<br />Une équipe distribuée entre Paris, Lyon et Annecy.</p>
                <p className="small mt-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={14} color="var(--muted)" /> Du lundi au vendredi, 9h–18h.
                </p>
              </div>

              <div>
                <h3 className="h-4" style={{ marginBottom: 12 }}>Plus rapide encore</h3>
                <div className="grid grid-3" style={{ gap: 12 }}>
                  {LINKS.map((l) => (
                    <Link key={l.t} href={l.href} className="card card-pad card-hover stack" style={{ gap: 6 }}>
                      <Icon name={l.i} size={18} color="var(--violet-2)" />
                      <div style={{ fontWeight: 500 }}>{l.t}</div>
                      <div className="tiny muted">{l.d}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — form card */}
            <div className="card card-pad" style={{ position: 'sticky', top: 100 }}>
              <span className="eyebrow">Formulaire</span>
              <h2 className="h-2" style={{ margin: '8px 0 6px' }}>Nous écrire</h2>
              <p className="body" style={{ marginBottom: 22 }}>Remplissez ce court formulaire, nous revenons vers vous au plus vite.</p>

              <div className="field"><label>Votre nom</label><input className="input" placeholder="Camille Dupont" /></div>
              <div className="field" style={{ marginTop: 14 }}><label>Votre email</label><input className="input" placeholder="vous@email.fr" /></div>
              <div className="field" style={{ marginTop: 14 }}><label>Sujet</label>
                <select className="input"><option>Question générale</option><option>Réservation</option><option>Paiement</option><option>Praticiens</option><option>Presse</option><option>Autre</option></select>
              </div>
              <div className="field" style={{ marginTop: 14 }}><label>Votre message</label><textarea className="input" rows={5} placeholder="Dites-nous tout…" /></div>

              <div className="mt-3">
                <ModalButton
                  modal="form"
                  payload={{ title: 'Nous écrire', fields: FORM_FIELDS, submitLabel: 'Envoyer le message', successToast: 'Message envoyé — nous revenons vers vous sous 24h.' }}
                  className="btn btn-primary btn-block btn-lg"
                >
                  Envoyer le message
                </ModalButton>
              </div>
              <p className="tiny muted center mt-2">En envoyant, vous acceptez notre politique de confidentialité.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
