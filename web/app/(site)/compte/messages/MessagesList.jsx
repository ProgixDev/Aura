'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'unread', label: 'Non lus' },
];

export default function MessagesList() {
  const [filter, setFilter] = useState('all');
  const { data: res, isLoading } = useQuery({
    queryKey: ['client-conversations'],
    queryFn: () => api.get('/client/conversations'),
  });
  const conversations = res?.data ?? [];
  const filtered = filter === 'unread' ? conversations.filter((c) => c.unread_count > 0) : conversations;

  return (
    <>
      <div className="row gap-2 wrap">
        {FILTERS.map((f) => (
          <span
            key={f.key}
            className={`chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            style={{ cursor: 'pointer' }}
          >
            {f.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="empty">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <Icon name="message" size={28} color="var(--muted)" />
          <p className="mt-2">Aucune conversation pour l'instant. Contactez un praticien depuis son profil pour démarrer.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.map((c, i) => {
            const name = c.praticien ? `${c.praticien.firstname} ${c.praticien.lastname}` : 'Praticien';
            const unread = (c.unread_count ?? 0) > 0;
            return (
              <Link
                key={c.id}
                href={`/compte/message/${c.id}`}
                className="row gap-3 card-hover"
                style={{ padding: '16px 18px', borderTop: i ? '1px solid var(--line)' : 'none', alignItems: 'center' }}
              >
                <Avatar name={name} tone="violet" size={48} />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="between">
                    <span className="h-4" style={{ fontWeight: unread ? 600 : 500 }}>{name}</span>
                    <span className="tiny muted">{dateFr(c.last_message?.created_at ?? c.updated_at)}</span>
                  </div>
                  <div className="row gap-2">
                    <span
                      className="small flex-1"
                      style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: unread ? 'var(--ink)' : 'var(--muted)',
                      }}
                    >
                      {c.last_message?.text ?? 'Démarrez la conversation…'}
                    </span>
                    {unread && <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--violet-2)', flexShrink: 0 }} />}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="panel">
        <div className="row gap-2 mb-2">
          <Icon name="shield" size={16} color="var(--violet-2)" />
          <span className="h-4" style={{ fontWeight: 500 }}>Avant la séance</span>
        </div>
        <p className="small">
          Pour votre sécurité, gardez vos échanges et paiements sur AURA. Un praticien ne vous demandera jamais de régler en dehors de la plateforme ni de communiquer vos coordonnées bancaires. En cas de doute, <Link className="more" href="/aide">signalez-le nous</Link>.
        </p>
      </div>
    </>
  );
}
