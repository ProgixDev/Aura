import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { Badge } from '@/components/ui/Badge';
import { faq } from '@/lib/data/content';

const PILLARS = [
  { i: 'shield', tone: 'tint-violet', t: 'Vérification des praticiens', d: 'Diplômes, assurance professionnelle et identité sont contrôlés à la main, document par document, avant toute mise en ligne.' },
  { i: 'card', tone: 'tint-sky', t: 'Paiement protégé', d: 'Les transactions passent par un prestataire certifié. L’argent n’est versé au praticien qu’une fois la séance réalisée.' },
  { i: 'flag', tone: 'tint-gold', t: 'Modération active', d: 'Profils, messages et avis peuvent être signalés en un clic. Notre équipe intervient rapidement et avec discernement.' },
  { i: 'message', tone: 'tint-sage', t: 'Échanges encadrés', d: 'La messagerie reste sur GuériEnergies : conseil, questions, organisation. Les paiements hors plateforme ne sont jamais protégés.' },
];

const VERIF_STEPS = [
  { n: '01', t: 'Soumission', d: 'Le praticien dépose ses justificatifs dans un espace sécurisé et confidentiel.' },
  { n: '02', t: 'Contrôle humain', d: 'Notre équipe vérifie l’authenticité et la validité de chaque pièce, sous 48h.' },
  { n: '03', t: 'Attribution du badge', d: 'Une fois validé, le badge « Vérifiée » apparaît. Les documents, eux, ne sont jamais publiés.' },
  { n: '04', t: 'Suivi continu', d: 'Assurances et signalements sont surveillés dans le temps. Un badge peut être retiré.' },
];

const RGPD = [
  { t: 'Vous gardez la main', d: 'Accédez, modifiez ou supprimez vos données à tout moment depuis votre espace compte.' },
  { t: 'Le strict nécessaire', d: 'Nous ne collectons que ce qui est utile au service, et rien ne sert à des fins publicitaires opaques.' },
  { t: 'Hébergement sécurisé', d: 'Vos données sont chiffrées et hébergées dans l’Union européenne, conformément au RGPD.' },
];

export default function ConfianceSecuritePage() {
  const safetyFaq = faq.find((c) => c.cat === 'Confiance & sécurité').items;
  return (
    <>
      {/* HERO */}
      <section className="aurora-dark grain" style={{ '--orb-x': '45%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}>
        <div className="container-narrow reveal">
          <span className="tile-icon" style={{ background: 'rgba(255,255,255,0.12)', margin: '0 auto' }}><Icon name="shield" size={22} color="#fff" /></span>
          <h1 className="h-display" style={{ color: '#fff', margin: '22px 0 22px' }}>
            Votre <span className="italic" style={{ color: 'var(--violet)' }}>sécurité</span>, notre fondation.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto' }}>
            Vérification, paiement protégé, modération, RGPD. Voici concrètement comment GuériEnergies veille sur chaque rencontre — pour les clients comme pour les praticiens.
          </p>
        </div>
      </section>

      {/* PILLARS */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Quatre piliers</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Une confiance construite, pas promise</h2>
          </div>
          <div className="grid grid-2">
            {PILLARS.map((p) => (
              <div key={p.t} className="card card-pad row gap-3" style={{ alignItems: 'flex-start' }}>
                <span className={`tile-icon ${p.tone}`}><Icon name={p.i} size={20} color="var(--violet-2)" /></span>
                <div>
                  <h3 className="h-3" style={{ marginBottom: 6 }}>{p.t}</h3>
                  <p className="body">{p.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VERIFICATION PROCESS */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Le badge Vérifiée</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Comment se déroule la vérification</h2>
            <div style={{ marginTop: 16 }}><Badge variant="verified" dot>Vérifiée</Badge></div>
          </div>
          <div className="grid grid-4">
            {VERIF_STEPS.map((s) => (
              <div key={s.n} className="stack">
                <span className="serif italic accent" style={{ fontSize: 40 }}>{s.n}</span>
                <h3 className="h-4" style={{ margin: '8px 0 6px' }}>{s.t}</h3>
                <p className="body">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAYMENT + REPORTING */}
      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            <div className="card card-pad">
              <span className="tile-icon tint-sky" style={{ marginBottom: 14 }}><Icon name="card" size={20} color="var(--violet-2)" /></span>
              <h3 className="h-2" style={{ marginBottom: 12 }}>Le paiement protégé</h3>
              <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'Réglez en ligne via un prestataire de paiement certifié.',
                  'Le praticien n’est crédité qu’après la séance réalisée.',
                  'Annulation gratuite jusqu’à 24h avant : vous êtes remboursé.',
                  'En cas de litige, notre équipe arbitre et peut rembourser.',
                ].map((l) => (
                  <li key={l} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                    <Icon name="checkCircle" size={16} color="var(--violet-2)" />
                    <span className="body">{l}</span>
                  </li>
                ))}
              </ul>
              <p className="note small" style={{ marginTop: 18 }}>Ne payez jamais en dehors de GuériEnergies : hors plateforme, aucune protection ne s’applique.</p>
            </div>

            <div className="card card-pad">
              <span className="tile-icon tint-gold" style={{ marginBottom: 14 }}><Icon name="flag" size={20} color="var(--violet-2)" /></span>
              <h3 className="h-2" style={{ marginBottom: 12 }}>Signaler & modérer</h3>
              <p className="body" style={{ marginBottom: 14 }}>
                Chaque profil, message et avis porte un bouton de signalement. Un seul clic suffit pour alerter notre équipe de modération, qui examine chaque cas avec sérieux et confidentialité.
              </p>
              <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: '0 0 18px' }}>
                {[
                  'Signalement anonyme et sans friction.',
                  'Examen humain, jamais automatisé seul.',
                  'Sanctions graduées : avertissement, suspension, retrait.',
                ].map((l) => (
                  <li key={l} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                    <Icon name="check" size={16} color="var(--violet-2)" />
                    <span className="body">{l}</span>
                  </li>
                ))}
              </ul>
              <ModalButton modal="report" className="btn btn-soft">Signaler un problème</ModalButton>
            </div>
          </div>
        </div>
      </section>

      {/* RGPD */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">Vos données</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Protégées et respectées</h2>
            <p className="lead muted" style={{ maxWidth: 540, margin: '14px auto 0' }}>Conformité RGPD complète. Vos données vous appartiennent.</p>
          </div>
          <div className="grid grid-3">
            {RGPD.map((r) => (
              <div key={r.t} className="card card-pad center">
                <span className="tile-icon tint-violet" style={{ margin: '0 auto 14px' }}><Icon name="shield" size={20} color="var(--violet-2)" /></span>
                <h3 className="h-4" style={{ marginBottom: 6 }}>{r.t}</h3>
                <p className="body">{r.d}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 28 }}>
            <Link href="/confidentialite" className="more">Lire notre politique de confidentialité →</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container-narrow">
          <div className="section-head">
            <div><span className="eyebrow">Questions fréquentes</span><h2 className="h-2" style={{ marginTop: 8 }}>Confiance & sécurité</h2></div>
            <Link href="/faq" className="more">Toute la FAQ →</Link>
          </div>
          <div className="stack gap-3">
            {safetyFaq.map((it) => (
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
          <div className="aurora-dark grain card" style={{ '--orb-x': '25%', '--orb-y': '30%', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Une question, un doute ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>Notre équipe confiance & sécurité vous répond. Vous n’êtes jamais seul·e.</p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="contact" className="btn btn-aurora btn-lg">Nous contacter</ModalButton>
              <Link href="/faq" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Consulter la FAQ</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
