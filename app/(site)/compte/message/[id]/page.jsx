import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { conversations, sampleChat, getConversation } from '@/lib/data/messages';
import { euro } from '@/lib/format';

export function generateStaticParams() {
  return conversations.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const c = getConversation(id);
  return { title: c ? `${c.name} — Messages AURA` : 'Conversation — AURA' };
}

function Proposal({ p, name }) {
  return (
    <div className="card card-pad" style={{ maxWidth: 340, marginTop: 6 }}>
      <span className="eyebrow"><Icon name="calendar" size={13} color="var(--violet-2)" /> Proposition de séance</span>
      <dl className="dl mt-2">
        <dt>Quand</dt><dd>{p.when}</dd>
        <dt>Durée</dt><dd>{p.durationMinutes} min</dd>
        <dt>Format</dt><dd>{p.mode}</dd>
        <dt>Tarif</dt><dd>{euro(p.price)}</dd>
      </dl>
      <div className="row gap-2 mt-3">
        <Button href="/reserver" variant="primary" size="sm">Accepter</Button>
        <ModalButton modal="confirm" payload={{ title: 'Refuser la proposition', message: `Refuser le créneau proposé par ${name} ?`, confirmLabel: 'Refuser', danger: true, successToast: 'Proposition refusée' }} className="btn btn-ghost btn-sm">Refuser</ModalButton>
      </div>
    </div>
  );
}

export default async function ConversationPage({ params }) {
  const { id } = await params;
  const c = getConversation(id);
  if (!c) notFound();

  return (
    <div className="stack gap-4">
      <nav className="crumbs">
        <Link href="/compte/messages">Messages</Link>
        <Icon name="chevronRight" size={13} color="var(--muted)" />
        <span>{c.name}</span>
      </nav>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div className="row gap-3 between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <div className="row gap-3">
            <Avatar src={c.photo} name={c.name} tone={c.tone} size={44} online={c.online} rounded={c.kind === 'cercle'} />
            <div>
              <div className="h-4" style={{ fontWeight: 500 }}>{c.name}</div>
              <div className="tiny muted">{c.online ? 'En ligne' : 'Vu récemment'}{c.kind === 'praticien' ? ' · Praticien' : ' · Cercle'}</div>
            </div>
          </div>
          <ModalButton modal="report" payload={{ name: c.name }} className="btn btn-icon btn-ghost" title="Signaler"><Icon name="flag" size={16} /></ModalButton>
        </div>

        {/* Messages */}
        <div className="stack gap-3" style={{ padding: '20px 18px', background: 'var(--pearl)' }}>
          {sampleChat.map((m) => (
            <div key={m.id} className="stack gap-1" style={{ alignItems: m.fromMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                background: m.fromMe ? 'var(--ink)' : '#fff',
                color: m.fromMe ? '#fff' : 'var(--ink)',
                borderBottomRightRadius: m.fromMe ? 4 : 16,
                borderBottomLeftRadius: m.fromMe ? 16 : 4,
                border: m.fromMe ? 'none' : '1px solid var(--line)',
              }}>
                {m.text}
              </div>
              {m.proposal && !m.fromMe && <Proposal p={m.proposal} name={c.name} />}
              <span className="tiny muted">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="row gap-2" style={{ padding: '12px 14px', borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-icon btn-ghost" title="Joindre"><Icon name="plus" size={18} /></button>
          <input className="input flex-1" placeholder="Écrire un message…" />
          <ToastButton message="Message envoyé" className="btn btn-primary btn-icon" title="Envoyer"><Icon name="arrowRight" size={18} color="#fff" /></ToastButton>
        </div>
      </div>

      <div className="note">
        <Icon name="shield" size={15} color="var(--violet-2)" /> Réglez toujours vos séances via AURA. Ne communiquez jamais vos coordonnées bancaires par message.
      </div>
    </div>
  );
}
