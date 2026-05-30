import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ToastButton } from '@/components/ui/ToastButton';

export default function MotDePasseOubliePage() {
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
              Saisissez votre adresse email : nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div className="field">
            <label>Adresse email</label>
            <input className="input" type="email" placeholder="vous@exemple.fr" autoComplete="email" />
          </div>

          <ToastButton
            message="Lien de réinitialisation envoyé — vérifiez vos emails"
            tone="success"
            className="btn btn-primary btn-block btn-lg"
          >
            Envoyer le lien
          </ToastButton>

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
