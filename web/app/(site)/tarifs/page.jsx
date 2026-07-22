import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { plans } from '@/lib/data/content';
import { euro } from '@/lib/format';

const COMPARE = [
  { label: 'Profil public vérifié', vals: [true, true, true] },
  { label: 'Séances par mois', vals: ['5', 'Illimité', 'Illimité'] },
  { label: 'Messagerie sécurisée', vals: [true, true, true] },
  { label: 'Paiement protégé', vals: [true, true, true] },
  { label: 'Mise en avant dans la recherche', vals: [false, true, true] },
  { label: 'Statistiques détaillées', vals: [false, true, true] },
  { label: 'Gestion d’événements', vals: [false, true, true] },
  { label: 'Troc de soins', vals: [false, true, true] },
  { label: 'Badge « À la une »', vals: [false, false, true] },
  { label: 'Page praticien personnalisée', vals: [false, false, true] },
  { label: 'Outils retraites & cercles', vals: [false, false, true] },
  { label: 'Support', vals: ['Standard', 'Standard', 'Prioritaire'] },
];

const BILLING_FAQ = [
  { q: 'Puis-je changer de formule à tout moment ?', a: "Oui. Vous pouvez passer à une formule supérieure ou revenir à l’Essentiel quand vous le souhaitez. Le changement prend effet immédiatement, au prorata." },
  { q: 'Y a-t-il un engagement ?', a: "Aucun. Les abonnements sont mensuels et sans engagement. Vous résiliez en un clic depuis votre espace, et restez actif jusqu’à la fin de la période payée." },
  { q: 'Comment suis-je payé pour mes séances ?', a: "Indépendamment de l’abonnement, vous recevez le montant de chaque séance après sa réalisation, directement sur votre compte. GuériEnergies prélève une commission de service transparente." },
  { q: 'L’Essentiel est-il vraiment gratuit ?', a: "Oui, sans carte requise. Vous bénéficiez du profil vérifié, de la messagerie et du paiement protégé, dans la limite de 5 séances par mois." },
  { q: 'Puis-je obtenir une facture ?', a: 'Chaque paiement d’abonnement génère une facture téléchargeable depuis votre espace compte.' },
];

const Cell = ({ v }) => {
  if (v === true) return <Icon name="check" size={16} color="var(--violet-2)" />;
  if (v === false) return <Icon name="x" size={15} color="var(--muted)" />;
  return <span className="small">{v}</span>;
};

export default function TarifsPage() {
  return (
    <>
      {/* HERO */}
      <section className="aurora-dark grain" style={{ '--orb-x': '50%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '100px 0 110px', textAlign: 'center' }}>
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Tarifs praticiens</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Une formule pour chaque <span className="italic" style={{ color: 'var(--violet)' }}>étape</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 540, margin: '0 auto' }}>
            Commencez gratuitement, évoluez quand vous le souhaitez. Sans engagement, résiliable en un clic.
          </p>
        </div>
      </section>

      {/* PLAN CARDS */}
      <section className="section">
        <div className="container">
          <div className="grid grid-3" style={{ alignItems: 'stretch' }}>
            {plans.map((p) => (
              <div key={p.id} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', ...(p.highlight ? { borderColor: 'var(--violet)', boxShadow: '0 16px 48px rgba(124,95,207,0.18)', transform: 'translateY(-6px)' } : {}) }}>
                <div className="between">
                  <h3 className="h-3">{p.name}</h3>
                  {p.highlight && <Badge variant="featured">Le plus choisi</Badge>}
                </div>
                <p className="small muted" style={{ marginBottom: 16 }}>{p.tagline}</p>
                <div className="price" style={{ marginBottom: 20 }}>
                  {p.price === 0 ? 'Gratuit' : euro(p.price)}<small>{p.price === 0 ? '' : p.period}</small>
                </div>
                <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                  {p.features.map((f) => (
                    <li key={f} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                      <Icon name="checkCircle" size={16} color="var(--violet-2)" />
                      <span className="body">{f}</span>
                    </li>
                  ))}
                </ul>
                {/* Practitioner subscription tiers — onboarding is via contact until the
                    multipart praticien registration form exists (real endpoint POST /v1/praticien/register).
                    Must NOT open modal="signup" (that creates a CLIENT account). */}
                <Link href="/contact" className={p.highlight ? 'btn btn-primary btn-block btn-lg' : 'btn btn-soft btn-block btn-lg'}>{p.cta}</Link>
              </div>
            ))}
          </div>
          <p className="small muted center" style={{ marginTop: 24 }}>Tous les prix sont hors taxes. La commission de service sur les séances reste identique quelle que soit la formule.</p>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 36 }}>
            <span className="eyebrow">Comparatif</span>
            <h2 className="h-2" style={{ marginTop: 10 }}>Le détail des formules</h2>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Fonctionnalité</th>
                  {plans.map((p) => (
                    <th key={p.id} className="center">{p.name}{p.highlight && <span className="accent serif italic"> ★</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} className="center"><Cell v={v} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* BILLING FAQ */}
      <section className="section">
        <div className="container-narrow">
          <div className="center" style={{ marginBottom: 36 }}>
            <span className="eyebrow">Facturation</span>
            <h2 className="h-2" style={{ marginTop: 10 }}>Questions sur l’abonnement</h2>
          </div>
          <div className="stack gap-3">
            {BILLING_FAQ.map((it) => (
              <div key={it.q} className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 6 }}>{it.q}</h3>
                <p className="body">{it.a}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 24 }}>
            <Link href="/faq" className="more">Voir toute la FAQ →</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '30%', '--orb-y': '25%', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Lancez-vous gratuitement</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>Aucune carte requise pour démarrer. Évoluez le jour où vous en aurez besoin.</p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-aurora btn-lg">Créer mon profil</Link>
              <Link href="/devenir-praticien" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>En savoir plus</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
