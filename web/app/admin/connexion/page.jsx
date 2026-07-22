'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAdminAuth } from '@/lib/admin-auth-store';
import { Lotus } from '@/components/ui/Lotus';

export default function AdminConnexionPage() {
  const setSession = useAdminAuth((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // No router.replace('/admin') here on success: AdminAuthGate already redirects
  // away from /admin/connexion the moment `token` becomes non-null (it re-renders
  // on every useAdminAuth change), so there is exactly one place that decides
  // where an authenticated admin lands.
  const loginMutation = useMutation({
    mutationFn: () => api.post('/admin/login', { email, password }),
    onSuccess: (res) => setSession(res.data.token, res.data.user),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Une erreur est survenue.'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate();
  };

  return (
    <div className="center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 24, padding: 24 }}>
      <div className="row gap-2">
        <Lotus size={28} color="var(--violet-2)" />
        <span className="h-3">GuériEnergies <span className="tiny muted">admin</span></span>
      </div>
      <form onSubmit={submit} className="card card-pad" style={{ width: '100%', maxWidth: 380 }}>
        <h1 className="h-3" style={{ marginBottom: 6 }}>Connexion administrateur</h1>
        <p className="small" style={{ marginBottom: 20 }}>Réservé aux membres de l'équipe GuériEnergies.</p>
        {error && (
          <div className="note tint-violet" style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>
        )}
        <div className="field">
          <label>Email</label>
          <input
            className="input" type="email" required autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@aura.io"
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>Mot de passe</label>
          <input
            className="input" type="password" required autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 20 }} disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
