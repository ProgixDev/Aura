'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';

/** Login / signup / forgot, switchable. Mock only — routes to /compte on submit. */
export function AuthModal({ id, mode: initial = 'login' }) {
  const [mode, setMode] = useState(initial);
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const router = useRouter();

  const submit = (e) => {
    e.preventDefault();
    close(id);
    if (mode === 'forgot') { toast('Email de réinitialisation envoyé', 'success'); return; }
    toast(mode === 'login' ? 'Bienvenue' : 'Compte créé', 'success');
    router.push('/compte');
  };

  const title = mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Mot de passe oublié';
  return (
    <Modal id={id} title={title} subtitle={mode === 'forgot' ? 'Nous vous enverrons un lien de réinitialisation.' : 'Accédez à votre espace Aura.'} size="modal-sm">
      <form onSubmit={submit}>
        {mode === 'signup' && (
          <div className="field"><label>Prénom</label><input className="input" placeholder="Sarah" required /></div>
        )}
        <div className="field"><label>Email</label><input className="input" type="email" placeholder="vous@exemple.fr" required /></div>
        {mode !== 'forgot' && (
          <div className="field"><label>Mot de passe</label><input className="input" type="password" placeholder="••••••••" required /></div>
        )}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 6 }}>
          {mode === 'login' ? 'Se connecter' : mode === 'signup' ? "S'inscrire" : 'Envoyer le lien'}
        </button>
      </form>
      <div className="center small" style={{ marginTop: 16 }}>
        {mode === 'login' && <>Pas encore de compte ? <button className="btn-link" onClick={() => setMode('signup')}>Créer un compte</button><br /><button className="btn-link" onClick={() => setMode('forgot')} style={{ marginTop: 6 }}>Mot de passe oublié ?</button></>}
        {mode === 'signup' && <>Déjà inscrit ? <button className="btn-link" onClick={() => setMode('login')}>Se connecter</button></>}
        {mode === 'forgot' && <button className="btn-link" onClick={() => setMode('login')}>Retour à la connexion</button>}
      </div>
    </Modal>
  );
}

export default AuthModal;
