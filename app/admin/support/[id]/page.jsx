import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { tickets, getTicket } from '@/lib/data/admin';
import { dateFr, tone } from '@/lib/format';

export function generateStaticParams() {
  return tickets.map((t) => ({ id: t.id }));
}

const PRIORITY_TONE = { haute: 'danger', normale: 'warning', basse: 'neutral' };

export default async function TicketDetailPage({ params }) {
  const { id } = await params;
  const t = getTicket(id);

  if (!t) {
    return (
      <>
        <PageHead title="Ticket introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Support', href: '/admin/support' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun ticket ne correspond à cet identifiant.</div>
      </>
    );
  }

  const thread = [
    { who: t.from, role: 'client', when: `${dateFr(t.date)} · 09h14`, text: `Bonjour, ${t.subject.toLowerCase()}. Pourriez-vous m’aider à résoudre cela rapidement ? Merci d’avance.` },
    { who: 'Émilie Fontaine', role: 'support', when: `${dateFr(t.date)} · 11h02`, text: `Bonjour ${t.from.split(' ')[0]}, merci pour votre message. Je consulte votre dossier et reviens vers vous dans les plus brefs délais.` },
    { who: t.from, role: 'client', when: `${dateFr(t.date)} · 11h40`, text: `Parfait, merci beaucoup pour votre réactivité.` },
  ];

  return (
    <>
      <PageHead
        title={t.subject}
        subtitle={`${t.ref} · ouvert le ${dateFr(t.date)} via ${t.channel}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Support', href: '/admin/support' }, { label: t.ref }]}
        actions={<>
          <ModalButton modal="form" payload={{ title: 'Répondre au ticket', fields: [{ name: 'message', label: 'Votre réponse', type: 'textarea', required: true }], submitLabel: 'Envoyer', successToast: 'Réponse envoyée' }} className="btn btn-primary btn-sm"><Icon name="message" size={15} /> Répondre</ModalButton>
          <ModalButton modal="changeStatus" payload={{ name: t.ref }} className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Statut</ModalButton>
          <ModalButton modal="confirm" payload={{ title: 'Clôturer le ticket', message: `Confirmer la clôture du ticket ${t.ref} ?`, confirmLabel: 'Clôturer', successToast: 'Ticket clôturé' }} className="btn btn-soft btn-sm"><Icon name="checkCircle" size={15} /> Clôturer</ModalButton>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 18 }}>
              <h3 className="h-3">Conversation</h3>
              <Badge variant={tone(t.status)} dot>{t.status}</Badge>
            </div>
            <div className="stack gap-4">
              {thread.map((m, i) => (
                <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <Avatar name={m.who} tone={m.role === 'support' ? 'violet' : 'sky'} size={36} />
                  <div className="flex-1">
                    <div className="row gap-2" style={{ marginBottom: 4 }}>
                      <strong style={{ fontSize: 14 }}>{m.who}</strong>
                      {m.role === 'support' && <Badge variant="info">Aura</Badge>}
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
              <label>Réponse rapide</label>
              <textarea className="input" rows={3} placeholder="Écrire une réponse au client…" />
            </div>
            <div className="row gap-2 wrap" style={{ marginTop: 12 }}>
              <ToastButton message="Réponse envoyée" tone="success" className="btn btn-primary btn-sm"><Icon name="message" size={15} /> Envoyer</ToastButton>
              <ModalButton modal="form" payload={{ title: 'Réponse type', fields: [{ name: 'template', label: 'Modèle', type: 'select', options: ['Confirmation de réservation', 'Procédure d’annulation', 'Demande de facture'], required: true }], submitLabel: 'Insérer', successToast: 'Modèle inséré' }} className="btn btn-soft btn-sm"><Icon name="book" size={15} /> Réponse type</ModalButton>
            </div>
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Détails du ticket</h3>
            <dl className="dl">
              <dt>Référence</dt><dd>{t.ref}</dd>
              <dt>Canal</dt><dd><Badge variant="neutral">{t.channel}</Badge></dd>
              <dt>Priorité</dt><dd><Badge variant={PRIORITY_TONE[t.priority] || 'neutral'} dot>{t.priority}</Badge></dd>
              <dt>Statut</dt><dd><Badge variant={tone(t.status)} dot>{t.status}</Badge></dd>
              <dt>Créé le</dt><dd>{dateFr(t.date)}</dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Client</h3>
            <div className="row gap-3" style={{ marginBottom: 12 }}>
              <Avatar name={t.from} tone="sky" size={44} />
              <div><div style={{ fontWeight: 500 }}>{t.from}</div><div className="tiny">Client Aura</div></div>
            </div>
            <ToastButton message="Message envoyé au client" tone="success" className="btn btn-soft btn-sm btn-block"><Icon name="mail" size={15} /> Contacter</ToastButton>
          </div>

          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 12 }}>
              <h3 className="h-4">Notes internes</h3>
              <ModalButton modal="addNote" payload={{ name: t.ref }} successToast="Note ajoutée" className="btn btn-soft btn-sm btn-icon" as="button"><Icon name="plus" size={15} /></ModalButton>
            </div>
            <p className="small muted">Aucune note interne pour le moment.</p>
          </div>
        </div>
      </div>
    </>
  );
}
