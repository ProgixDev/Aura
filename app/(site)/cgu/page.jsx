import Link from 'next/link';

const TOC = [
  ['objet', 'Objet & acceptation'],
  ['definitions', 'Définitions'],
  ['compte', 'Inscription & compte'],
  ['service', 'Description du service'],
  ['reservation', 'Réservation & paiement'],
  ['annulation', 'Annulation & remboursement'],
  ['obligations', 'Obligations des utilisateurs'],
  ['praticiens', 'Obligations des praticiens'],
  ['moderation', 'Modération & sanctions'],
  ['resiliation', 'Résiliation'],
  ['droit', 'Droit applicable'],
];

export default function CguPage() {
  return (
    <>
      <section className="section">
        <div className="container-narrow">
          <div className="reveal" style={{ marginBottom: 32 }}>
            <span className="eyebrow">Légal</span>
            <h1 className="h-1" style={{ margin: '12px 0 10px' }}>Conditions générales d’utilisation</h1>
            <p className="small muted">Dernière mise à jour : 12 mai 2026 · Version 3.1</p>
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
                Les présentes Conditions Générales d’Utilisation régissent l’accès et l’usage de la plateforme <span className="serif-accent">Aura</span>, éditée par Aura Bien-être SAS. En naviguant sur le site, vous acceptez de vous y conformer pleinement.
              </p>

              <h3 className="h-3" id="objet" style={{ scrollMarginTop: 96, marginBottom: 8 }}>1. Objet & acceptation</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Les présentes CGU ont pour objet de définir les modalités de mise à disposition des services de la plateforme et les conditions d’utilisation par l’Utilisateur. La création d’un compte ou la simple consultation du site emporte acceptation sans réserve des présentes conditions. Aura se réserve le droit de les modifier à tout moment ; la version applicable est celle en vigueur à la date de la connexion.
              </p>

              <h3 className="h-3" id="definitions" style={{ scrollMarginTop: 96, marginBottom: 8 }}>2. Définitions</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                <strong>Plateforme</strong> : le site et l’application Aura. <strong>Utilisateur</strong> : toute personne accédant aux services. <strong>Praticien</strong> : professionnel du bien-être proposant des séances. <strong>Séance</strong> : prestation réservée via la Plateforme. <strong>Contenu</strong> : tout élément publié par un Utilisateur ou un Praticien.
              </p>

              <h3 className="h-3" id="compte" style={{ scrollMarginTop: 96, marginBottom: 8 }}>3. Inscription & compte</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                L’inscription requiert une adresse électronique valide et la fourniture d’informations exactes. L’Utilisateur s’engage à préserver la confidentialité de ses identifiants. Toute action effectuée depuis un compte est réputée l’avoir été par son titulaire. L’inscription est réservée aux personnes majeures et capables juridiquement.
              </p>

              <h3 className="h-3" id="service" style={{ scrollMarginTop: 96, marginBottom: 8 }}>4. Description du service</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Aura est une plateforme de mise en relation. Elle permet de rechercher des praticiens vérifiés, d’échanger via une messagerie sécurisée, de réserver des séances et de régler en ligne. Aura n’est pas partie au contrat de prestation conclu entre l’Utilisateur et le Praticien. Les soins proposés ne se substituent en aucun cas à un avis ou un traitement médical.
              </p>

              <h3 className="h-3" id="reservation" style={{ scrollMarginTop: 96, marginBottom: 8 }}>5. Réservation & paiement</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                La réservation est confirmée après paiement intégral via notre prestataire de paiement certifié. Les sommes sont conservées en séquestre et ne sont reversées au Praticien qu’à l’issue de la séance. <strong>Tout paiement effectué hors de la Plateforme n’est pas protégé</strong> et engage la seule responsabilité de l’Utilisateur. Une facture est mise à disposition dans l’espace compte.
              </p>

              <h3 className="h-3" id="annulation" style={{ scrollMarginTop: 96, marginBottom: 8 }}>6. Annulation & remboursement</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                L’Utilisateur peut annuler gratuitement jusqu’à 24 heures avant le début de la séance. Passé ce délai, des frais peuvent s’appliquer selon la politique du Praticien. En cas d’annulation par le Praticien, l’intégralité des sommes versées est remboursée sous 5 à 10 jours ouvrés.
              </p>

              <h3 className="h-3" id="obligations" style={{ scrollMarginTop: 96, marginBottom: 8 }}>7. Obligations des utilisateurs</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                L’Utilisateur s’engage à un usage loyal de la Plateforme : respect des Praticiens, exactitude des informations, absence de contenu illicite, diffamatoire ou trompeur. Tout comportement abusif, harcèlement ou tentative de contournement du système de paiement peut entraîner la suspension du compte.
              </p>

              <h3 className="h-3" id="praticiens" style={{ scrollMarginTop: 96, marginBottom: 8 }}>8. Obligations des praticiens</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Le Praticien garantit la véracité des diplômes, certifications et assurances communiqués lors de la vérification. Il s’engage à exercer dans le respect de la déontologie de sa discipline, à ne formuler aucune promesse de guérison et à orienter vers un professionnel de santé lorsque la situation l’exige.
              </p>

              <h3 className="h-3" id="moderation" style={{ scrollMarginTop: 96, marginBottom: 8 }}>9. Modération & sanctions</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Aura dispose d’une équipe de modération. Tout contenu signalé est examiné ; les manquements aux présentes CGU peuvent donner lieu à un avertissement, au retrait du contenu, à la suspension ou à la résiliation du compte, sans préjudice d’éventuelles poursuites.
              </p>

              <h3 className="h-3" id="resiliation" style={{ scrollMarginTop: 96, marginBottom: 8 }}>10. Résiliation</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                L’Utilisateur peut clôturer son compte à tout moment depuis son espace personnel. Aura peut résilier un compte en cas de manquement grave ou répété aux présentes conditions, après notification lorsque cela est possible.
              </p>

              <h3 className="h-3" id="droit" style={{ scrollMarginTop: 96, marginBottom: 8 }}>11. Droit applicable</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Les présentes CGU sont régies par le droit français. À défaut de résolution amiable, tout litige relèvera de la compétence des tribunaux français, sous réserve des dispositions impératives protectrices du consommateur.
              </p>

              <div className="note" style={{ marginTop: 32 }}>
                Voir aussi : <Link href="/mentions-legales" className="more">Mentions légales</Link> · <Link href="/confidentialite" className="more">Confidentialité</Link> · <Link href="/cookies" className="more">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
