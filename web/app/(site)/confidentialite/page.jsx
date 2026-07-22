import Link from 'next/link';

const TOC = [
  ['responsable', 'Responsable du traitement'],
  ['donnees', 'Données collectées'],
  ['finalites', 'Finalités & bases légales'],
  ['destinataires', 'Destinataires'],
  ['conservation', 'Durée de conservation'],
  ['droits', 'Vos droits'],
  ['securite', 'Sécurité'],
  ['transferts', 'Transferts hors UE'],
  ['mineurs', 'Mineurs'],
  ['contact', 'Contact & réclamation'],
];

export default function ConfidentialitePage() {
  return (
    <>
      <section className="section">
        <div className="container-narrow">
          <div className="reveal" style={{ marginBottom: 32 }}>
            <span className="eyebrow">Légal</span>
            <h1 className="h-1" style={{ margin: '12px 0 10px' }}>Politique de confidentialité</h1>
            <p className="small muted">Dernière mise à jour : 12 mai 2026 · Conforme au RGPD</p>
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
                Chez GuériEnergies, la protection de vos données est <span className="serif-accent">une question de confiance</span>. Cette politique explique, en toute transparence, quelles informations nous collectons, pourquoi, et comment vous gardez le contrôle, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés.
              </p>

              <h3 className="h-3" id="responsable" style={{ scrollMarginTop: 96, marginBottom: 8 }}>1. Responsable du traitement</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Le responsable du traitement est <strong>GuériEnergies Bien-être SAS</strong>, 18 rue du Faubourg Saint-Antoine, 75012 Paris. Notre Délégué à la Protection des Données (DPO) est joignable à l’adresse <strong>dpo@aura.fr</strong>.
              </p>

              <h3 className="h-3" id="donnees" style={{ scrollMarginTop: 96, marginBottom: 8 }}>2. Données collectées</h3>
              <p className="body" style={{ marginBottom: 12 }}>Nous collectons uniquement les données nécessaires au service :</p>
              <ul className="stack gap-1 body" style={{ marginBottom: 24, paddingLeft: 18 }}>
                <li><strong>Identification</strong> : nom, prénom, adresse électronique, téléphone.</li>
                <li><strong>Compte</strong> : préférences, historique de réservations, messages.</li>
                <li><strong>Paiement</strong> : traité par notre prestataire certifié ; nous ne stockons aucune donnée bancaire complète.</li>
                <li><strong>Navigation</strong> : adresse IP, type d’appareil, pages consultées (voir notre <Link href="/cookies" className="more">politique cookies</Link>).</li>
              </ul>

              <h3 className="h-3" id="finalites" style={{ scrollMarginTop: 96, marginBottom: 8 }}>3. Finalités & bases légales</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Vos données sont traitées pour : exécuter le contrat (gestion des réservations et paiements), respecter nos obligations légales (facturation, comptabilité), notre intérêt légitime (sécurité, prévention de la fraude, amélioration du service) et, pour la prospection, sur la base de votre consentement, révocable à tout moment.
              </p>

              <h3 className="h-3" id="destinataires" style={{ scrollMarginTop: 96, marginBottom: 8 }}>4. Destinataires</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Vos données sont accessibles aux équipes habilitées de GuériEnergies et à nos sous-traitants (hébergement, paiement, envoi d’emails) agissant sur instruction et liés par un accord de confidentialité. Le praticien que vous réservez reçoit les informations strictement nécessaires à la séance. Nous ne vendons jamais vos données.
              </p>

              <h3 className="h-3" id="conservation" style={{ scrollMarginTop: 96, marginBottom: 8 }}>5. Durée de conservation</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Les données de compte sont conservées tant que celui-ci est actif, puis pendant 3 ans après la dernière activité. Les documents comptables sont conservés 10 ans conformément à la loi. Les données de prospection sont supprimées 3 ans après le dernier contact.
              </p>

              <h3 className="h-3" id="droits" style={{ scrollMarginTop: 96, marginBottom: 8 }}>6. Vos droits</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité, ainsi que du droit de définir des directives relatives au sort de vos données après votre décès. Vous pouvez les exercer depuis votre espace compte ou en écrivant à <strong>privacy@aura.fr</strong> ; une réponse vous sera apportée sous un mois.
              </p>

              <h3 className="h-3" id="securite" style={{ scrollMarginTop: 96, marginBottom: 8 }}>7. Sécurité</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Nous mettons en œuvre des mesures techniques et organisationnelles adaptées : chiffrement des échanges (TLS), chiffrement au repos des données sensibles, cloisonnement des accès et journalisation. En cas de violation susceptible d’engendrer un risque pour vos droits, vous et la CNIL seriez informés dans les délais légaux.
              </p>

              <h3 className="h-3" id="transferts" style={{ scrollMarginTop: 96, marginBottom: 8 }}>8. Transferts hors UE</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Vos données sont hébergées dans l’Union européenne. Lorsqu’un transfert hors UE est inévitable, il s’effectue exclusivement vers des pays reconnus comme adéquats ou encadré par les clauses contractuelles types de la Commission européenne.
              </p>

              <h3 className="h-3" id="mineurs" style={{ scrollMarginTop: 96, marginBottom: 8 }}>9. Mineurs</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Les services de GuériEnergies sont réservés aux personnes majeures. Nous ne collectons pas sciemment de données relatives à des mineurs. Si une telle collecte était portée à notre connaissance, les données seraient supprimées sans délai.
              </p>

              <h3 className="h-3" id="contact" style={{ scrollMarginTop: 96, marginBottom: 8 }}>10. Contact & réclamation</h3>
              <p className="body" style={{ marginBottom: 24 }}>
                Pour toute question, contactez notre DPO à <strong>dpo@aura.fr</strong> ou via notre <Link href="/contact" className="more">page de contact</Link>. Vous disposez également du droit d’introduire une réclamation auprès de la CNIL (3 place de Fontenoy, 75007 Paris — www.cnil.fr).
              </p>

              <div className="note" style={{ marginTop: 32 }}>
                Voir aussi : <Link href="/mentions-legales" className="more">Mentions légales</Link> · <Link href="/cgu" className="more">CGU</Link> · <Link href="/cookies" className="more">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
