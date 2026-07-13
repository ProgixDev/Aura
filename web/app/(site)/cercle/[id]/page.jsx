import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cercles, getCercle } from '@/lib/data/admin';
import { practitioners } from '@/lib/data/practitioners';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';
import { ModalButton } from '@/components/ui/ModalButton';
import { num } from '@/lib/format';

const ORB = {
  sky: ['#A8C8E8', '#5B7FB8'],
  violet: ['#C4B0E8', '#7B5FCF'],
  sage: ['#B8D4C2', '#6FA383'],
  gold: ['#E4C896', '#C49A4A'],
};

export function generateStaticParams() {
  return cercles.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const c = getCercle(id);
  if (!c) return { title: 'Cercle — Aura' };
  return { title: `${c.name} — Cercle Aura`, description: `Animé par ${c.lead} · ${c.members} membres` };
}

export default async function CerclePage({ params }) {
  const { id } = await params;
  const c = getCercle(id);
  if (!c) notFound();

  const [orb1, orb2] = ORB[c.tone] || ORB.violet;
  const lead = practitioners.find((p) => p.name === c.lead);
  const memberPreview = practitioners.slice(0, 6);

  const FEED = [
    {
      author: c.lead, tone: c.tone, when: 'il y a 2h', pinned: true,
      text: `Bienvenue dans « ${c.name} » 🌿 Présentez-vous en quelques mots : votre pratique, votre intention, ce que vous venez chercher ici. On se réjouit de vous lire.`,
      likes: 42, comments: 18,
    },
    {
      author: 'Mathieu Vernet', tone: 'sage', when: 'hier',
      text: 'Partage du soir : un petit rituel de fin de journée au tambour, 7 minutes seulement, qui m’aide à déposer la charge mentale. Je peux détailler si ça intéresse.',
      likes: 27, comments: 9,
    },
    {
      author: 'Camille Rossi', tone: 'sky', when: 'il y a 2 jours',
      text: 'Question ouverte : comment gérez-vous l’après-séance, ce moment où l’on se sent traversé ? J’aimerais croiser vos pratiques d’ancrage.',
      likes: 35, comments: 23,
    },
    {
      author: 'Sylvain Boukhari', tone: 'gold', when: 'il y a 3 jours',
      text: 'Prochaine rencontre en présentiel confirmée — détails dans les événements épinglés. Hâte de vous retrouver hors écran ✦',
      likes: 19, comments: 6,
    },
  ];

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': orb1, '--orb-2': orb2, padding: '96px 0 100px' }}
      >
        <div className="container reveal">
          <div className="row gap-2 small" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 22 }}>
            <Link href="/cercles" style={{ color: 'rgba(255,255,255,0.7)' }}>Cercles</Link>
            <Icon name="chevronRight" size={13} color="rgba(255,255,255,0.5)" />
            <span>{c.name}</span>
          </div>
          <div className="row between wrap gap-4" style={{ alignItems: 'flex-end' }}>
            <div>
              {c.status === 'archived' && <Badge variant="neutral">Archivé</Badge>}
              <h1 className="h-display" style={{ color: '#fff', margin: '14px 0 16px', maxWidth: 680 }}>{c.name}</h1>
              <div className="row gap-6 wrap" style={{ color: 'rgba(255,255,255,0.82)' }}>
                <span className="row gap-2"><Icon name="users" size={16} color="rgba(255,255,255,0.7)" />{num(c.members)} membres</span>
                <span className="row gap-2"><Icon name="message" size={16} color="rgba(255,255,255,0.7)" />{num(c.posts)} échanges</span>
                <span className="row gap-2"><Icon name="user" size={16} color="rgba(255,255,255,0.7)" />Animé par {c.lead}</span>
              </div>
            </div>
            <ToastButton
              message={`Vous avez rejoint « ${c.name} » 🌿`}
              tone="success"
              className="btn btn-aurora btn-lg"
            >
              Rejoindre le cercle
            </ToastButton>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="section">
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 40, alignItems: 'flex-start' }}>
            {/* FEED */}
            <div className="stack" style={{ gap: 20 }}>
              <div className="row between">
                <span className="eyebrow">Le fil du cercle</span>
                <ModalButton
                  modal="form"
                  payload={{ title: 'Publier dans le cercle', fields: [{ name: 'post', label: 'Votre message', type: 'textarea', required: true }], submitLabel: 'Publier', successToast: 'Message publié dans le cercle.' }}
                  className="btn btn-soft btn-sm"
                >
                  <Icon name="plus" size={14} color="var(--ink)" /> Publier
                </ModalButton>
              </div>
              {FEED.map((post, i) => (
                <article key={i} className="card card-pad">
                  <div className="row gap-3" style={{ alignItems: 'center', marginBottom: 12 }}>
                    <Avatar name={post.author} tone={post.tone} size={44} />
                    <div className="flex-1">
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{post.author}</span>
                        {post.pinned && <Badge variant="featured">Épinglé</Badge>}
                      </div>
                      <div className="tiny muted">{post.when}</div>
                    </div>
                    <ModalButton modal="report" className="btn btn-icon btn-ghost btn-sm" as="button" title="Signaler">
                      <Icon name="flag" size={14} color="var(--muted)" />
                    </ModalButton>
                  </div>
                  <p className="body">{post.text}</p>
                  <div className="row gap-4 small muted" style={{ marginTop: 14 }}>
                    <ToastButton
                      toggle
                      message="J’aime retiré"
                      activeMessage="Vous aimez ce message ❤"
                      className="btn btn-link btn-sm"
                      activeChildren={<><Icon name="heart" size={14} color="var(--violet-2)" /> {post.likes + 1}</>}
                    >
                      <Icon name="heart" size={14} color="var(--muted)" /> {post.likes}
                    </ToastButton>
                    <span className="row gap-1"><Icon name="message" size={14} color="var(--muted)" />{post.comments} réponses</span>
                  </div>
                </article>
              ))}
            </div>

            {/* SIDEBAR */}
            <aside className="stack" style={{ gap: 20, position: 'sticky', top: 96 }}>
              {/* About */}
              <div className="card card-pad">
                <h3 className="h-4" style={{ marginBottom: 8, fontWeight: 500 }}>À propos</h3>
                <p className="small">
                  Un espace de partage continu autour de la pratique. Échanges, ressources, rencontres : ici, on chemine ensemble, dans le respect et la bienveillance.
                </p>
                <div className="divider" />
                <dl className="dl">
                  <dt>Membres</dt><dd>{num(c.members)}</dd>
                  <dt>Échanges</dt><dd>{num(c.posts)}</dd>
                  <dt>Animation</dt><dd>{c.lead}</dd>
                </dl>
              </div>

              {/* Animateur */}
              {lead && (
                <div className="card card-pad">
                  <span className="eyebrow">L’animateur·rice</span>
                  <Link href={`/praticien/${lead.id}`} className="row gap-3" style={{ alignItems: 'center', marginTop: 12 }}>
                    <Avatar src={lead.photo} name={lead.name} tone={lead.tone} size={48} online={lead.online} />
                    <div className="flex-1">
                      <div className="row gap-1" style={{ fontWeight: 500 }}>
                        {lead.name}
                        {lead.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
                      </div>
                      <div className="small">{lead.specialties.join(' · ')}</div>
                    </div>
                    <Icon name="chevronRight" size={16} color="var(--muted)" />
                  </Link>
                </div>
              )}

              {/* Members preview */}
              <div className="card card-pad">
                <div className="row between" style={{ marginBottom: 14 }}>
                  <h3 className="h-4" style={{ fontWeight: 500 }}>Membres</h3>
                  <span className="tiny muted">{num(c.members)} au total</span>
                </div>
                <div className="row" style={{ alignItems: 'center' }}>
                  <div className="row" style={{ marginLeft: 6 }}>
                    {memberPreview.map((m, i) => (
                      <span key={m.id} style={{ marginLeft: -10, position: 'relative', zIndex: memberPreview.length - i }}>
                        <Avatar src={m.photo} name={m.name} tone={m.tone} size={36} rounded />
                      </span>
                    ))}
                  </div>
                  <span className="small muted" style={{ marginLeft: 12 }}>+{num(c.members - memberPreview.length)} autres</span>
                </div>
                <ToastButton
                  message={`Vous avez rejoint « ${c.name} » 🌿`}
                  tone="success"
                  className="btn btn-primary btn-block"
                  style={{ marginTop: 18 }}
                >
                  Rejoindre le cercle
                </ToastButton>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
