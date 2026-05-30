import Link from 'next/link';
import { notFound } from 'next/navigation';
import { disciplines, getDiscipline } from '@/lib/data/disciplines';
import { practitioners } from '@/lib/data/practitioners';
import { PractitionerCard } from '@/components/cards/PractitionerCard';
import { ModalButton } from '@/components/ui/ModalButton';
import { Icon } from '@/components/ui/Icon';

const ORB = {
  sky: ['#A8C8E8', '#5B7FB8'],
  violet: ['#C4B0E8', '#7B5FCF'],
  sage: ['#B8D4C2', '#6FA383'],
  gold: ['#E4C896', '#C49A4A'],
};

export function generateStaticParams() {
  return disciplines.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const d = getDiscipline(slug);
  if (!d) return { title: 'Discipline — Aura' };
  return { title: `${d.name} — Aura`, description: d.tagline };
}

export default async function DisciplinePage({ params }) {
  const { slug } = await params;
  const d = getDiscipline(slug);
  if (!d) notFound();

  const [orb1, orb2] = ORB[d.tone] || ORB.violet;
  const matches = practitioners.filter((p) =>
    p.specialties.some((s) => s.toLowerCase().includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(s.toLowerCase()))
  );

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '68%', '--orb-y': '20%', '--orb-1': orb1, '--orb-2': orb2, padding: '104px 0 110px' }}
      >
        <div className="container-narrow reveal">
          <div className="row gap-2 small" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 22 }}>
            <Link href="/disciplines" style={{ color: 'rgba(255,255,255,0.7)' }}>Disciplines</Link>
            <Icon name="chevronRight" size={13} color="rgba(255,255,255,0.5)" />
            <span>{d.name}</span>
          </div>
          <span className={`tile-icon glyph-${d.tone}`} style={{ fontSize: 26, marginBottom: 20, background: 'rgba(255,255,255,0.12)' }}>{d.glyph}</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '0 0 16px' }}>{d.name}</h1>
          <p className="lead italic serif" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 560 }}>{d.tagline}.</p>
          <div className="row gap-3" style={{ marginTop: 32, flexWrap: 'wrap' }}>
            <Link href="/praticiens" className="btn btn-aurora btn-lg">Voir les praticiens</Link>
            <span className="row gap-2 small" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <Icon name="users" size={15} color="rgba(255,255,255,0.7)" />{d.count} praticiens vérifiés
            </span>
          </div>
        </div>
      </section>

      {/* INTRO + PULL QUOTE */}
      <section className="section">
        <div className="container-narrow">
          <span className="eyebrow">La pratique</span>
          <p className="lead" style={{ marginTop: 14 }}>{d.intro}</p>
          <figure className="card-pad tint-violet" style={{ borderRadius: 'var(--r-card)', margin: '40px 0 0' }}>
            <p className="serif" style={{ fontSize: 'clamp(22px,3vw,30px)', lineHeight: 1.35, fontWeight: 400 }}>
              « {d.pullQuote} »
            </p>
          </figure>
        </div>
      </section>

      {/* EXPECTATIONS */}
      <section className="section-sm" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 40 }}>
            <span className="eyebrow">À quoi s’attendre</span>
            <h2 className="h-2" style={{ marginTop: 10 }}>Une séance type</h2>
          </div>
          <div className="grid grid-4">
            {d.expectations.map((x, i) => (
              <div key={i} className="card card-pad">
                <span className="serif italic accent" style={{ fontSize: 30 }}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className="h-4" style={{ margin: '10px 0 6px', fontWeight: 500 }}>{x.h}</h3>
                <p className="small">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRACTITIONERS */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Sélection</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>Praticiens en {d.name}</h2>
            </div>
            <Link href="/praticiens" className="more">Tous les praticiens →</Link>
          </div>
          {matches.length > 0 ? (
            <div className="grid" style={{ gap: 16 }}>
              {matches.map((p) => <PractitionerCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="empty card card-pad center">
              <span className={`tile-icon glyph-${d.tone}`} style={{ fontSize: 22, margin: '0 auto 12px' }}>{d.glyph}</span>
              <p className="body">Aucun praticien affiché pour le moment dans cette discipline.</p>
              <div style={{ marginTop: 16 }}>
                <Link href="/praticiens" className="btn btn-primary">Explorer toutes les disciplines</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '22%', '--orb-y': '30%', '--orb-1': orb1, '--orb-2': orb2, padding: 'clamp(40px,6vw,68px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Une question sur le {d.name.toLowerCase()} ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 500, margin: '0 auto 28px' }}>
              Posez vos questions avant de réserver — sans engagement, dans un cadre bienveillant.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="contact" payload={{ name: d.name }} className="btn btn-aurora btn-lg">Poser une question</ModalButton>
              <Link href="/praticiens" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Trouver un praticien</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
