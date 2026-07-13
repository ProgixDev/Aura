'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ModalButton } from '@/components/ui/ModalButton';

const ROLES = [
  { key: 'client', icon: 'heart', title: 'Je cherche un praticien', desc: 'Trouvez, échangez et réservez des séances en toute confiance.' },
  { key: 'praticien', icon: 'sparkle', title: 'Je suis praticien', desc: 'Recevez des demandes, gérez votre agenda, développez votre activité.' },
];

const PERKS = [
  'Inscription gratuite, sans engagement',
  'Vos données protégées et confidentielles',
  'Annulation gratuite jusqu’à 24h avant',
];

export default function InscriptionPage() {
  const [role, setRole] = useState('client');

  return (
    <section className="section">
      <div className="container">
        <div className="card" style={{ overflow: 'hidden', padding: 0, maxWidth: 960, margin: '0 auto' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, alignItems: 'stretch' }}>
            {/* Aurora panel */}
            <div
              className="aurora-dark grain reveal hide-sm"
              style={{ '--orb-x': '70%', '--orb-y': '25%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div className="row gap-2">
                <Lotus size={22} color="#fff" />
                <span className="serif" style={{ color: '#fff', fontSize: 22, letterSpacing: '.04em' }}>AURA</span>
              </div>
              <div>
                <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>
                  Rejoignez un lieu de <span className="italic" style={{ color: 'var(--violet)' }}>confiance</span>.
                </h2>
                <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', marginBottom: 24 }}>
                  Des milliers de personnes prennent soin d’elles autrement. À votre tour.
                </p>
                <ul className="stack gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {PERKS.map((t) => (
                    <li key={t} className="row gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      <Icon name="checkCircle" size={18} color="var(--violet)" /> <span className="small">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="tiny" style={{ color: 'rgba(255,255,255,0.55)' }}>2 400+ praticiens vérifiés vous attendent.</p>
            </div>

            {/* Form panel */}
            <div className="card-pad reveal r-1" style={{ padding: '48px 40px' }}>
              <span className="eyebrow">Inscription</span>
              <h1 className="h-2" style={{ margin: '6px 0 18px' }}>Créer un compte</h1>

              {/* Role choice */}
              <div className="stack gap-3" style={{ marginBottom: 22 }}>
                {ROLES.map((r) => {
                  const active = role === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className="card card-pad card-hover"
                      style={{
                        textAlign: 'left', cursor: 'pointer', padding: '14px 16px',
                        border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                        background: active ? 'rgba(164,139,216,0.08)' : 'var(--card)',
                      }}
                    >
                      <div className="row gap-3" style={{ alignItems: 'center' }}>
                        <span className="tile-icon tint-violet"><Icon name={r.icon} size={18} color="var(--violet-2)" /></span>
                        <div className="flex-1">
                          <div className="serif" style={{ fontSize: 16 }}>{r.title}</div>
                          <div className="tiny muted">{r.desc}</div>
                        </div>
                        {active && <Icon name="checkCircle" size={20} color="var(--violet-2)" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="field">
                <label>Nom complet</label>
                <input className="input" type="text" placeholder="Prénom Nom" autoComplete="name" />
              </div>
              <div className="field">
                <label>Adresse email</label>
                <input className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" />
              </div>
              <div className="field">
                <label>Mot de passe</label>
                <input className="input" type="password" placeholder="8 caractères minimum" autoComplete="new-password" />
              </div>

              <label className="row gap-2 tiny muted" style={{ margin: '4px 0 18px', cursor: 'pointer' }}>
                <input type="checkbox" className="checkbox" /> J’accepte les conditions générales et la politique de confidentialité.
              </label>

              <ModalButton
                modal="signup"
                payload={{ role }}
                className="btn btn-primary btn-block btn-lg"
              >
                {role === 'praticien' ? 'Créer mon espace praticien' : 'Créer mon compte'}
              </ModalButton>

              <p className="small center" style={{ marginTop: 24 }}>
                Déjà inscrit(e) ?{' '}
                <Link href="/connexion" style={{ color: 'var(--violet-2)', fontWeight: 600 }}>Se connecter</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
