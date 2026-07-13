import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { conversations } from '@/lib/data/messages';

export const metadata = { title: 'Messages — AURA' };

const FILTERS = ['Tous', 'Non lus', 'Praticiens', 'Cercles'];

export default function MessagesPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Messages</h1>
        <p className="lead" style={{ marginTop: 4 }}>Échangez avec vos praticiens, <span className="serif italic accent">en toute sérénité</span>.</p>
      </header>

      <div className="row gap-2 wrap">
        {FILTERS.map((f, i) => (
          <span key={f} className={`chip ${i === 0 ? 'active' : ''}`}>{f}</span>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {conversations.map((c, i) => (
          <Link key={c.id} href={`/compte/message/${c.id}`} className="row gap-3 card-hover" style={{ padding: '16px 18px', borderTop: i ? '1px solid var(--line)' : 'none', alignItems: 'center' }}>
            <Avatar src={c.photo} name={c.name} tone={c.tone} size={48} online={c.online} rounded={c.kind === 'cercle'} />
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div className="between">
                <span className="h-4" style={{ fontWeight: c.unread ? 600 : 500 }}>{c.name}</span>
                <span className="tiny muted">{c.when}</span>
              </div>
              <div className="row gap-2">
                <span className="small flex-1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: c.unread ? 'var(--ink)' : 'var(--muted)' }}>{c.preview}</span>
                {c.unread && <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--violet-2)', flexShrink: 0 }} />}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="panel">
        <div className="row gap-2 mb-2"><Icon name="shield" size={16} color="var(--violet-2)" /><span className="h-4" style={{ fontWeight: 500 }}>Avant la séance</span></div>
        <p className="small">Pour votre sécurité, gardez vos échanges et paiements sur AURA. Un praticien ne vous demandera jamais de régler en dehors de la plateforme ni de communiquer vos coordonnées bancaires. En cas de doute, <Link className="more" href="/aide">signalez-le nous</Link>.</p>
      </div>
    </div>
  );
}
