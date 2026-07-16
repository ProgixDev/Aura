'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { ModalButton } from '@/components/ui/ModalButton';
import { Lotus } from '@/components/ui/Lotus';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { dateFr, euro, relativeFr } from '@/lib/format';

const SHORTCUTS = [
  { href: '/praticiens', icon: 'search', label: 'Trouver un praticien', tint: 'tint-violet', glyph: 'glyph-violet' },
  { href: '/compte/reservations', icon: 'calendar', label: 'Mes réservations', tint: 'tint-sky', glyph: 'glyph-sky' },
  { href: '/compte/messages', icon: 'message', label: 'Mes messages', tint: 'tint-sage', glyph: 'glyph-sage' },
  { href: '/compte/favoris', icon: 'heart', label: 'Mes favoris', tint: 'tint-gold', glyph: 'glyph-gold' },
];

// rendez_vous.statut is French: en_attente|confirme|annule|termine.
const STATUT_LABEL = { en_attente: 'En attente', confirme: 'Confirmée', termine: 'Terminée', annule: 'Annulée' };
const STATUT_TONE = { en_attente: 'warning', confirme: 'success', termine: 'neutral', annule: 'danger' };

const ACTIVITY_META = {
  rendez_vous: { icon: 'calendar', tint: 'glyph-sage' },
  avis: { icon: 'star', tint: 'glyph-gold' },
  remboursement: { icon: 'card', tint: 'glyph-sky' },
};

export default function CompteOverviewBody() {
  const client = useAuthStore((s) => s.client);

  const { data: rdvRes } = useQuery({
    queryKey: ['rendez-vous-client'],
    queryFn: () => api.get('/rendez-vous/client?per_page=100'),
  });
  const rdvList = rdvRes?.data ?? [];

  const { data: favRes } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/client/favorites'),
  });
  const favCount = (favRes?.data ?? []).length;

  const { data: avisRes } = useQuery({
    queryKey: ['mes-avis'],
    queryFn: () => api.get('/client/avis'),
  });
  const avisPublies = (avisRes?.data ?? []).filter((a) => a.statut === 'publié').length;

  const { data: activityRes } = useQuery({
    queryKey: ['client-activity'],
    queryFn: () => api.get('/client/activity'),
  });
  const activity = activityRes?.data ?? [];

  // Soonest upcoming (confirmée/en attente) booking by date, not just "first in the list"
  // (the list itself is newest-date-first). Falls back to the most recent booking overall
  // when nothing is upcoming.
  const upcoming = rdvList
    .filter((r) => r.statut === 'confirme' || r.statut === 'en_attente')
    .sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));
  const next = upcoming[0] || rdvList[0];
  const prat = next ? mapPraticien(next.praticien) : null;

  return (
    <div className="stack gap-6">
      <header className="reveal r-1">
        <span className="eyebrow"><Lotus size={14} color="var(--violet-2)" /> Mon espace</span>
        <h1 className="h-1" style={{ marginTop: 6 }}>Bonjour <span className="serif-accent italic">{client?.firstname || ''}</span></h1>
        <p className="lead" style={{ marginTop: 4 }}>Heureux de vous revoir. Voici un aperçu de votre cheminement.</p>
      </header>

      {/* Prochaine séance */}
      <section className="reveal r-2">
        <div className="section-head"><h2 className="h-3">Prochaine séance</h2><Link className="more" href="/compte/reservations">Tout voir</Link></div>
        {next && prat ? (
          <div className="card card-pad">
            <div className="row gap-4 wrap" style={{ alignItems: 'flex-start' }}>
              <Avatar src={prat.photo} name={prat.name} tone={prat.tone} size={64} online={prat.online} />
              <div className="flex-1">
                <div className="row gap-2" style={{ marginBottom: 4 }}>
                  <span className="h-4" style={{ fontWeight: 500 }}>{prat.name}</span>
                  <Badge variant={STATUT_TONE[next.statut] || 'neutral'}>{STATUT_LABEL[next.statut] || next.statut}</Badge>
                </div>
                <div className="small" style={{ marginBottom: 10 }}>{prat.specialties.join(' · ')}</div>
                <div className="row gap-4 wrap small">
                  <span className="row gap-1"><Icon name="calendar" size={14} color="var(--muted)" />{dateFr(next.date_heure)}</span>
                  <span className="row gap-1"><Icon name={next.mode === 'visio' ? 'video' : 'pin'} size={14} color="var(--muted)" />{next.mode}</span>
                  <span className="row gap-1"><Icon name="euro" size={14} color="var(--muted)" />{euro(next.tarif)}</span>
                </div>
              </div>
              <div className="stack gap-2" style={{ minWidth: 180 }}>
                <Button href={`/compte/reservation/${next.id}`} variant="primary" size="sm" block>Voir le détail</Button>
                <ModalButton modal="reschedule" payload={{ name: prat.name }} className="btn btn-soft btn-sm btn-block">Reprogrammer</ModalButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty card card-pad center">
            <p className="body">Aucune séance pour l’instant. <Link className="more" href="/praticiens">Trouver un praticien</Link></p>
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="reveal r-3">
        <div className="grid grid-3">
          <StatCard label="Séances" value={rdvList.length} icon="calendar" />
          <StatCard label="Favoris" value={favCount} icon="heart" />
          <StatCard label="Avis publiés" value={avisPublies} icon="star" />
        </div>
      </section>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Activité récente */}
        <section className="reveal r-4">
          <h2 className="h-3 mb-3">Activité récente</h2>
          <div className="card card-pad stack gap-1">
            {activity.length === 0 ? (
              <p className="small muted" style={{ padding: '8px 0' }}>Aucune activité récente.</p>
            ) : activity.map((a, i) => {
              const meta = ACTIVITY_META[a.type] || { icon: 'check', tint: 'glyph-violet' };
              return (
                <div key={i}>
                  <div className="row gap-3" style={{ padding: '8px 0' }}>
                    <span className={`tile-icon ${meta.tint}`}><Icon name={meta.icon} size={16} /></span>
                    <span className="flex-1 small">{a.label}</span>
                    <span className="tiny muted">{relativeFr(a.at)}</span>
                  </div>
                  {i < activity.length - 1 && <div className="divider" />}
                </div>
              );
            })}
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
