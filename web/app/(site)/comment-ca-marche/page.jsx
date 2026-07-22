import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { faq } from '@/lib/data/content';

const CLIENT_STEPS = [
  { n: '01', i: 'search', t: 'Cherchez en confiance', d: "Filtrez par discipline, ville, modalité, budget. Chaque praticien affiché est vérifié : SIRET, diplômes, identité." },
  { n: '02', i: 'message', t: 'Échangez avant de réserver', d: 'Posez vos questions dans la messagerie sécurisée. Sentez si le courant passe. Les paiements ne se font jamais en privé.' },
  { n: '03', i: 'calendar', t: 'Réservez et vivez la séance', d: 'Choisissez un créneau, réglez en ligne en toute sécurité. Annulation gratuite jusqu’à 24h avant.' },
];

const PRAT_STEPS = [
  { n: '01', i: 'user', t: 'Créez votre profil', d: 'Présentez votre approche, vos disciplines, votre parcours. Quelques minutes suffisent pour poser les bases.' },
  { n: '02', i: 'shield', t: 'Faites-vous vérifier', d: 'Soumettez votre SIRET et vos diplômes. Notre équipe contrôle chaque document sous 48h.' },
  { n: '03', i: 'calendar', t: 'Recevez vos premières réservations', d: 'Ouvrez votre agenda, fixez vos tarifs, et laissez les clients vous trouver. Vous êtes payé après chaque séance.' },
];

const TRUST = [
  { i: 'shield', t: 'Praticiens vérifiés', d: 'Documents contrôlés un par un. Le badge « Vérifiée » se mérite, il ne s’achète pas.' },
  { i: 'card', t: 'Paiement protégé', d: "L'argent n'est versé qu'après la séance. Un litige ? Notre équipe tranche, à vos côtés." },
  { i: 'heart', t: 'Sans jugement', d: 'Un espace doux et respectueux, pensé pour celles et ceux qui cherchent du mieux-être.' },
];

export default function CommentCaMarchePage() {
  const teaser = faq.find((c) => c.cat === 'Réservation').items.slice(0, 3);
  return (
    <>
      {/* HERO */}
      <section className="aurora-dark grain" style={{ '--orb-x': '60%', '--orb-y': '15%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}>
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Simple et sûr</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Comment ça <span className="italic" style={{ color: 'var(--violet)' }}>marche</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto 32px' }}>
            Trois étapes pour les clients, trois étapes pour les praticiens. Un même fil conducteur : la confiance, du premier message à la séance.
          </p>
          <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/praticiens" className="btn btn-aurora btn-lg">Trouver un praticien</Link>
            <Link href="/devenir-praticien" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Je suis praticien</Link>
          </div>
        </div>
      </section>

      {/* CLIENT STEPS */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Côté client</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Trouver, échanger, réserver</h2>
            <p className="lead muted" style={{ maxWidth: 540, margin: '14px auto 0' }}>Tout est pensé pour que vous gardiez la main, à votre rythme.</p>
          </div>
          <div className="grid grid-3">
            {CLIENT_STEPS.map((s) => (
              <div key={s.n} className="card card-pad">
                <div className="between" style={{ alignItems: 'flex-start' }}>
                  <span className="tile-icon tint-violet"><Icon name={s.i} size={20} color="var(--violet-2)" /></span>
                  <span className="serif italic accent" style={{ fontSize: 38 }}>{s.n}</span>
                </div>
                <h3 className="h-3" style={{ margin: '16px 0 6px' }}>{s.t}</h3>
                <p className="body">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 36 }}>
            <Link href="/praticiens" className="btn btn-primary">Explorer les praticiens</Link>
          </div>
        </div>
      </section>

      {/* PRAT STEPS */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Côté praticien</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Créer, vérifier, recevoir</h2>
            <p className="lead muted" style={{ maxWidth: 540, margin: '14px auto 0' }}>Vous exercez, nous nous occupons de la confiance et de la logistique.</p>
          </div>
          <div className="grid grid-3">
            {PRAT_STEPS.map((s) => (
              <div key={s.n} className="stack">
                <span className="tile-icon tint-sage"><Icon name={s.i} size={20} color="var(--sage-2, var(--violet-2))" /></span>
                <span className="serif italic accent" style={{ fontSize: 40, marginTop: 12 }}>{s.n}</span>
                <h3 className="h-3" style={{ margin: '6px 0 6px' }}>{s.t}</h3>
                <p className="body">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 36 }}>
            <Link href="/devenir-praticien" className="btn btn-primary">Devenir praticien</Link>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">Nos garanties</span>
            <h2 className="h-2" style={{ marginTop: 10 }}>Ce qui protège chaque rencontre</h2>
          </div>
          <div className="grid grid-3">
            {TRUST.map((t) => (
              <div key={t.t} className="card card-pad">
                <span className="tile-icon tint-violet" style={{ marginBottom: 14 }}><Icon name={t.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-3" style={{ marginBottom: 6 }}>{t.t}</h3>
                <p className="body">{t.d}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 28 }}>
            <Link href="/confiance-securite" className="more">Tout sur la confiance & la sécurité →</Link>
          </div>
        </div>
      </section>

      {/* FAQ TEASER */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container-narrow">
          <div className="section-head">
            <div><span className="eyebrow">Questions fréquentes</span><h2 className="h-2" style={{ marginTop: 8 }}>On vous répond</h2></div>
            <Link href="/faq" className="more">Toute la FAQ →</Link>
          </div>
          <div className="stack gap-3">
            {teaser.map((it) => (
              <div key={it.q} className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 6 }}>{it.q}</h3>
                <p className="body">{it.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '20%', '--orb-y': '30%', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Prêt·e à commencer ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>Créez votre compte gratuitement, en moins de deux minutes.</p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="signup" className="btn btn-aurora btn-lg">Créer mon compte</ModalButton>
              <Link href="/praticiens" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Voir les praticiens</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
