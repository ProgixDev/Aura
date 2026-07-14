'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

export default function DisciplinesPage() {
  const { data } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const disciplines = data?.data ?? [];

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '70%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}
      >
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Explorer</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Toutes les <span className="italic" style={{ color: 'var(--violet)' }}>disciplines</span> du soin.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto' }}>
            Du magnétisme à l'hypnose, chaque pratique a sa porte d'entrée. Trouvez celle qui vous appelle, et le praticien qui l'incarne.
          </p>
          <div className="row gap-6" style={{ justifyContent: 'center', marginTop: 40, color: 'rgba(255,255,255,0.75)', flexWrap: 'wrap' }}>
            <div className="center">
              <div className="serif" style={{ fontSize: 30, color: '#fff' }}>{disciplines.length}</div>
              <div className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>disciplines</div>
            </div>
            <div className="center">
              <div className="serif" style={{ fontSize: 30, color: '#fff' }}>4,9 / 5</div>
              <div className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Le catalogue</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>Choisissez votre pratique</h2>
            </div>
            <Link href="/praticiens" className="more">Tous les praticiens →</Link>
          </div>
          <div className="grid grid-3">
            {disciplines.map((d) => (
              <Link key={d.slug} href={`/discipline/${d.slug}`} className="card card-pad card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 14 }}>
                  <span className={`tile-icon glyph-${d.tonalite}`} style={{ fontSize: 22 }}>{d.glyphe}</span>
                </div>
                <h3 className="h-3" style={{ marginBottom: 6 }}>{d.nom}</h3>
                <p className="body flex-1" style={{ marginBottom: 14 }}>{d.accroche}</p>
                <span className="row gap-1 small accent" style={{ fontWeight: 500 }}>
                  Découvrir <Icon name="arrowRight" size={14} color="var(--violet-2)" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '25%', '--orb-y': '35%', '--orb-1': '#B8D4C2', '--orb-2': '#7B5FCF', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Vous hésitez encore ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>
              Décrivez-nous ce que vous traversez — nous vous orientons vers la discipline et le praticien adaptés.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="contact" payload={{ name: 'Aura' }} className="btn btn-aurora btn-lg">Être guidé·e</ModalButton>
              <Link href="/praticiens" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Parcourir les praticiens</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
