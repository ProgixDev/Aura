import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ModalButton } from '@/components/ui/ModalButton';

export const metadata = { title: 'Cartes cadeaux — Aura' };

const AMOUNTS = [50, 80, 120, 200];

const STEPS = [
  { n: '01', t: 'Choisissez un montant', d: 'De 50 € à 200 €, ou le montant libre de votre choix.' },
  { n: '02', t: 'Personnalisez le message', d: 'Un mot doux, une date d’envoi — c’est vous qui composez.' },
  { n: '03', t: 'Offrez en toute liberté', d: 'Le ou la destinataire choisit son praticien et sa séance.' },
];

const PERKS = [
  { i: 'clock', t: 'Valable 1 an', d: 'Aucune pression : la carte reste utilisable 12 mois.' },
  { i: 'layers', t: 'Toutes les disciplines', d: 'Magnétisme, Reiki, hypnose, sonothérapie… au choix.' },
  { i: 'shield', t: 'Sans engagement', d: 'Utilisable en une fois ou répartie sur plusieurs séances.' },
];

export default function CadeauPage() {
  return (
    <>
      <section className="aurora-dark grain" style={{ '--orb-x': '28%', '--orb-y': '22%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '96px 0 100px' }}>
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: '1fr 0.85fr', gap: 40, alignItems: 'center' }}>
            <div className="reveal">
              <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Cartes cadeaux</span>
              <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 18px' }}>
                Offrez un moment de <span className="italic" style={{ color: 'var(--violet)' }}>douceur</span>.
              </h1>
              <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 480, marginBottom: 28 }}>
                Le plus beau des cadeaux : du temps pour soi. Une carte Aura, et la personne choisit la séance qui lui ressemble.
              </p>
              <ModalButton modal="gift" className="btn btn-aurora btn-lg">Offrir une carte</ModalButton>
            </div>

            {/* GIFT CARD ILLUSTRATION */}
            <div className="reveal r-2" style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="glass" style={{ width: 340, borderRadius: 24, padding: 28, border: '1px solid rgba(255,255,255,0.28)' }}>
                <div className="row between" style={{ marginBottom: 36 }}>
                  <div className="row gap-2"><Lotus size={20} color="#fff" /><span className="serif" style={{ color: '#fff', fontSize: 20 }}>Aura</span></div>
                  <span className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>CARTE CADEAU</span>
                </div>
                <div className="serif" style={{ color: '#fff', fontSize: 44, marginBottom: 4 }}>120 €</div>
                <div className="tiny" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 26 }}>AURA · 2026 · ✦ ✦ ✦ ✦</div>
                <div className="row between">
                  <span className="tiny" style={{ color: 'rgba(255,255,255,0.7)' }}>Pour : un proche cher·e</span>
                  <span className="tiny" style={{ color: 'rgba(255,255,255,0.7)' }}>Valable 1 an</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AMOUNTS */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">Montants</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Choisissez votre formule</h2>
          </div>
          <div className="grid grid-4">
            {AMOUNTS.map((a) => (
              <div key={a} className="card card-pad card-hover center stack" style={{ gap: 12, alignItems: 'center' }}>
                <div className="serif accent" style={{ fontSize: 42 }}>{a} €</div>
                <p className="tiny muted">{a === 50 ? '≈ 1 séance' : a === 200 ? '≈ 4 séances' : `≈ ${Math.round(a / 50)} séances`}</p>
                <ModalButton modal="gift" payload={{ amount: a }} className="btn btn-soft btn-sm btn-block">Offrir {a} €</ModalButton>
              </div>
            ))}
          </div>
          <div className="center mt-4" style={{ marginTop: 24 }}>
            <ModalButton modal="gift" className="btn btn-link">Montant libre →</ModalButton>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-sm" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 44 }}>
            <span className="eyebrow">Simple</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Comment ça marche</h2>
          </div>
          <div className="grid grid-3">
            {STEPS.map((s) => (
              <div key={s.n} className="stack">
                <span className="serif italic accent" style={{ fontSize: 40 }}>{s.n}</span>
                <h3 className="h-3" style={{ margin: '8px 0 6px' }}>{s.t}</h3>
                <p className="body">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERKS */}
      <section className="section-sm">
        <div className="container">
          <div className="grid grid-3">
            {PERKS.map((p) => (
              <div key={p.t} className="card-line card-pad stack" style={{ gap: 8 }}>
                <Icon name={p.i} size={20} color="var(--violet-2)" />
                <h3 className="h-4">{p.t}</h3>
                <p className="small">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '20%', '--orb-y': '30%', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Un cadeau qui fait du bien</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 500, margin: '0 auto 28px' }}>
              Anniversaire, remerciement, simple attention : offrez du temps pour soi.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="gift" className="btn btn-aurora btn-lg">Offrir une carte</ModalButton>
              <Link href="/faq" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Des questions ?</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
