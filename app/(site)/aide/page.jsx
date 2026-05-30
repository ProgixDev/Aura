import Link from 'next/link';
import { helpArticles } from '@/lib/data/content';
import { Icon } from '@/components/ui/Icon';

const CAT_META = {
  'Premiers pas': { glyph: 'sparkle', tint: 'tint-violet', color: 'var(--violet-2)', d: 'Tout pour bien débuter sur Aura.' },
  'Réservation': { glyph: 'calendar', tint: 'tint-sky', color: 'var(--sky-2, var(--violet-2))', d: 'Réserver, reporter, annuler une séance.' },
  'Paiement': { glyph: 'card', tint: 'tint-gold', color: 'var(--gold-2, var(--violet-2))', d: 'Paiements sécurisés et factures.' },
  'Confiance': { glyph: 'shield', tint: 'tint-sage', color: 'var(--sage-2, var(--violet-2))', d: 'Vérification, modération, signalements.' },
  'Praticiens': { glyph: 'user', tint: 'tint-violet', color: 'var(--violet-2)', d: 'Créer et gérer votre profil praticien.' },
  'Compte': { glyph: 'settings', tint: 'tint-sky', color: 'var(--sky-2, var(--violet-2))', d: 'Paramètres, données et confidentialité.' },
};

export default function AidePage() {
  const cats = [...new Set(helpArticles.map((a) => a.cat))];
  const grouped = cats.map((cat) => ({ cat, items: helpArticles.filter((a) => a.cat === cat) }));
  const popular = helpArticles.slice(0, 5);

  return (
    <>
      {/* HERO with search */}
      <section className="aurora-dark grain" style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '96px 0 88px', textAlign: 'center' }}>
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Centre d’aide</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 16px' }}>
            Comment pouvons-nous <span className="italic" style={{ color: 'var(--violet)' }}>vous aider</span> ?
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>
            Trouvez une réponse en quelques secondes, ou écrivez-nous : notre équipe répond avec soin.
          </p>
          <div className="row" style={{ maxWidth: 520, margin: '0 auto', background: '#fff', borderRadius: 999, padding: '6px 6px 6px 18px', alignItems: 'center', gap: 10 }}>
            <Icon name="search" size={18} color="var(--muted)" />
            <input className="input" placeholder="Rechercher dans l’aide…" style={{ border: 'none', background: 'transparent', flex: 1, padding: '8px 0' }} />
            <span className="btn btn-aurora btn-sm">Rechercher</span>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Parcourir</span><h2 className="h-2" style={{ marginTop: 8 }}>Par thème</h2></div>
          </div>
          <div className="grid grid-3">
            {grouped.map(({ cat, items }) => {
              const m = CAT_META[cat] || { glyph: 'book', tint: 'tint-violet', color: 'var(--violet-2)', d: '' };
              return (
                <div key={cat} className="card card-pad card-hover">
                  <span className={`tile-icon ${m.tint}`} style={{ marginBottom: 14 }}><Icon name={m.glyph} size={20} color={m.color} /></span>
                  <h3 className="h-3" style={{ marginBottom: 4 }}>{cat}</h3>
                  <p className="small muted" style={{ marginBottom: 14 }}>{m.d}</p>
                  <ul className="stack gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {items.map((a) => (
                      <li key={a.slug}>
                        <Link href={`/aide/${a.slug}`} className="row gap-2 small" style={{ alignItems: 'center' }}>
                          <Icon name="chevronRight" size={14} color="var(--violet-2)" />
                          <span className="flex-1">{a.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* POPULAR */}
      <section className="section-sm" style={{ background: 'var(--mist)' }}>
        <div className="container-narrow">
          <div className="section-head">
            <div><span className="eyebrow">Les plus consultés</span><h2 className="h-2" style={{ marginTop: 8 }}>Articles populaires</h2></div>
          </div>
          <div className="stack gap-2">
            {popular.map((a) => (
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
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="section">
        <div className="container">
          <div className="card card-pad row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <h3 className="h-2" style={{ marginBottom: 6 }}>Vous ne trouvez pas votre réponse ?</h3>
              <p className="body muted" style={{ maxWidth: 460 }}>Notre équipe support vous répond sous 24h, avec attention et sans jargon.</p>
            </div>
            <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
              <Link href="/faq" className="btn btn-soft">Consulter la FAQ</Link>
              <Link href="/contact" className="btn btn-primary">Contacter le support</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
