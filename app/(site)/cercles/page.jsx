import Link from 'next/link';
import { cercles } from '@/lib/data/admin';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';
import { num } from '@/lib/format';

export const metadata = {
  title: 'Les cercles Aura — Communauté',
  description: 'Rejoignez un cercle Aura : des espaces de partage continus, en ligne et en présentiel, autour du soin et du bien-être.',
};

const WHY = [
  { i: 'users', t: 'Un groupe choisi', d: 'Des cercles à taille humaine, modérés, où chacun a sa place.' },
  { i: 'message', t: 'Le partage continu', d: 'Au-delà des événements ponctuels, la conversation se prolonge.' },
  { i: 'heart', t: 'Sans jugement', d: 'Un espace doux pour cheminer, poser des questions, témoigner.' },
];

export default function CerclesPage() {
  const active = cercles.filter((c) => c.status === 'active');
  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '66%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}
      >
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Communauté</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Les <span className="italic" style={{ color: 'var(--violet)' }}>cercles</span> Aura.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 580, margin: '0 auto' }}>
            Cheminer seul·e, c’est bien. Ensemble, c’est plus doux. Les cercles Aura réunissent celles et ceux qui partagent une pratique, une ville, une intention — pour échanger toute l’année.
          </p>
        </div>
      </section>

      {/* WHY */}
      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {WHY.map((w) => (
              <div key={w.t} className="card card-pad">
                <span className="tile-icon tint-violet" style={{ marginBottom: 14 }}><Icon name={w.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-3" style={{ marginBottom: 6 }}>{w.t}</h3>
                <p className="body">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CERCLES GRID */}
      <section className="section-sm" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Rejoindre</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>Les cercles ouverts</h2>
            </div>
          </div>
          <div className="grid grid-3">
            {active.map((c) => (
              <div key={c.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Link
                  href={`/cercle/${c.id}`}
                  className="aurora-dark grain"
                  style={{ height: 120, padding: 18, display: 'flex', alignItems: 'flex-end', '--orb-1': c.tone === 'gold' ? '#E4C896' : c.tone === 'sage' ? '#B8D4C2' : c.tone === 'violet' ? '#C4B0E8' : '#A8C8E8', '--orb-2': '#7B5FCF' }}
                >
                  <span className="serif" style={{ color: '#fff', fontSize: 21, fontWeight: 500, lineHeight: 1.15 }}>{c.name}</span>
                </Link>
                <div className="card-pad flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="row gap-3 small muted" style={{ marginBottom: 12 }}>
                    <span className="row gap-1"><Icon name="users" size={13} color="var(--muted)" />{num(c.members)} membres</span>
                    <span className="row gap-1"><Icon name="message" size={13} color="var(--muted)" />{num(c.posts)} échanges</span>
                  </div>
                  <p className="small flex-1" style={{ marginBottom: 14 }}>Animé par <strong>{c.lead}</strong>.</p>
                  <div className="row gap-2">
                    <Link href={`/cercle/${c.id}`} className="btn btn-soft btn-sm flex-1">Découvrir</Link>
                    <ToastButton
                      message={`Vous avez rejoint « ${c.name} » 🌿`}
                      tone="success"
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Rejoindre
                    </ToastButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '24%', '--orb-y': '32%', '--orb-1': '#B8D4C2', '--orb-2': '#7B5FCF', padding: 'clamp(40px,6vw,68px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Envie de créer votre cercle ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>
              Praticiens et membres engagés : ouvrez un espace autour de votre pratique ou de votre région.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ToastButton message="Demande envoyée — l’équipe Aura vous recontacte sous 48h." tone="success" className="btn btn-aurora btn-lg">
                Proposer un cercle
              </ToastButton>
              <Link href="/evenements" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Voir l’agenda</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
