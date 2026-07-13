import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { conversations, getConversation, sampleChat } from '@/lib/data/messages';
import { getPractitioner } from '@/lib/data/practitioners';
import { euro } from '@/lib/format';

export function generateStaticParams() {
  return conversations.map((c) => ({ id: c.id }));
}

export default async function AdminConversationPage({ params }) {
  const { id } = await params;
  const convo = getConversation(id) || conversations[0];
  const practitioner = convo.practitionerId ? getPractitioner(convo.practitionerId) : null;

  return (
    <>
      <PageHead
        title={convo.name}
        subtitle="Consultation en lecture seule · accès journalisé"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Messages', href: '/admin/messages' }, { label: convo.name }]}
        actions={<>
          <ToastButton message="Avertissement envoyé aux participants" tone="success" className="btn btn-soft btn-sm">
            <Icon name="flag" size={15} /> Avertir
          </ToastButton>
          <ModalButton modal="suspendUser" payload={{ name: convo.name }} className="btn btn-danger-soft btn-sm">
            <Icon name="shield" size={15} /> Suspendre
          </ModalButton>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Read-only chat */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="row gap-2">
              <Avatar src={convo.photo} name={convo.name} size={36} tone={convo.tone} online={convo.online} />
              <div>
                <div style={{ fontWeight: 600 }}>{convo.name}</div>
                <div className="tiny">{convo.online ? 'En ligne' : 'Hors ligne'} · {convo.kind}</div>
              </div>
            </div>
            <Badge variant="neutral"><Icon name="shield" size={13} /> Lecture seule</Badge>
          </div>

          <div className="stack gap-4" style={{ padding: 20, background: 'var(--pearl, #FBF9F6)' }}>
            {sampleChat.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.fromMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '76%' }}>
                  <div
                    className="card-pad"
                    style={{
                      borderRadius: 18,
                      padding: '11px 15px',
                      background: m.fromMe ? 'var(--violet-1, #ECE3FA)' : '#fff',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <p className="body" style={{ margin: 0, fontSize: 14 }}>{m.text}</p>
                    {m.proposal && (
                      <div className="note tint-violet" style={{ marginTop: 10 }}>
                        <div className="tiny eyebrow">Proposition de séance</div>
                        <div className="small" style={{ marginTop: 4 }}>
                          <strong>{m.proposal.when}</strong> · {m.proposal.durationMinutes} min · {m.proposal.mode} · {euro(m.proposal.price)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4, textAlign: m.fromMe ? 'right' : 'left' }}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
            <Icon name="shield" size={15} color="var(--muted)" />
            <span className="tiny">La modération ne peut pas écrire dans cette conversation. Consultation enregistrée au journal d'audit.</span>
          </div>
        </div>

        {/* Sidebar — participants + moderation */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Participants</h3>
            <div className="stack gap-3">
              <div className="row gap-3">
                <Avatar src={convo.photo} name={convo.name} size={40} tone={convo.tone} />
                <div className="flex-1">
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{convo.name}</div>
                  <div className="tiny">{practitioner ? `${practitioner.specialties?.[0]} · ${practitioner.city}` : 'Cercle communautaire'}</div>
                </div>
                {practitioner?.verified && <Badge variant="verified" dot>Vérifié</Badge>}
              </div>
              <div className="divider" />
              <div className="row gap-3">
                <Avatar name="Sarah Lemoine" size={40} tone="sky" />
                <div className="flex-1">
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Sarah Lemoine</div>
                  <div className="tiny">Cliente · Paris</div>
                </div>
                <Badge variant="neutral">Client</Badge>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 6 }}>Contexte</h3>
            <dl className="dl">
              <dt>Type</dt><dd><Badge variant={convo.kind === 'cercle' ? 'featured' : 'info'}>{convo.kind}</Badge></dd>
              <dt>Dernière activité</dt><dd>{convo.when}</dd>
              <dt>Messages</dt><dd>{sampleChat.length} échangés</dd>
              <dt>État</dt><dd><Badge variant="warning" dot>En revue</Badge></dd>
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 12 }}>Actions de modération</h3>
            <div className="stack gap-2">
              <ToastButton message="Avertissement envoyé aux participants" tone="success" className="btn btn-soft btn-block">
                <Icon name="flag" size={15} /> Avertir les participants
              </ToastButton>
              <ModalButton modal="suspendUser" payload={{ name: convo.name }} className="btn btn-danger-soft btn-block">
                <Icon name="shield" size={15} /> Suspendre un compte
              </ModalButton>
              <ModalButton
                modal="confirm"
                payload={{ title: 'Marquer comme résolu', message: 'Cette conversation sera retirée de la file de modération.', confirmLabel: 'Marquer résolu', successToast: 'Conversation marquée résolue' }}
                className="btn btn-primary btn-block"
              >
                <Icon name="checkCircle" size={15} /> Signaler résolu
              </ModalButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
