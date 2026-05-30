import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { cercles, getCercle } from '@/lib/data/admin';
import { practitioners } from '@/lib/data/practitioners';
import { clients } from '@/lib/data/admin';
import { num, tone } from '@/lib/format';

export function generateStaticParams() {
  return cercles.map((c) => ({ id: c.id }));
}

const FEED = [
  { author: 'Camille Rossi', when: 'il y a 2h', text: "Rappel : notre méditation collective de pleine lune a lieu jeudi à 20h. Inscrivez-vous via le fil épinglé.", flagged: false },
  { author: 'Sylvain Boukhari', when: 'hier', text: "Quelqu'un a-t-il des ressources sur l'ancrage en hiver ? Je prépare un atelier.", flagged: false },
  { author: 'Anonyme', when: 'il y a 2 jours', text: "Message signalé — promotion d'un service hors plateforme.", flagged: true },
];

export default async function CercleDetailPage({ params }) {
  const { id } = await params;
  const c = getCercle(id);

  if (!c) {
    return (
      <>
        <PageHead title="Cercle introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles', href: '/admin/cercles' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun cercle ne correspond à cet identifiant.</div>
      </>
    );
  }

  const lead = practitioners.find((p) => p.name === c.lead);
  const members = [...practitioners.slice(0, 4), ...clients.slice(0, 4)].slice(0, 6);
  const flaggedCount = FEED.filter((f) => f.flagged).length;

  return (
    <>
      <PageHead
        title={c.name}
        subtitle={`Animé par ${c.lead} · ${num(c.members)} membres`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Cercles', href: '/admin/cercles' }, { label: c.name }]}
        actions={<>
          <ModalButton modal="sendNotification" successToast="Annonce envoyée" className="btn btn-soft btn-sm"><Icon name="bell" size={15} /> Annonce</ModalButton>
          <ModalButton modal="confirm" payload={{ title: 'Archiver le cercle', message: `Archiver « ${c.name} » ? Les membres ne pourront plus publier.`, confirmLabel: 'Archiver', successToast: 'Cercle archivé' }} className="btn btn-soft btn-sm"><Icon name="layers" size={15} /> Archiver</ModalButton>
          <ModalButton modal="deleteItem" payload={{ name: c.name }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={15} /> Supprimer</ModalButton>
        </>}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <span className={`tile-icon glyph-${c.tone}`} style={{ width: 64, height: 64 }}><Icon name="users" size={26} /></span>
          <div className="flex-1">
            <div className="row gap-2 wrap" style={{ marginBottom: 4 }}>
              <h2 className="h-3">{c.name}</h2>
              <Badge variant={tone(c.status)} dot>{c.status}</Badge>
            </div>
            <p className="small" style={{ maxWidth: 600 }}>Espace communautaire animé par {c.lead}. Les membres y partagent pratiques, ressources et événements autour du bien-être.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <StatCard label="Membres" value={num(c.members)} icon="users" />
        <StatCard label="Publications" value={num(c.posts)} icon="message" />
        <StatCard label="Signalements" value={flaggedCount} icon="flag" />
        <StatCard label="Animateur" value={c.lead.split(' ')[0]} icon="star" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '18px 20px' }}>
            <h3 className="h-4">Fil de modération</h3>
            {flaggedCount > 0 && <Badge variant="danger" dot>{flaggedCount} à traiter</Badge>}
          </div>
          <div className="stack gap-4" style={{ padding: '0 20px 20px' }}>
            {FEED.map((f, i) => (
              <div key={i} className={`card-line card-pad ${f.flagged ? 'tint-violet' : ''}`}>
                <div className="between" style={{ marginBottom: 6 }}>
                  <div className="row gap-2"><strong>{f.author}</strong>{f.flagged && <Badge variant="danger">Signalé</Badge>}</div>
                  <span className="tiny">{f.when}</span>
                </div>
                <p className="small">{f.text}</p>
                <div className="row gap-2" style={{ marginTop: 10 }}>
                  <ModalButton modal="moderateReview" className="btn btn-soft btn-sm"><Icon name="shield" size={14} /> Modérer</ModalButton>
                  <ModalButton modal="deleteItem" payload={{ name: `Publication de ${f.author}` }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={14} /> Retirer</ModalButton>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 className="h-4">Animateur</h3>
              <Badge variant="featured">Lead</Badge>
            </div>
            <div className="row gap-3">
              <Avatar src={lead?.photo} name={c.lead} tone={lead?.tone || c.tone} size={44} />
              <div><div style={{ fontWeight: 500 }}>{c.lead}</div><div className="tiny">{lead ? lead.specialties.join(' · ') : 'Praticien Aura'}</div></div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 14 }}>
              <h3 className="h-4">Membres</h3>
              <ModalButton modal="invite" successToast="Invitation envoyée" className="btn btn-soft btn-sm btn-icon" as="button"><Icon name="plus" size={15} /></ModalButton>
            </div>
            <div className="stack gap-3">
              {members.map((m) => (
                <div key={m.id} className="row gap-3 between">
                  <div className="row gap-3">
                    <Avatar src={m.photo} name={m.name} tone={m.tone} size={36} />
                    <div><div style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</div><div className="tiny">{m.city}</div></div>
                  </div>
                  <ModalButton modal="confirm" payload={{ title: 'Retirer le membre', message: `Retirer ${m.name} de « ${c.name} » ?`, confirmLabel: 'Retirer', danger: true, successToast: 'Membre retiré' }} className="btn btn-link btn-sm"><Icon name="x" size={14} /></ModalButton>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Réglages</h3>
            <dl className="dl">
              <dt>Identifiant</dt><dd>{c.id}</dd>
              <dt>Statut</dt><dd><Badge variant={tone(c.status)}>{c.status}</Badge></dd>
              <dt>Visibilité</dt><dd>Privée sur invitation</dd>
            </dl>
            <div className="divider" />
            <ModalButton modal="changeStatus" payload={{ name: c.name }} successToast="Statut mis à jour" className="btn btn-soft btn-sm btn-block"><Icon name="settings" size={15} /> Modifier le statut</ModalButton>
          </div>
        </div>
      </div>
    </>
  );
}
