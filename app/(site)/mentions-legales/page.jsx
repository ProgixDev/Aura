import Link from 'next/link';

const TOC = [
  ['editeur', 'Éditeur du site'],
  ['direction', 'Direction de la publication'],
  ['hebergeur', 'Hébergement'],
  ['propriete', 'Propriété intellectuelle'],
  ['responsabilite', 'Responsabilité'],
  ['liens', 'Liens hypertextes'],
  ['donnees', 'Données personnelles'],
  ['mediation', 'Médiation & litiges'],
  ['contact', 'Contact'],
];

export default function MentionsLegalesPage() {
  return (
    <>
      <section className="section">
        <div className="container-narrow">
          <div className="reveal" style={{ marginBottom: 32 }}>
            <span className="eyebrow">Légal</span>
            <h1 className="h-1" style={{ margin: '12px 0 10px' }}>Mentions légales</h1>
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
            </nav>

            <div className="flex-1" style={{ minWidth: 280 }}>
              <p className="lead" style={{ marginBottom: 28 }}>
                Conformément aux dispositions des articles 6-III et 19 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN), les présentes mentions légales sont portées à la connaissance des utilisateurs du site <span className="serif-accent">aura.fr</span>.
              </p>

              <h3 className="h-3" id="editeur" style={{ scrollMarginTop: 96, marginBottom: 8 }}>1. Éditeur du site</h3>
              <p className="body" style={{ marginBottom: 12 }}>
                Le site Aura est édité par la société <strong>Aura Bien-être SAS</strong>, société par actions simplifiée au capital social de 120 000 €, immatriculée au Registre du Commerce et des Sociétés de Paris sous le numéro 921 048 376.
              </p>
              <ul className="stack gap-1 body" style={{ marginBottom: 24, paddingLeft: 18 }}>
                <li>Siège social : 18 rue du Faubourg Saint-Antoine, 75012 Paris, France</li>
                <li>Numéro de TVA intracommunautaire : FR 42 921048376</li>
                <li>Téléphone : 01 84 60 22 10</li>
                <li>Courriel : contact@aura.fr</li>
              </ul>

              <h3 className="h-3" id="direction" style={{ scrollMarginTop: 96, marginBottom: 8 }}>2. Direction de la publication</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Le directeur de la publication est Madame Camille Dauphin, en sa qualité de Présidente d’Aura Bien-être SAS. Elle peut être contactée à l’adresse <strong>direction@aura.fr</strong> pour toute question relative au contenu éditorial du site.
              </p>

              <h3 className="h-3" id="hebergeur" style={{ scrollMarginTop: 96, marginBottom: 8 }}>3. Hébergement</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Le site est hébergé par <strong>Scaleway SAS</strong>, dont le siège social est situé 8 rue de la Ville l’Évêque, 75008 Paris, France. Les serveurs sont localisés sur le territoire de l’Union européenne afin de garantir la conformité au Règlement Général sur la Protection des Données.
              </p>

              <h3 className="h-3" id="propriete" style={{ scrollMarginTop: 96, marginBottom: 8 }}>4. Propriété intellectuelle</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                L’ensemble des éléments composant le site — marque Aura, logo, charte graphique, textes, illustrations, photographies, vidéos et code source — est la propriété exclusive d’Aura Bien-être SAS ou fait l’objet d’une licence d’utilisation. Toute reproduction, représentation, modification ou exploitation, totale ou partielle, sans autorisation écrite préalable, est interdite et constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
              </p>

              <h3 className="h-3" id="responsabilite" style={{ scrollMarginTop: 96, marginBottom: 8 }}>5. Responsabilité</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Aura agit en qualité d’intermédiaire de mise en relation entre praticiens du bien-être et utilisateurs. Aura n’est pas un établissement de soins et ne dispense aucun acte médical. Les contenus publiés par les praticiens n’engagent que leur auteur. Aura ne saurait être tenue responsable des prestations réalisées hors de la plateforme ni des paiements effectués en dehors de son système sécurisé.
              </p>

              <h3 className="h-3" id="liens" style={{ scrollMarginTop: 96, marginBottom: 8 }}>6. Liens hypertextes</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Le site peut contenir des liens vers des sites tiers. Aura n’exerce aucun contrôle sur ces ressources et décline toute responsabilité quant à leur contenu. La mise en place d’un lien vers le site Aura nécessite une autorisation écrite préalable.
              </p>

              <h3 className="h-3" id="donnees" style={{ scrollMarginTop: 96, marginBottom: 8 }}>7. Données personnelles</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Le traitement des données personnelles collectées sur le site est détaillé dans notre <Link href="/confidentialite" className="more">Politique de confidentialité</Link>. Vous disposez d’un droit d’accès, de rectification, d’effacement et d’opposition que vous pouvez exercer à l’adresse <strong>privacy@aura.fr</strong>.
              </p>

              <h3 className="h-3" id="mediation" style={{ scrollMarginTop: 96, marginBottom: 8 }}>8. Médiation & litiges</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Conformément à l’article L.612-1 du Code de la consommation, l’utilisateur peut recourir gratuitement au service du médiateur de la consommation MEDICYS, 73 boulevard de Clichy, 75009 Paris. La plateforme européenne de règlement en ligne des litiges est par ailleurs accessible à l’adresse ec.europa.eu/consumers/odr.
              </p>

              <h3 className="h-3" id="contact" style={{ scrollMarginTop: 96, marginBottom: 8 }}>9. Contact</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Pour toute question relative aux présentes mentions légales, vous pouvez nous écrire via notre <Link href="/contact" className="more">page de contact</Link> ou par courrier à l’adresse du siège social indiquée ci-dessus.
              </p>

              <div className="note" style={{ marginTop: 32 }}>
                Voir aussi : <Link href="/cgu" className="more">CGU</Link> · <Link href="/confidentialite" className="more">Confidentialité</Link> · <Link href="/cookies" className="more">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
