'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useUI } from '@/lib/store';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Login / signup / forgot, switchable. Calls the real CLIENT-auth endpoints only —
 * its signup branch always does POST /client/register and signs the visitor in as a
 * client. There is no practitioner branch: practitioner registration is a separate,
 * multipart endpoint (POST /v1/praticien/register — see
 * server/src/auth/praticien-auth/praticien-auth.controller.ts) with fields
 * (niveau, specialite, mode, tarif, experience, bio, documents…) this modal cannot
 * carry, and no web UI builds that form yet. Never open this modal in signup mode
 * from a practitioner-recruitment CTA — that used to silently create a client
 * account for a visitor trying to become a practitioner. See
 * app/(site)/devenir-praticien/page.jsx, which routes its "become a practitioner"
 * CTAs to /contact instead of this modal.
 */
export function AuthModal({ id, mode: initial = 'login' }) {
  const [mode, setMode] = useState(initial);
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const res = await api.post('/client/forgot-password', { email });
        toast(res.message || 'Email de réinitialisation envoyé', 'success');
        close(id);
        return;
      }
      if (mode === 'signup') {
        // CLIENT registration only — see the file-level comment above. Do not repurpose
        // this branch for a "become a practitioner" flow.
        const res = await api.post('/client/register', {
          firstname, lastname, email, city, password, password_confirmation: passwordConfirmation,
        });
        setSession(res.data.token, res.data.client);
        close(id);
        toast('Compte créé', 'success');
        router.push('/compte');
        return;
      }
      const res = await api.post('/client/login', { email, password });
      setSession(res.data.token, res.data.client);
      close(id);
      toast('Bienvenue', 'success');
      router.push('/compte');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié';
  return (
    <Modal id={id} title={title} subtitle={mode === 'forgot' ? 'Nous vous enverrons un lien de réinitialisation.' : 'Accédez à votre espace GuériEnergies.'} size="modal-sm">
      <form onSubmit={submit}>
        {error && <p className="small" style={{ color: 'var(--danger, #b5524f)', marginBottom: 12 }}>{error}</p>}
        {mode === 'signup' && (
          <>
            <div className="field"><label>Prénom</label><input className="input" value={firstname} onChange={(e) => setFirstname(e.target.value)} placeholder="Sarah" required /></div>
            <div className="field"><label>Nom</label><input className="input" value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="Lemoine" required /></div>
            <div className="field"><label>Ville</label><input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" required /></div>
          </>
        )}
        <div className="field"><label>Email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" required /></div>
        {mode !== 'forgot' && (
          <div className="field"><label>Mot de passe</label><PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required /></div>
        )}
        {mode === 'signup' && (
          <div className="field"><label>Confirmer le mot de passe</label><PasswordInput value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} placeholder="••••••••" required /></div>
        )}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }} disabled={loading}>
          {loading ? '…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? "S'inscrire" : 'Envoyer le lien'}
        </button>
      </form>
      <div className="center small" style={{ marginTop: 16 }}>
        {mode === 'login' && <>Pas encore de compte ? <button className="btn-link" onClick={() => { setMode('signup'); setError(null); }}>Créer un compte</button><br /><button className="btn-link" onClick={() => { setMode('forgot'); setError(null); }} style={{ marginTop: 6 }}>Mot de passe oublié ?</button></>}
        {mode === 'signup' && <>Déjà inscrit ? <button className="btn-link" onClick={() => { setMode('login'); setError(null); }}>Se connecter</button></>}
        {mode === 'forgot' && <button className="btn-link" onClick={() => { setMode('login'); setError(null); }}>Retour à la connexion</button>}
      </div>
    </Modal>
  );
}

export default AuthModal;
