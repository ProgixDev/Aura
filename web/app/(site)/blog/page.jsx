'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ModalButton } from '@/components/ui/ModalButton';
import { dateFr } from '@/lib/format';

const ORBS = {
  violet: { '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF' },
  sky: { '--orb-1': '#A9CDEB', '--orb-2': '#5A86C4' },
  sage: { '--orb-1': '#BBD6BA', '--orb-2': '#5E9A6B' },
  gold: { '--orb-1': '#E8D2A0', '--orb-2': '#C49A4F' },
};

export default function BlogIndexPage() {
  const { data } = useQuery({
    queryKey: ['articles', 'public'],
    queryFn: () => api.get('/articles?status=publié&per_page=50'),
  });
  const posts = data?.data ?? [];
  const [featured, ...rest] = posts;

  if (!featured) return null;

  const orb = ORBS[featured.tonalite] || ORBS.violet;

  return (
    <>
      {/* HERO */}
      <section className="section-sm">
        <div className="container">
          <div className="center reveal">
            <span className="eyebrow">Journal</span>
            <h1 className="h-display" style={{ margin: '14px 0 14px' }}>
              Lire, comprendre, <span className="italic accent">ralentir</span>.
            </h1>
            <p className="lead muted" style={{ maxWidth: 560, margin: '0 auto' }}>
              Guides, regards de praticiens et conseils pour cheminer en confiance dans le bien-être énergétique.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section-sm">
        <div className="container">
          <Link href={`/blog/${featured.slug}`} className="card card-hover reveal r-1" style={{ overflow: 'hidden', display: 'block' }}>
            <div className="grid grid-2" style={{ gap: 0, alignItems: 'stretch' }}>
              <div
                className="aurora-dark grain"
                style={{
                  '--orb-x': '70%', '--orb-y': '20%', ...orb, minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 36,
                  ...(featured.image_couverture ? { backgroundImage: `linear-gradient(rgba(20,12,35,0.3), rgba(10,6,20,0.6)), url(${featured.image_couverture})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
                }}
              >
                <Badge variant="featured">À la une</Badge>
                <div className="row gap-2" style={{ marginTop: 'auto', paddingTop: 24, color: 'rgba(255,255,255,0.7)' }}>
                  <Lotus size={16} color="rgba(255,255,255,0.9)" />
                  <span className="tiny">{featured.categorie} · {featured.temps_lecture} min</span>
                </div>
              </div>
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="eyebrow">{featured.categorie}</span>
                <h2 className="h-1" style={{ margin: '10px 0 12px' }}>{featured.titre}</h2>
                <p className="lead muted" style={{ marginBottom: 22 }}>{featured.extrait}</p>
                <div className="row gap-3" style={{ alignItems: 'center' }}>
                  <Avatar name={featured.auteur} size={44} rounded />
                  <div>
                    <div className="small" style={{ fontWeight: 600 }}>{featured.auteur}</div>
                    <div className="tiny muted">{dateFr(featured.date_publication)}</div>
                  </div>
                  <span className="row gap-1" style={{ marginLeft: 'auto', color: 'var(--violet-2)' }}>
                    <span className="small">Lire</span><Icon name="arrowRight" size={16} color="var(--violet-2)" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* GRID */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <h2 className="h-2">Tous les articles</h2>
          </div>
          <div className="grid grid-3">
            {rest.map((post, i) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className={`card card-hover reveal r-${(i % 5) + 2}`} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div
                  className="aurora-dark grain"
                  style={{
                    '--orb-x': '65%', '--orb-y': '25%', ...(ORBS[post.tonalite] || ORBS.violet), height: 140, display: 'flex', alignItems: 'flex-end', padding: 18,
                    ...(post.image_couverture ? { backgroundImage: `linear-gradient(rgba(20,12,35,0.25), rgba(10,6,20,0.55)), url(${post.image_couverture})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
                  }}
                >
                  <Badge variant="neutral" dot>{post.categorie}</Badge>
                </div>
                <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div className="tiny muted row gap-2">
                    <span>{dateFr(post.date_publication)}</span><span>·</span><span>{post.temps_lecture} min</span>
                  </div>
                  <h3 className="h-3" style={{ margin: '8px 0 8px' }}>{post.titre}</h3>
                  <p className="small muted" style={{ flex: 1 }}>{post.extrait}</p>
                  <div className="row gap-2" style={{ alignItems: 'center', marginTop: 16 }}>
                    <Avatar name={post.auteur} size={28} rounded />
                    <span className="tiny muted">{post.auteur}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER CTA */}
      <section className="section-sm">
        <div className="container">
          <div className="aurora-dark grain reveal" style={{ '--orb-x': '20%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', borderRadius: 20, padding: '52px 40px', textAlign: 'center' }}>
            <Lotus size={22} color="rgba(255,255,255,0.9)" />
            <h2 className="h-1" style={{ color: '#fff', margin: '14px 0 12px' }}>
              Recevez le <span className="italic" style={{ color: 'var(--violet)' }}>Journal</span> chaque mois
            </h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 480, margin: '0 auto 26px' }}>
              Nos meilleurs articles, des conseils et des sélections de praticiens. Une fois par mois, sans bruit.
            </p>
            <ModalButton modal="newsletter" className="btn btn-aurora btn-lg">S'inscrire à la newsletter</ModalButton>
          </div>
        </div>
      </section>
    </>
  );
}
