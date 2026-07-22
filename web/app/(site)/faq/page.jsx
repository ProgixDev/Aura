import Link from 'next/link';
import { faq } from '@/lib/data/content';
import { Icon } from '@/components/ui/Icon';
import { Accordion } from './Accordion';

export const metadata = { title: 'Questions fréquentes — GuériEnergies' };

export default function FaqPage() {
  return (
    <>
      <section className="aurora-dark grain" style={{ '--orb-x': '24%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '92px 0 96px' }}>
        <div className="container-narrow reveal center">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Aide</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 18px' }}>
            Vos questions, nos <span className="italic" style={{ color: 'var(--violet)' }}>réponses</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>
            Réservation, paiement, vérification des praticiens — l’essentiel en un coup d’œil.
          </p>
          <div className="glass row gap-2" style={{ maxWidth: 440, margin: '0 auto', padding: '12px 16px', borderRadius: 999 }}>
            <Icon name="search" size={18} color="rgba(255,255,255,0.7)" />
            <Link href="/aide" style={{ color: 'rgba(255,255,255,0.82)', flex: 1, textAlign: 'left' }}>Rechercher dans le centre d’aide…</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-narrow">
          <div className="stack" style={{ gap: 48 }}>
            {faq.map((group) => (
              <div key={group.cat}>
                <div className="row gap-2" style={{ marginBottom: 16 }}>
                  <span className="tile-icon tint-violet" style={{ width: 32, height: 32 }}><Icon name="layers" size={16} color="var(--violet-2)" /></span>
                  <h2 className="h-3">{group.cat}</h2>
                </div>
                <Accordion items={group.items} />
              </div>
            ))}
          </div>

          <div className="card card-pad center mt-6" style={{ marginTop: 56 }}>
            <h3 className="h-3" style={{ marginBottom: 6 }}>Vous ne trouvez pas votre réponse ?</h3>
            <p className="body" style={{ marginBottom: 20 }}>Notre centre d’aide va plus loin, et l’équipe reste joignable.</p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/aide" className="btn btn-primary">Centre d’aide</Link>
              <Link href="/contact" className="btn btn-soft">Nous contacter</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
