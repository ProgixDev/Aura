import Link from 'next/link';
import { blogPosts, getBlogPost } from '@/lib/data/content';
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

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export default async function BlogArticlePage({ params }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return (
      <section className="section">
        <div className="container-narrow center">
          <h1 className="h-1">Article introuvable</h1>
          <p className="lead muted" style={{ marginBottom: 20 }}>Cet article n’existe pas ou a été déplacé.</p>
          <Link href="/blog" className="btn btn-primary">Retour au Journal</Link>
        </div>
      </section>
    );
  }

  const orb = ORBS[post.tone] || ORBS.violet;
  const paragraphs = post.body.split('\n\n');
  const pullIndex = paragraphs.length > 2 ? Math.floor(paragraphs.length / 2) : -1;
  const pullText = pullIndex > 0 ? paragraphs[pullIndex] : null;
  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const shareUrl = `https://aura.fr/blog/${post.slug}`;

  return (
    <>
      {/* HEADER */}
      <section className="section-sm">
        <div className="container-narrow">
          <div className="crumbs" style={{ marginBottom: 18 }}>
            <Link href="/blog">Journal</Link>
            <span>/</span>
            <span>{post.category}</span>
          </div>
          <div className="reveal">
            <span className="eyebrow">{post.category}</span>
            <h1 className="h-display" style={{ margin: '14px 0 22px' }}>{post.title}</h1>
            <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name={post.author} tone={post.tone} size={44} rounded />
              <div>
                <div className="small" style={{ fontWeight: 600 }}>{post.author}</div>
                <div className="tiny muted row gap-2">
                  <span>{dateFr(post.date)}</span><span>·</span><span>{post.readTime} de lecture</span>
                </div>
              </div>
              <div className="row gap-2" style={{ marginLeft: 'auto' }}>
                <ModalButton modal="share" payload={{ label: post.title, url: shareUrl }} className="btn btn-soft btn-sm">
                  <Icon name="share" size={15} color="var(--violet-2)" /> Partager
                </ModalButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HERO BAND */}
      <section className="section-sm">
        <div className="container-narrow">
          <div className="aurora-dark grain reveal r-1" style={{ '--orb-x': '70%', '--orb-y': '25%', ...orb, borderRadius: 20, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 40 }}>
            <Lotus size={24} color="rgba(255,255,255,0.9)" />
            <p className="serif italic" style={{ color: '#fff', fontSize: 24, marginTop: 16, maxWidth: 520 }}>
              {post.excerpt}
            </p>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="section-sm">
        <div className="container-narrow">
          {paragraphs.map((para, i) => (
            <div key={i}>
              {i === pullIndex && pullText ? (
                <blockquote className="pull serif" style={{ margin: '34px 0' }}>
                  {pullText}
                </blockquote>
              ) : (
                <p className={i === 0 ? 'lead' : 'body'} style={{ marginBottom: 22 }}>{para}</p>
              )}
            </div>
          ))}

          {/* SHARE ROW */}
          <div className="divider" style={{ margin: '36px 0 24px' }} />
          <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span className="small muted">Cet article vous a plu ? Partagez-le.</span>
            <div className="row gap-2">
              <ModalButton modal="share" payload={{ label: post.title, url: shareUrl }} className="btn btn-soft btn-sm">
                <Icon name="share" size={15} color="var(--violet-2)" /> Partager
              </ModalButton>
              <Link href="/blog" className="btn btn-ghost btn-sm">
                <Icon name="arrowLeft" size={15} color="var(--ink)" /> Tous les articles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AUTHOR CARD */}
      <section className="section-sm">
        <div className="container-narrow">
          <div className="card card-pad reveal">
            <div className="row gap-4" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name={post.author} tone={post.tone} size={64} rounded />
              <div className="flex-1">
                <span className="eyebrow">Écrit par</span>
                <h3 className="h-3" style={{ margin: '4px 0 4px' }}>{post.author}</h3>
                <p className="small muted">
                  Une voix du Journal d’Aura, dédiée à un bien-être énergétique éthique, sourcé et accessible.
                </p>
              </div>
              <ModalButton modal="contact" payload={{ name: post.author }} className="btn btn-soft btn-sm">Contacter</ModalButton>
            </div>
          </div>
        </div>
      </section>

      {/* RELATED */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <h2 className="h-2">À lire aussi</h2>
            <Link href="/blog" className="more">Tout le Journal</Link>
          </div>
          <div className="grid grid-3">
            {related.map((p, i) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className={`card card-hover reveal r-${i + 1}`} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="aurora-dark grain" style={{ '--orb-x': '65%', '--orb-y': '25%', ...(ORBS[p.tone] || ORBS.violet), height: 130, display: 'flex', alignItems: 'flex-end', padding: 18 }}>
                  <Badge variant="neutral" dot>{p.category}</Badge>
                </div>
                <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div className="tiny muted row gap-2">
                    <span>{dateFr(p.date)}</span><span>·</span><span>{p.readTime}</span>
                  </div>
                  <h3 className="h-4" style={{ margin: '8px 0 6px' }}>{p.title}</h3>
                  <p className="small muted" style={{ flex: 1 }}>{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
