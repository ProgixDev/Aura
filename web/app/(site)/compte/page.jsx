import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { ModalButton } from '@/components/ui/ModalButton';
import { Lotus } from '@/components/ui/Lotus';
import { bookings } from '@/lib/data/admin';
import { getPractitioner } from '@/lib/data/practitioners';
import { dateFr, euro, tone } from '@/lib/format';

export const metadata = { title: 'Mon espace — AURA' };

const SHORTCUTS = [
  { href: '/recherche', icon: 'search', label: 'Trouver un praticien', tint: 'tint-violet', glyph: 'glyph-violet' },
  { href: '/compte/reservations', icon: 'calendar', label: 'Mes réservations', tint: 'tint-sky', glyph: 'glyph-sky' },
  { href: '/compte/messages', icon: 'message', label: 'Mes messages', tint: 'tint-sage', glyph: 'glyph-sage' },
  { href: '/compte/favoris', icon: 'heart', label: 'Mes favoris', tint: 'tint-gold', glyph: 'glyph-gold' },
];

const ACTIVITY = [
  { icon: 'check', tint: 'glyph-sage', text: 'Séance confirmée avec', strong: 'Camille Rossi', when: 'il y a 2h' },
  { icon: 'message', tint: 'glyph-violet', text: 'Nouveau message de', strong: 'Élodie Marceau', when: 'il y a 5h' },
  { icon: 'star', tint: 'glyph-gold', text: 'Avis publié sur', strong: 'Mathieu Vernet', when: 'hier' },
  { icon: 'heart', tint: 'glyph-sky', text: 'Profil ajouté aux favoris —', strong: 'Anaïs Lefèvre', when: 'il y a 3 jours' },
];

export default function CompteOverview() {
  const next = bookings.find((b) => b.status === 'confirmed') || bookings[0];
  const prat = getPractitioner(next.practitionerId);

  return (
    <div className="stack gap-6">
      <header className="reveal r-1">
        <span className="eyebrow"><Lotus size={14} color="var(--violet-2)" /> Mon espace</span>
        <h1 className="h-1" style={{ marginTop: 6 }}>Bonjour <span className="serif-accent italic">Sarah</span></h1>
        <p className="lead" style={{ marginTop: 4 }}>Heureux de vous revoir. Voici un aperçu de votre cheminement.</p>
      </header>

      {/* Prochaine séance */}
      <section className="reveal r-2">
        <div className="section-head"><h2 className="h-3">Prochaine séance</h2><Link className="more" href="/compte/reservations">Tout voir</Link></div>
        <div className="card card-pad">
          <div className="row gap-4 wrap" style={{ alignItems: 'flex-start' }}>
            <Avatar src={prat.photo} name={prat.name} tone={prat.tone} size={64} online={prat.online} />
            <div className="flex-1">
              <div className="row gap-2" style={{ marginBottom: 4 }}>
                <span className="h-4" style={{ fontWeight: 500 }}>{prat.name}</span>
                <Badge variant={tone(next.status)}>{next.status === 'confirmed' ? 'Confirmée' : 'En attente'}</Badge>
              </div>
              <div className="small" style={{ marginBottom: 10 }}>{next.discipline}</div>
              <div className="row gap-4 wrap small">
                <span className="row gap-1"><Icon name="calendar" size={14} color="var(--muted)" />{dateFr(next.date)} · {next.slot}</span>
                <span className="row gap-1"><Icon name={next.mode === 'visio' ? 'video' : 'pin'} size={14} color="var(--muted)" />{next.mode}</span>
                <span className="row gap-1"><Icon name="euro" size={14} color="var(--muted)" />{euro(next.price)}</span>
              </div>
            </div>
            <div className="stack gap-2" style={{ minWidth: 180 }}>
              <Button href={`/compte/reservation/${next.id}`} variant="primary" size="sm" block>Voir le détail</Button>
              <ModalButton modal="reschedule" payload={{ name: prat.name }} className="btn btn-soft btn-sm btn-block">Reprogrammer</ModalButton>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="reveal r-3">
        <div className="grid grid-3">
          <StatCard label="Séances" value="7" delta="+2 ce mois" deltaDir="up" icon="calendar" />
          <StatCard label="Favoris" value="5" icon="heart" />
          <StatCard label="Avis publiés" value="4" delta="+1" deltaDir="up" icon="star" />
        </div>
      </section>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Activité récente */}
        <section className="reveal r-4">
          <h2 className="h-3 mb-3">Activité récente</h2>
          <div className="card card-pad stack gap-1">
            {ACTIVITY.map((a, i) => (
              <div key={i}>
                <div className="row gap-3" style={{ padding: '8px 0' }}>
                  <span className={`tile-icon ${a.tint}`}><Icon name={a.icon} size={16} /></span>
                  <span className="flex-1 small">{a.text} <span className="serif italic accent">{a.strong}</span></span>
                  <span className="tiny muted">{a.when}</span>
                </div>
                {i < ACTIVITY.length - 1 && <div className="divider" />}
              </div>
            ))}
          </div>
        </section>

        {/* Raccourcis */}
        <section className="reveal r-5">
          <h2 className="h-3 mb-3">Raccourcis</h2>
          <div className="grid grid-2">
            {SHORTCUTS.map((s) => (
              <Link key={s.href} href={s.href} className="card card-pad card-hover stack gap-2">
                <span className={`tile-icon ${s.glyph}`}><Icon name={s.icon} size={18} /></span>
                <span className="small" style={{ fontWeight: 500, color: 'var(--ink)' }}>{s.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
