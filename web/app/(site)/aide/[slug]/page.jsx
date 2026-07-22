import Link from 'next/link';
import { notFound } from 'next/navigation';
import { helpArticles } from '@/lib/data/content';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

export function generateStaticParams() {
  return helpArticles.map((a) => ({ slug: a.slug }));
}

const BODIES = {
  'reserver-seance': [
    "Réserver une séance sur GuériEnergies prend moins de deux minutes. Depuis la fiche d’un praticien, repérez le bloc « Disponibilités » et choisissez le créneau qui vous convient — en présentiel ou en visio selon ce que propose le praticien.",
    "Une fois le créneau sélectionné, vous accédez au récapitulatif : durée, tarif et modalité. Le paiement s’effectue en ligne via notre prestataire sécurisé. L’argent est conservé et n’est reversé au praticien qu’après la séance.",
    "Vous recevez immédiatement un email de confirmation, et la séance apparaît dans votre espace compte, rubrique « Mes réservations ». Pensez à arriver quelques minutes en avance pour vous poser.",
  ],
  'annuler-reporter': [
    "Vous pouvez annuler ou reporter une séance gratuitement jusqu’à 24 heures avant son début, directement depuis votre espace compte, rubrique « Mes réservations ».",
    "Au-delà de ce délai, des frais peuvent s’appliquer selon la politique d’annulation propre à chaque praticien, indiquée sur sa fiche. En cas d’imprévu, le mieux reste de prévenir le praticien via la messagerie.",
    "Si c’est le praticien qui annule, l’intégralité des sommes versées vous est remboursée automatiquement sous 5 à 10 jours ouvrés.",
  ],
  'paiement-securise': [
    "Tous les paiements sur GuériEnergies transitent par un prestataire certifié PCI-DSS. Nous ne stockons jamais vos données bancaires complètes sur nos serveurs.",
    "Le principe du séquestre protège chaque transaction : votre paiement est conservé jusqu’à la réalisation de la séance, puis reversé au praticien. En cas de litige, notre équipe peut intervenir — à condition que la transaction soit bien passée par GuériEnergies.",
    "C’est pourquoi nous vous déconseillons fortement tout paiement en dehors de la plateforme : il échapperait à ces protections.",
  ],
  'badge-verifie': [
    "Le badge « Vérifiée » signifie que notre équipe a contrôlé trois éléments essentiels : les diplômes ou certifications de la discipline, le numéro de SIRET, et l’identité du praticien.",
    "Cette vérification est réalisée manuellement, document par document, avant la mise en ligne du profil. Elle est renouvelée périodiquement pour garantir que les informations restent à jour.",
    "Le badge ne garantit pas un résultat thérapeutique — aucun praticien sérieux ne le promet — mais il vous assure que vous échangez avec une personne réelle, qualifiée et assurée.",
  ],
  'signaler-probleme': [
    "Chaque profil, message et avis dispose d’un bouton de signalement. Si un contenu vous semble inapproprié, trompeur ou abusif, n’hésitez pas à l’utiliser : notre équipe de modération examine chaque signalement.",
    "Décrivez la situation le plus précisément possible. Plus votre signalement est détaillé, plus notre intervention est rapide et adaptée.",
    "Selon la gravité, les suites peuvent aller du simple avertissement au retrait du contenu, voire à la suspension du compte concerné. Vous êtes informé du traitement de votre signalement.",
  ],
  'devenir-praticien': [
    "Pour proposer vos séances sur GuériEnergies, créez un profil praticien depuis la page « Devenir praticien ». Vous renseignez vos disciplines, votre approche, vos tarifs et vos modalités.",
    "Vous soumettez ensuite vos justificatifs : numéro de SIRET, diplômes et certifications. Notre équipe les vérifie généralement sous 48 heures.",
    "Une fois validé, votre profil apparaît dans la recherche avec le badge « Vérifiée ». Vous pouvez alors recevoir des demandes, échanger via la messagerie et gérer vos disponibilités.",
  ],
  'gerer-disponibilites': [
    "Vos disponibilités se gèrent depuis votre espace praticien, onglet « Agenda ». Vous y définissez vos plages horaires récurrentes ainsi que des exceptions ponctuelles.",
    "Vous pouvez distinguer les créneaux présentiels des créneaux en visio, et bloquer des journées entières en quelques clics — pour vos congés ou un imprévu.",
    "Tenir son agenda à jour réduit les annulations et améliore votre visibilité : les praticiens réactifs sont mieux mis en avant dans la recherche.",
  ],
  'donnees-personnelles': [
    "Vous gardez la main sur vos données. Depuis votre espace compte, rubrique « Confidentialité », vous pouvez consulter, rectifier ou supprimer les informations qui vous concernent.",
    "Vous pouvez également télécharger une copie de vos données (droit à la portabilité) ou demander la suppression complète de votre compte.",
    "Pour toute question, notre Délégué à la Protection des Données est joignable à dpo@aura.fr. Le détail des traitements figure dans notre politique de confidentialité.",
  ],
};

