'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUI } from '@/lib/store';

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
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useUI((s) => s.toast);
  const [role, setRole] = useState('client');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await api.post('/client/register', {
        firstname, lastname, email, city,
        password, password_confirmation: passwordConfirmation,
      });
      setSession(res.data.token, res.data.client);
      toast('Compte créé', 'success');
      router.push('/compte');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.body?.errors ?? {});
        setError('Merci de corriger les champs indiqués.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

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
                <span className="serif" style={{ color: '#fff', fontSize: 22, letterSpacing: '.04em' }}>GUÉRIENERGIES</span>
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

              {role === 'praticien' ? (
                <>
                  <p className="small" style={{ marginBottom: 18 }}>
                    L’inscription praticien se fait sur un parcours dédié (vérification de documents, tarifs, disciplines).
                  </p>
                  <Link href="/devenir-praticien" className="btn btn-primary btn-block btn-lg">
                    Devenir praticien
                  </Link>
                </>
              ) : (
                <form onSubmit={submit}>
                  {error && (
                    <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 14 }}>{error}</p>
                  )}
                  <div className="field">
                    <label>Prénom</label>
                    <input className="input" type="text" placeholder="Prénom" autoComplete="given-name" required value={firstname} onChange={(e) => setFirstname(e.target.value)} />
                    {fieldErrors.firstname && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.firstname[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Nom</label>
                    <input className="input" type="text" placeholder="Nom" autoComplete="family-name" required value={lastname} onChange={(e) => setLastname(e.target.value)} />
                    {fieldErrors.lastname && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.lastname[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Adresse email</label>
                    <input className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    {fieldErrors.email && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.email[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Ville</label>
                    <input className="input" type="text" placeholder="Paris" autoComplete="address-level2" required value={city} onChange={(e) => setCity(e.target.value)} />
                    {fieldErrors.city && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.city[0]}</p>}
                  </div>
                  <div className="field">
                    <label>Mot de passe</label>
                    <PasswordInput placeholder="8 caractères minimum" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Confirmer le mot de passe</label>
                    <PasswordInput placeholder="8 caractères minimum" autoComplete="new-password" required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />
                    {fieldErrors.password_confirmation && <p className="tiny" style={{ color: 'var(--danger, #b5524f)' }}>{fieldErrors.password_confirmation[0]}</p>}
                  </div>

                  <label className="row gap-2 tiny muted" style={{ margin: '4px 0 18px', cursor: 'pointer' }}>
                    <input type="checkbox" className="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} required />
                    J’accepte les conditions générales et la politique de confidentialité.
                  </label>

                  <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading || !accepted}>
                    {loading ? 'Création…' : 'Créer mon compte'}
                  </button>
                </form>
              )}

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
