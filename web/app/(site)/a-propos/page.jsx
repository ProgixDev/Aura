import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { Avatar } from '@/components/ui/Avatar';
import { Lotus } from '@/components/ui/Lotus';
import { values } from '@/lib/data/content';

const FOUNDERS = [
  { name: 'Camille Roussel', role: 'Cofondatrice & CEO', tone: 'violet', blurb: 'Ancienne praticienne, lassée des annuaires sans filtre, elle a voulu un lieu où le sérieux se voit.' },
  { name: 'Mathieu Vernet', role: 'Cofondateur & CTO', tone: 'sky', blurb: 'Ingénieur, convaincu que la technologie doit servir la confiance, pas la remplacer.' },
];

const STATS = [
  ['2 400+', 'praticiens vérifiés'],
  ['48 000', 'séances réservées'],
  ['4,9 / 5', 'satisfaction moyenne'],
  ['72', 'villes couvertes'],
];

export default function AProposPage() {
  return (
    <>
      {/* HERO */}
      <section className="aurora-dark grain" style={{ '--orb-x': '40%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}>
        <div className="container-narrow reveal">
          <Lotus size={28} color="rgba(255,255,255,0.9)" />
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Remettre la <span className="italic" style={{ color: 'var(--violet)' }}>confiance</span> au cœur du soin.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 580, margin: '0 auto' }}>
            Aura est née d’une conviction simple : celles et ceux qui cherchent du mieux-être méritent de trouver des praticiens sérieux, sans fouiller des heures ni croiser les doigts.
          </p>
        </div>
      </section>

      {/* MISSION NARRATIVE */}
      <section className="section">
        <div className="container-narrow">
          <span className="eyebrow">Notre mission</span>
          <h2 className="h-1" style={{ margin: '12px 0 24px' }}>Un pont entre le besoin et le sérieux</h2>
          <p className="lead" style={{ marginBottom: 18 }}>
            Le bien-être énergétique souffre d’un paradoxe : des milliers de praticiens compétents, et presque aucun moyen de les distinguer des promesses creuses. Résultat, les clients hésitent, et les praticiens sérieux se fondent dans la masse.
          </p>
          <p className="body" style={{ marginBottom: 18 }}>
            Nous avons construit Aura pour résoudre ce paradoxe. Chaque praticien est <span className="serif-accent">vérifié</span> à la main : diplômes, assurance, identité. Chaque paiement est protégé. Chaque échange peut être signalé. La confiance n’est pas un argument marketing — c’est l’infrastructure.
          </p>
          <p className="body">
            Nous ne promettons pas de miracles, et nous nous méfions de ceux qui en promettent. Nous offrons un cadre clair, doux et exigeant, où la rencontre entre une personne et un praticien peut se faire sereinement.
          </p>
          <div className="mt-4">
            <Link href="/manifeste" className="more">Lire notre manifeste →</Link>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Ce qui nous guide</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Nos valeurs</h2>
          </div>
          <div className="grid grid-2">
            {values.map((v) => (
              <div key={v.t} className="card card-pad row gap-3" style={{ alignItems: 'flex-start' }}>
                <span className="tile-icon tint-violet"><Icon name={v.i} size={20} color="var(--violet-2)" /></span>
                <div>
                  <h3 className="h-3" style={{ marginBottom: 6 }}>{v.t}</h3>
                  <p className="body">{v.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDERS */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Les fondateurs</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Deux regards, une même exigence</h2>
          </div>
          <div className="grid grid-2">
            {FOUNDERS.map((f) => (
              <div key={f.name} className="card card-pad">
                <div className="row gap-3" style={{ marginBottom: 14 }}>
                  <Avatar name={f.name} tone={f.tone} size={64} />
                  <div>
                    <div className="h-3">{f.name}</div>
                    <div className="small muted">{f.role}</div>
                  </div>
                </div>
                <p className="body">{f.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '70%', '--orb-y': '30%', padding: 'clamp(40px,5vw,64px)', borderRadius: 'var(--r-sheet)' }}>
            <div className="center" style={{ marginBottom: 36 }}>
              <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Aura en chiffres</span>
              <h2 className="h-2" style={{ color: '#fff', marginTop: 10 }}>L’impact, mesuré</h2>
            </div>
            <div className="grid grid-4">
              {STATS.map(([v, l]) => (
                <div key={l} className="center">
                  <div className="serif" style={{ fontSize: 40, color: '#fff', lineHeight: 1 }}>{v}</div>
                  <div className="tiny" style={{ color: 'rgba(255,255,255,0.65)', marginTop: 8 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA / LINKS */}
      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            <div className="card card-pad">
              <span className="tile-icon tint-sage" style={{ marginBottom: 14 }}><Icon name="sparkle" size={20} color="var(--violet-2)" /></span>
              <h3 className="h-3" style={{ marginBottom: 6 }}>Notre manifeste</h3>
              <p className="body" style={{ marginBottom: 16 }}>Ce en quoi nous croyons, écrit noir sur blanc. Notre boussole éditoriale et éthique.</p>
              <Link href="/manifeste" className="btn btn-soft">Lire le manifeste</Link>
            </div>
            <div className="card card-pad">
              <span className="tile-icon tint-gold" style={{ marginBottom: 14 }}><Icon name="users" size={20} color="var(--violet-2)" /></span>
              <h3 className="h-3" style={{ marginBottom: 6 }}>Nous rejoindre</h3>
              <p className="body" style={{ marginBottom: 16 }}>Nous construisons une équipe qui prend soin. Découvrez nos postes ouverts.</p>
              <Link href="/carrieres" className="btn btn-soft">Voir les offres</Link>
            </div>
          </div>
          <div className="center" style={{ marginTop: 40 }}>
            <ModalButton modal="contact" className="btn btn-primary">Nous contacter</ModalButton>
          </div>
        </div>
      </section>
    </>
  );
}
