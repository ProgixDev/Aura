import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { exchanges } from '@/lib/data/exchanges';

export const metadata = { title: 'Mes échanges — AURA' };

// Subset I published / am involved in, with a status tag each.
const MINE = [
  { id: 'ex1', status: 'active', statusLabel: 'En ligne', variant: 'success' },
  { id: 'ex3', status: 'pending', statusLabel: 'Proposition reçue', variant: 'warning' },
  { id: 'ex5', status: 'completed', statusLabel: 'Conclu', variant: 'neutral' },
];

const TINT = { violet: 'tint-violet', sky: 'tint-sky', sage: 'tint-sage', gold: 'tint-gold' };

const PROPOSE_FIELDS = [
  { name: 'give', label: 'Ce que je propose', type: 'text', required: true },
  { name: 'want', label: 'Ce que je recherche', type: 'text', required: true },
  { name: 'mode', label: 'Format', type: 'select', options: ['Présentiel', 'Visio', 'Peu importe'], required: true },
  { name: 'delay', label: 'Délai souhaité', type: 'text' },
  { name: 'message', label: 'Message', type: 'textarea' },
];

export default function EchangesPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1 row between wrap gap-3">
        <div>
          <h1 className="h-1">Mes échanges</h1>
          <p className="lead" style={{ marginTop: 4 }}>Le <span className="serif italic accent">troc de soins</span> entre membres de la communauté.</p>
        </div>
        <ModalButton modal="form" payload={{ title: 'Proposer un échange', fields: PROPOSE_FIELDS, submitLabel: 'Publier', successToast: 'Échange publié' }} className="btn btn-primary"><Icon name="plus" size={15} /> Proposer un échange</ModalButton>
      </header>

      <div className="stack gap-3">
        {MINE.map((m) => {
          const e = exchanges.find((x) => x.id === m.id);
          return (
            <div key={e.id} className="card card-pad">
              <div className="row gap-3 between" style={{ alignItems: 'flex-start' }}>
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span className={`tile-icon ${TINT[e.tone] || 'tint-violet'}`}><Icon name="share" size={18} /></span>
                  <div>
                    <div className="row gap-2"><span className="h-4" style={{ fontWeight: 500 }}>{e.give}</span><Icon name="arrowRight" size={14} color="var(--muted)" /><span className="h-4 serif italic accent">{e.want}</span></div>
                    <div className="small mt-1">{e.tag} · {e.mode} · {e.delay}</div>
                  </div>
                </div>
                <Badge variant={m.variant}>{m.statusLabel}</Badge>
              </div>
              <p className="small mt-2" style={{ fontStyle: 'italic' }}>« {e.message} »</p>
              <div className="divider" />
              <div className="row gap-2 between">
                <span className="tiny muted">Publié {e.publishedAgo}</span>
                <div className="row gap-2">
                  {m.status === 'pending' && <ModalButton modal="confirm" payload={{ title: 'Accepter la proposition', message: 'Confirmer cet échange ?', confirmLabel: 'Accepter', successToast: 'Échange confirmé' }} className="btn btn-soft btn-sm">Voir la proposition</ModalButton>}
                  {m.status === 'active' && <ModalButton modal="form" payload={{ title: "Modifier l'échange", fields: PROPOSE_FIELDS, submitLabel: 'Enregistrer', successToast: 'Échange mis à jour' }} className="btn btn-ghost btn-sm"><Icon name="edit" size={14} /> Modifier</ModalButton>}
                  {m.status !== 'completed' && <ToastButton message="Échange retiré" tone="danger" className="btn btn-danger-soft btn-sm"><Icon name="trash" size={14} /> Retirer</ToastButton>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="note"><Icon name="sparkle" size={15} color="var(--violet-2)" /> Les échanges reposent sur la confiance et le respect mutuel. Convenez ensemble des modalités avant de vous rencontrer.</div>
    </div>
  );
}
