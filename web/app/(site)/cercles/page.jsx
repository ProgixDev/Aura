'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

const WHY = [
  { i: 'users', t: 'Un groupe choisi', d: 'Des cercles à taille humaine, modérés, où chacun a sa place.' },
  { i: 'message', t: 'Le partage continu', d: 'Au-delà des événements ponctuels, la conversation se prolonge.' },
  { i: 'heart', t: 'Sans jugement', d: 'Un espace doux pour cheminer, poser des questions, témoigner.' },
];

export default function CerclesPage() {
  const { data } = useQuery({
    queryKey: ['cercles'],
    queryFn: () => api.get('/cercles?per_page=50'),
  });
  const cercles = data?.data ?? [];

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
            Les <span className="italic" style={{ color: 'var(--violet)' }}>cercles</span> GuériEnergies.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 580, margin: '0 auto' }}>
            Cheminer seul·e, c'est bien. Ensemble, c'est plus doux. Les cercles GuériEnergies réunissent celles et ceux qui partagent une pratique, une ville, une intention — pour échanger toute l'année.
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
            {cercles.map((c) => (
              <div key={c.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Link
                  href={`/cercle/${c.id}`}
                  className="aurora-dark grain"
                  style={{
                    height: 120, padding: 18, display: 'flex', alignItems: 'flex-end', '--orb-1': c.color || '#C4B0E8', '--orb-2': '#7B5FCF',
                    ...(c.image ? { backgroundImage: `linear-gradient(rgba(20,12,35,0.25), rgba(10,6,20,0.55)), url(${c.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
                  }}
                >
                  <span className="serif" style={{ color: '#fff', fontSize: 21, fontWeight: 500, lineHeight: 1.15 }}>{c.nom}</span>
                </Link>
                <div className="card-pad flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
                  {c.animateur && (
                    <p className="small" style={{ marginBottom: 10 }}>Animé par <strong>{c.animateur}</strong>.</p>
                  )}
                  {c.description && (
                    <p className="small muted flex-1" style={{ marginBottom: 14 }}>{c.description}</p>
                  )}
                  <div className="row gap-2">
                    <Link href={`/cercle/${c.id}`} className="btn btn-soft btn-sm flex-1">Découvrir</Link>
                    <ToastButton
                      message={`Vous avez rejoint « ${c.nom} » 🌿`}
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
              <ToastButton message="Demande envoyée — l'équipe GuériEnergies vous recontacte sous 48h." tone="success" className="btn btn-aurora btn-lg">
                Proposer un cercle
              </ToastButton>
              <Link href="/evenements" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Voir l'agenda</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
