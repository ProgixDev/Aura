'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { api, ApiError } from '@/lib/api';
import { useUI } from '@/lib/store';

export default function MotDePasseOubliePage() {
  const toast = useUI((s) => s.toast);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/client/forgot-password', { email });
      toast(res.message || 'Lien de réinitialisation envoyé — vérifiez vos emails', 'success');
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container-narrow" style={{ maxWidth: 480 }}>
        <div className="card card-pad reveal" style={{ padding: '40px 36px' }}>
          <div className="center" style={{ marginBottom: 22 }}>
            <span className="tile-icon tint-violet" style={{ margin: '0 auto 16px' }}>
              <Lotus size={22} color="var(--violet-2)" />
            </span>
            <span className="eyebrow">Mot de passe oublié</span>
            <h1 className="h-2" style={{ margin: '6px 0 8px' }}>
              Pas de <span className="serif-accent">panique</span>
            </h1>
            <p className="body">
              Saisissez votre adresse email : si un compte existe, nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
            </p>
          </div>

          {sent ? (
            <p className="small center" style={{ color: 'var(--ink-soft)' }}>
              Si un compte existe avec cette adresse, un email vient de vous être envoyé.
            </p>
          ) : (
            <form onSubmit={submit}>
              {error && <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 14 }}>{error}</p>}
              <div className="field">
                <label>Adresse email</label>
                <input
                  className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          )}

          <div className="center" style={{ marginTop: 22 }}>
            <Link href="/connexion" className="btn btn-ghost btn-sm">
              <Icon name="arrowLeft" size={15} /> Retour à la connexion
            </Link>
          </div>
        </div>

        <p className="tiny muted center" style={{ marginTop: 18 }}>
          Vous ne recevez rien ? Vérifiez vos spams ou{' '}
          <Link href="/aide" style={{ color: 'var(--violet-2)' }}>contactez le support</Link>.
        </p>
      </div>
    </section>
  );
}
