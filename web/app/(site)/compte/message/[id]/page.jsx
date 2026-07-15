'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';

// Same polling cadence as the mobile chat screen (mobile/app/chat/[id].tsx)
// — no WebSocket infra exists in this codebase (Plan 08 design spec, P8-1).
const POLL_INTERVAL_MS = 6000;

export default function ConversationPage({ params }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data: convRes, isLoading: convLoading } = useQuery({
    queryKey: ['client-conversation', id],
    queryFn: () => api.get(`/client/conversations/${id}`),
  });
  const { data: msgRes } = useQuery({
    queryKey: ['client-messages', id],
    queryFn: () => api.get(`/client/conversations/${id}/messages`),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const conv = convRes?.data;
  const messages = msgRes?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: (value) => api.post(`/client/conversations/${id}/messages`, { text: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-messages', id] }),
  });

  const send = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    sendMutation.mutate(trimmed);
  };

  if (!convLoading && !conv) {
    return (
      <div className="stack gap-4">
        <p className="lead">Conversation introuvable.</p>
        <Link href="/compte/messages" className="btn btn-soft">Retour aux messages</Link>
      </div>
    );
  }
  if (!conv) return null;

  const name = conv.praticien ? `${conv.praticien.firstname} ${conv.praticien.lastname}` : 'Praticien';

  return (
    <div className="stack gap-4">
      <nav className="crumbs">
        <Link href="/compte/messages">Messages</Link>
        <Icon name="chevronRight" size={13} color="var(--muted)" />
        <span>{name}</span>
      </nav>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div className="row gap-3 between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <div className="row gap-3">
            <Avatar name={name} tone="violet" size={44} />
            <div>
              <div className="h-4" style={{ fontWeight: 500 }}>{name}</div>
              <div className="tiny muted">Praticien</div>
            </div>
          </div>
          <ModalButton modal="report" payload={{ name }} className="btn btn-icon btn-ghost" title="Signaler">
            <Icon name="flag" size={16} />
          </ModalButton>
        </div>

        {/* Messages */}
        <div className="stack gap-3" style={{ padding: '20px 18px', background: 'var(--pearl)' }}>
          {messages.length === 0 ? (
            <p className="small muted center">Écrivez le premier message de cette conversation.</p>
          ) : messages.map((m) => (
            <div key={m.id} className="stack gap-1" style={{ alignItems: m.sender_role === 'client' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                background: m.sender_role === 'client' ? 'var(--ink)' : '#fff',
                color: m.sender_role === 'client' ? '#fff' : 'var(--ink)',
                borderBottomRightRadius: m.sender_role === 'client' ? 4 : 16,
                borderBottomLeftRadius: m.sender_role === 'client' ? 16 : 4,
                border: m.sender_role === 'client' ? 'none' : '1px solid var(--line)',
              }}>
                {m.text}
              </div>
              <span className="tiny muted">
                {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>

        {/* Composer */}
        <form onSubmit={send} className="row gap-2" style={{ padding: '12px 14px', borderTop: '1px solid var(--line)' }}>
          <input className="input flex-1" placeholder="Écrire un message…" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-icon" title="Envoyer" disabled={sendMutation.isPending}>
            <Icon name="arrowRight" size={18} color="#fff" />
          </button>
        </form>
      </div>

      <div className="note">
        <Icon name="shield" size={15} color="var(--violet-2)" /> Réglez toujours vos séances via AURA. Ne communiquez jamais vos coordonnées bancaires par message.
      </div>
    </div>
  );
}
