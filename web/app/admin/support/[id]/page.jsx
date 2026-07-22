'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api, errorMessage } from '@/lib/api';
import { useUI } from '@/lib/store';
import { dateFr } from '@/lib/format';

// support_tickets.statut is French: ouvert|en_cours|resolu|ferme — same vocab as
// admin/support/page.jsx.
const STATUT_LABEL = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu', ferme: 'Clôturé' };
const STATUT_TONE = { ouvert: 'info', en_cours: 'warning', resolu: 'success', ferme: 'neutral' };
const PRIORITY_TONE = { haute: 'danger', normale: 'warning', basse: 'neutral' };

export default function TicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const [replyText, setReplyText] = useState('');
  const [nextStatut, setNextStatut] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'support', id],
    queryFn: () => api.get(`/admin/support/${id}`),
  });
  const t = data?.data;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'support', id] });

  const replyMutation = useMutation({
    mutationFn: () => api.post(`/admin/support/${id}/reply`, {
      text: replyText,
      ...(nextStatut ? { statut: nextStatut } : {}),
    }),
    onSuccess: () => { invalidate(); setReplyText(''); setNextStatut(''); toast('Réponse envoyée', 'success'); },
    onError: (err) => toast(errorMessage(err), 'danger'),
  });
  const resolveMutation = useMutation({
    mutationFn: () => api.post(`/admin/support/${id}/resolve`),
    onSuccess: () => { invalidate(); toast('Ticket marqué résolu', 'success'); },
    onError: (err) => toast(errorMessage(err), 'danger'),
  });

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !t) {
    return (
      <>
        <PageHead title="Ticket introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Support', href: '/admin/support' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun ticket ne correspond à cet identifiant.<div className="mt-3"><Link href="/admin/support" className="btn btn-soft btn-sm">Retour au support</Link></div></div>
      </>
    );
  }

  // The ticket's own `message` is the opening client message; `messages` holds every
  // reply appended since (support or client) — concatenate into one chronological thread.
  const thread = [
    { who: t.requester_name, role: 'client', when: dateFr(t.created_at), text: t.message },
    ...(t.messages ?? []).map((m) => ({
      who: m.author === 'support' ? 'Support GuériEnergies' : t.requester_name,
      role: m.author === 'support' ? 'support' : 'client',
      when: dateFr(m.at),
      text: m.text,
    })),
  ];

  return (
    <>
      <PageHead
        title={t.sujet}
        subtitle={`SUP-${t.id} · ouvert le ${dateFr(t.created_at)} par ${t.requester_name}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Support', href: '/admin/support' }, { label: `SUP-${t.id}` }]}
        actions={<>
          <Badge variant={STATUT_TONE[t.statut] || 'neutral'} dot>{STATUT_LABEL[t.statut] || t.statut}</Badge>
          {t.statut !== 'resolu' && (
            <button type="button" className="btn btn-soft btn-sm" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate()}>
              <Icon name="checkCircle" size={15} /> {resolveMutation.isPending ? 'Résolution…' : 'Marquer résolu'}
            </button>
          )}
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 18 }}>
              <h3 className="h-3">Conversation</h3>
              <Badge variant={STATUT_TONE[t.statut] || 'neutral'} dot>{STATUT_LABEL[t.statut] || t.statut}</Badge>
            </div>
            <div className="stack gap-4">
              {thread.map((m, i) => (
                <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={m.who} tone={m.role === 'support' ? 'violet' : 'sky'} size={36} />
                  <div className="flex-1">
                    <div className="row gap-2" style={{ marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>{m.who}</strong>
                      {m.role === 'support' && <Badge variant="info">GuériEnergies</Badge>}
                      <span className="tiny">{m.when}</span>
                    </div>
                    <div className={`card-line card-pad ${m.role === 'support' ? 'tint-violet' : ''}`} style={{ padding: '12px 14px' }}>
                      <p className="small">{m.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="field">
              <label>Réponse</label>
              <textarea
                className="input" rows={3} placeholder="Écrire une réponse au client…"
                value={replyText} onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
            <div className="row gap-2 wrap" style={{ marginTop: 12, alignItems: 'center' }}>
              <select className="input" style={{ width: 'auto' }} value={nextStatut} onChange={(e) => setNextStatut(e.target.value)}>
                <option value="">Ne pas changer le statut</option>
                <option value="en_cours">Répondre et passer « En cours »</option>
                <option value="resolu">Répondre et marquer « Résolu »</option>
                <option value="ferme">Répondre et clôturer</option>
              </select>
              <button
                type="button" className="btn btn-primary btn-sm"
                disabled={!replyText.trim() || replyMutation.isPending}
                onClick={() => replyMutation.mutate()}
              >
                <Icon name="message" size={15} /> {replyMutation.isPending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Détails du ticket</h3>
            <dl className="dl">
              <dt>Référence</dt><dd>SUP-{t.id}</dd>
              <dt>Catégorie</dt><dd><Badge variant="neutral">{t.categorie}</Badge></dd>
              <dt>Priorité</dt><dd><Badge variant={PRIORITY_TONE[t.priorite] || 'neutral'} dot>{t.priorite}</Badge></dd>
              <dt>Statut</dt><dd><Badge variant={STATUT_TONE[t.statut] || 'neutral'} dot>{STATUT_LABEL[t.statut] || t.statut}</Badge></dd>
              <dt>Créé le</dt><dd>{dateFr(t.created_at)}</dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Demandeur</h3>
            <div className="row gap-3" style={{ marginBottom: 12 }}>
              <Avatar name={t.requester_name} tone="sky" size={44} />
              <div><div style={{ fontWeight: 500 }}>{t.requester_name}</div><div className="tiny">{t.requester_email}</div></div>
            </div>
            <a href={`mailto:${t.requester_email}`} className="btn btn-soft btn-sm btn-block"><Icon name="mail" size={15} /> Contacter par email</a>
          </div>

          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 12 }}>
              <h3 className="h-4">Notes internes</h3>
              <ModalButton modal="addNote" payload={{ name: `SUP-${t.id}` }} successToast="Note ajoutée" className="btn btn-soft btn-sm btn-icon" as="button"><Icon name="plus" size={15} /></ModalButton>
            </div>
            <p className="small muted">Aucune note interne pour le moment.</p>
          </div>
        </div>
      </div>
    </>
  );
}
