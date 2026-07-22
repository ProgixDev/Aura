'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ModalButton } from '@/components/ui/ModalButton';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUI } from '@/lib/store';

const POINTS = [
  'Praticiens vérifiés un par un',
  'Paiement protégé, versé après la séance',
  'Messagerie sécurisée avant de réserver',
];

export default function ConnexionPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useUI((s) => s.toast);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/client/login', { email, password });
      setSession(res.data.token, res.data.client);
      toast('Bienvenue', 'success');
      router.push('/compte');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="card" style={{ overflow: 'hidden', padding: 0, maxWidth: 960, margin: '0 auto' }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, alignItems: 'stretch' }}>
            {/* Aurora welcome panel */}
            <div
              className="aurora-dark grain reveal hide-sm"
              style={{ '--orb-x': '30%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div className="row gap-2">
                <Lotus size={22} color="#fff" />
                <span className="serif" style={{ color: '#fff', fontSize: 22, letterSpacing: '.04em' }}>GUÉRIENERGIES</span>
              </div>
              <div>
                <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>
                  Ravie de vous <span className="italic" style={{ color: 'var(--violet)' }}>revoir</span>.
                </h2>
                <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', marginBottom: 24 }}>
                  Retrouvez vos praticiens, vos réservations et vos échanges, en toute sérénité.
                </p>
                <ul className="stack gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {POINTS.map((t) => (
                    <li key={t} className="row gap-2" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      <Icon name="checkCircle" size={18} color="var(--violet)" /> <span className="small">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="tiny" style={{ color: 'rgba(255,255,255,0.55)' }}>Un espace doux, respectueux, sans jugement.</p>
            </div>

            {/* Form panel */}
            <div className="card-pad reveal r-1" style={{ padding: '48px 40px' }}>
              <span className="eyebrow">Connexion</span>
              <h1 className="h-2" style={{ margin: '6px 0 22px' }}>Se connecter</h1>

              <form onSubmit={submit}>
                {error && (
                  <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 14 }}>{error}</p>
                )}
                <div className="field">
                  <label>Adresse email</label>
                  <input
                    className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="between">
                    <label>Mot de passe</label>
                    <Link href="/mot-de-passe-oublie" className="tiny" style={{ color: 'var(--violet-2)' }}>Oublié ?</Link>
                  </div>
                  <PasswordInput
                    placeholder="••••••••" autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <label className="row gap-2 small" style={{ margin: '4px 0 18px', cursor: 'pointer' }}>
                  <input type="checkbox" className="checkbox" /> Rester connecté(e)
                </label>

                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>

              <div className="row gap-3" style={{ alignItems: 'center', margin: '20px 0' }}>
                <div className="divider flex-1" style={{ margin: 0 }} />
                <span className="tiny muted">ou</span>
                <div className="divider flex-1" style={{ margin: 0 }} />
              </div>

              <ModalButton modal="login" className="btn btn-soft btn-block">
                <span className="row gap-2"><Icon name="mail" size={16} /> Continuer avec Google</span>
              </ModalButton>

              <p className="small center" style={{ marginTop: 24 }}>
                Pas encore de compte ?{' '}
                <Link href="/inscription" style={{ color: 'var(--violet-2)', fontWeight: 600 }}>Créer un compte</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
