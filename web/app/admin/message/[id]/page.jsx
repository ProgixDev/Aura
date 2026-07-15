'use client';
import { use } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

export default function AdminConversationPage({ params }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-conversation', id],
    queryFn: () => api.get(`/admin/conversations/${id}`),
  });
  const conv = res?.data;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-conversation', id] });

  const flagMutation = useMutation({
    mutationFn: (messageId) => api.post(`/admin/messages/${messageId}/flag`),
    onSuccess: invalidate,
  });
  const unflagMutation = useMutation({
    mutationFn: (messageId) => api.post(`/admin/messages/${messageId}/unflag`),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="small muted">Chargement…</p>;
  if (!conv) return <p className="small muted">Conversation introuvable.</p>;

  const clientName = conv.client ? `${conv.client.firstname} ${conv.client.lastname}` : 'Client';
  const praticienName = conv.praticien ? `${conv.praticien.firstname} ${conv.praticien.lastname}` : 'Praticien';
  const messages = conv.messages ?? [];
  const flaggedCount = messages.filter((m) => m.flagged).length;

  return (
    <>
      <PageHead
        title={`${clientName} ↔ ${praticienName}`}
        subtitle="Consultation en lecture seule · accès réservé à la modération"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Messages', href: '/admin/messages' }, { label: `${clientName} ↔ ${praticienName}` }]}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Read-only chat */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="row gap-2">
              <Avatar name={clientName} size={36} tone="sky" />
              <Icon name="arrowRight" size={14} color="var(--muted)" />
              <Avatar name={praticienName} size={36} tone="violet" />
            </div>
            <Badge variant="neutral"><Icon name="shield" size={13} /> Lecture seule</Badge>
          </div>

          <div className="stack gap-4" style={{ padding: 20, background: 'var(--pearl, #FBF9F6)' }}>
            {messages.length === 0 ? (
              <p className="small muted">Aucun message échangé pour l'instant.</p>
            ) : messages.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_role === 'praticien' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '76%' }}>
                  <div
                    className="card-pad"
                    style={{
                      borderRadius: 18,
                      padding: '11px 15px',
                      background: m.sender_role === 'praticien' ? 'var(--violet-1, #ECE3FA)' : '#fff',
                      border: m.flagged ? '1px solid var(--danger, #D9534F)' : '1px solid var(--line)',
                    }}
                  >
                    <p className="body" style={{ margin: 0, fontSize: 14 }}>{m.text}</p>
                  </div>
                  <div className="row gap-2" style={{ marginTop: 4, justifyContent: m.sender_role === 'praticien' ? 'flex-end' : 'flex-start' }}>
                    <span className="tiny muted">{dateFr(m.created_at)}</span>
                    {m.flagged ? (
                      <button type="button" className="tiny" style={{ color: 'var(--danger, #D9534F)' }} onClick={() => unflagMutation.mutate(m.id)}>
                        Retirer le signalement
                      </button>
                    ) : (
                      <button type="button" className="tiny more" onClick={() => flagMutation.mutate(m.id)}>
                        Signaler ce message
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
            <Icon name="shield" size={15} color="var(--muted)" />
            <span className="tiny">La modération ne peut pas écrire dans cette conversation.</span>
          </div>
        </div>

        {/* Sidebar — participants + context */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Participants</h3>
            <div className="stack gap-3">
              <div className="row gap-3">
                <Avatar name={clientName} size={40} tone="sky" />
                <div className="flex-1">
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{clientName}</div>
                  <div className="tiny">{conv.client?.city ?? '—'}</div>
                </div>
                <Badge variant="neutral">Client</Badge>
              </div>
              <div className="divider" />
              <div className="row gap-3">
                <Avatar name={praticienName} size={40} tone="violet" />
                <div className="flex-1">
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{praticienName}</div>
                  <div className="tiny">{conv.praticien?.specialite} · {conv.praticien?.ville}</div>
                </div>
                {conv.praticien?.statut_verification === 'valide' && <Badge variant="verified" dot>Vérifié</Badge>}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 6 }}>Contexte</h3>
            <dl className="dl">
              <dt>Messages</dt><dd>{messages.length} échangés</dd>
              <dt>Signalés</dt><dd>{flaggedCount > 0 ? <Badge variant="danger" dot>{flaggedCount}</Badge> : <Badge variant="success">0</Badge>}</dd>
              <dt>Démarrée</dt><dd>{dateFr(conv.created_at)}</dd>
              <dt>Dernière activité</dt><dd>{dateFr(conv.updated_at)}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
