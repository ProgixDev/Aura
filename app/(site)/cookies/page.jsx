import Link from 'next/link';
import { ModalButton } from '@/components/ui/ModalButton';

const TOC = [
  ['definition', 'Qu’est-ce qu’un cookie'],
  ['types', 'Types de cookies'],
  ['liste', 'Cookies utilisés'],
  ['consentement', 'Votre consentement'],
  ['gerer', 'Gérer vos préférences'],
  ['duree', 'Durée de vie'],
  ['contact', 'Contact'],
];

const COOKIES = [
  ['aura_session', 'Essentiel', 'Maintien de la session et authentification.', 'Session'],
  ['aura_consent', 'Essentiel', 'Mémorisation de vos choix de cookies.', '6 mois'],
  ['aura_csrf', 'Essentiel', 'Protection contre la falsification de requêtes.', 'Session'],
  ['_aura_pref', 'Préférences', 'Langue, ville et filtres de recherche favoris.', '1 an'],
  ['_aura_stats', 'Mesure d’audience', 'Statistiques anonymisées de fréquentation.', '13 mois'],
  ['_aura_ads', 'Marketing', 'Personnalisation des campagnes (avec consentement).', '13 mois'],
];

export default function CookiesPage() {
  return (
    <>
      <section className="section">
        <div className="container-narrow">
          <div className="reveal" style={{ marginBottom: 32 }}>
            <span className="eyebrow">Légal</span>
            <h1 className="h-1" style={{ margin: '12px 0 10px' }}>Politique relative aux cookies</h1>
            <p className="small muted">Dernière mise à jour : 12 mai 2026</p>
          </div>

          <div className="row gap-6" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <nav className="card card-pad" style={{ flex: '0 0 240px', position: 'sticky', top: 96, alignSelf: 'flex-start' }}>
              <p className="tiny eyebrow" style={{ marginBottom: 12 }}>Sommaire</p>
              <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {TOC.map(([id, label]) => (
                  <li key={id}><a href={`#${id}`} className="small muted">{label}</a></li>
                ))}
              </ul>
              <div className="divider" />
              <ModalButton modal="form" className="btn btn-soft btn-sm btn-block" payload={{ title: 'Préférences cookies', fields: [
                { name: 'pref', label: 'Cookies de préférences', type: 'select', options: ['Autoriser', 'Refuser'] },
                { name: 'stats', label: 'Mesure d’audience', type: 'select', options: ['Autoriser', 'Refuser'] },
                { name: 'ads', label: 'Marketing', type: 'select', options: ['Autoriser', 'Refuser'] },
              ], submitLabel: 'Enregistrer', successToast: 'Préférences enregistrées' }}>Gérer mes choix</ModalButton>
            </nav>

            <div className="flex-1" style={{ minWidth: 280 }}>
              <p className="lead" style={{ marginBottom: 28 }}>
                Nous utilisons des cookies pour faire fonctionner le site, mémoriser vos préférences et, avec votre accord, mesurer notre audience. Vous gardez <span className="serif-accent">la main sur tout</span>.
              </p>

              <h3 className="h-3" id="definition" style={{ scrollMarginTop: 96, marginBottom: 8 }}>1. Qu’est-ce qu’un cookie</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d’un site. Il permet de reconnaître votre navigateur, de conserver certaines informations et d’améliorer votre expérience. Les cookies ne contiennent aucun programme exécutable et ne peuvent pas endommager votre appareil.
              </p>

              <h3 className="h-3" id="types" style={{ scrollMarginTop: 96, marginBottom: 8 }}>2. Types de cookies</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Nous distinguons les cookies <strong>essentiels</strong> (indispensables au fonctionnement, exemptés de consentement), les cookies de <strong>préférences</strong>, ceux de <strong>mesure d’audience</strong> et ceux de <strong>marketing</strong>. Ces trois dernières catégories ne sont déposées qu’avec votre consentement explicite.
              </p>

              <h3 className="h-3" id="liste" style={{ scrollMarginTop: 96, marginBottom: 12 }}>3. Cookies utilisés</h3>
              <div className="table-wrap" style={{ marginBottom: 24 }}>
                <table className="table">
                  <thead>
                    <tr><th>Nom</th><th>Catégorie</th><th>Finalité</th><th>Durée</th></tr>
                  </thead>
                  <tbody>
                    {COOKIES.map((c) => (
                      <tr key={c[0]}><td><code>{c[0]}</code></td><td>{c[1]}</td><td className="small">{c[2]}</td><td>{c[3]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="h-3" id="consentement" style={{ scrollMarginTop: 96, marginBottom: 8 }}>4. Votre consentement</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Lors de votre première visite, un bandeau vous permet d’accepter, de refuser ou de personnaliser le dépôt des cookies non essentiels. Aucune de ces catégories n’est activée tant que vous n’avez pas exprimé votre choix. Vous pouvez modifier ou retirer votre consentement à tout moment.
              </p>

              <h3 className="h-3" id="gerer" style={{ scrollMarginTop: 96, marginBottom: 8 }}>5. Gérer vos préférences</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Vous pouvez ajuster vos choix via le bouton « Gérer mes choix » du sommaire, ou directement depuis les paramètres de votre navigateur. Le blocage des cookies essentiels peut toutefois dégrader le fonctionnement de certaines fonctionnalités, comme la réservation ou la messagerie.
              </p>

              <h3 className="h-3" id="duree" style={{ scrollMarginTop: 96, marginBottom: 8 }}>6. Durée de vie</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                La durée de conservation de chaque cookie est précisée dans le tableau ci-dessus. Conformément aux recommandations de la CNIL, aucun cookie de mesure d’audience ou de marketing n’est conservé plus de 13 mois, et votre consentement est redemandé au terme de cette période.
              </p>

              <h3 className="h-3" id="contact" style={{ scrollMarginTop: 96, marginBottom: 8 }}>7. Contact</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Pour toute question relative aux cookies, écrivez-nous à <strong>privacy@aura.fr</strong> ou via notre <Link href="/contact" className="more">page de contact</Link>. Le traitement de vos données est détaillé dans notre <Link href="/confidentialite" className="more">politique de confidentialité</Link>.
              </p>

              <div className="note" style={{ marginTop: 32 }}>
                Voir aussi : <Link href="/mentions-legales" className="more">Mentions légales</Link> · <Link href="/cgu" className="more">CGU</Link> · <Link href="/confidentialite" className="more">Confidentialité</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