const DEFAULT_BODY = [
  "Cet article fait partie de notre centre d’aide. Notre équipe le met régulièrement à jour pour qu’il reste clair et utile.",
  "Si une information vous semble manquante ou imprécise, n’hésitez pas à nous le signaler : vos retours nous aident à améliorer l’accompagnement de toute la communauté.",
];

export default async function AideArticlePage({ params }) {
  const { slug } = await params;
  const article = helpArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const body = BODIES[slug] || DEFAULT_BODY;
  const related = helpArticles.filter((a) => a.cat === article.cat && a.slug !== slug).slice(0, 3);
  const fallback = helpArticles.filter((a) => a.slug !== slug).slice(0, 3);
  const others = related.length ? related : fallback;

  return (
    <section className="section">
      <div className="container-narrow">
        <nav className="crumbs reveal" style={{ marginBottom: 18 }}>
          <Link href="/aide">Aide</Link>
          <span className="muted"> / </span>
          <Link href="/aide">{article.cat}</Link>
          <span className="muted"> / </span>
          <span>{article.title}</span>
        </nav>

        <span className="eyebrow">{article.cat}</span>
        <h1 className="h-1" style={{ margin: '12px 0 28px' }}>{article.title}</h1>

        <article className="stack gap-4">
          {body.map((p, i) => (
            <p key={i} className="body" style={{ fontSize: 17, lineHeight: 1.75 }}>{p}</p>
          ))}
        </article>

        {/* Helpful */}
        <div className="card card-pad center" style={{ marginTop: 40 }}>
          <p className="h-4" style={{ marginBottom: 14 }}>Cet article vous a-t-il aidé ?</p>
          <div className="row gap-3" style={{ justifyContent: 'center' }}>
            <ToastButton message="Merci pour votre retour !" tone="success" className="btn btn-soft">
              <span className="row gap-2" style={{ alignItems: 'center' }}><Icon name="check" size={16} color="var(--sage-2, var(--violet-2))" /> Oui</span>
            </ToastButton>
            <ToastButton message="Merci, nous allons l’améliorer." tone="danger" className="btn btn-soft">
              <span className="row gap-2" style={{ alignItems: 'center' }}><Icon name="x" size={16} color="var(--muted)" /> Non</span>
            </ToastButton>
          </div>
          <p className="tiny muted" style={{ marginTop: 14 }}>
            Besoin d’aide ? <Link href="/contact" className="more">Contactez le support</Link>
          </p>
        </div>

        {/* Related */}
        <div style={{ marginTop: 48 }}>
          <h2 className="h-3" style={{ marginBottom: 16 }}>Articles liés</h2>
          <div className="stack gap-2">
            {others.map((a) => (
              <Link key={a.slug} href={`/aide/${a.slug}`} className="card card-pad row between" style={{ alignItems: 'center' }}>
                <div className="row gap-3" style={{ alignItems: 'center' }}>
                  <span className="tile-icon tint-violet"><Icon name="book" size={18} color="var(--violet-2)" /></span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{a.title}</div>
                    <div className="tiny muted">{a.cat}</div>
                  </div>
                </div>
                <Icon name="arrowRight" size={18} color="var(--muted)" />
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href="/aide" className="more">← Retour au centre d’aide</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
