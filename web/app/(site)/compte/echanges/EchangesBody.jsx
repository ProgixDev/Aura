'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';
import { buildEchangeSujet } from '@/lib/echange';

const TYPE_FR = { proposition: 'Proposition', demande: 'Demande', information: 'Information', autre: 'Autre' };
const STATUT_FR = { en_attente: 'En attente', lu: 'Lu', en_cours: 'En cours', traite: 'Traité', signale: 'Signalé', archive: 'Archivé' };
const STATUT_TONE = { en_attente: 'warning', lu: 'info', en_cours: 'info', traite: 'success', signale: 'danger', archive: 'neutral' };
const FORMAT_OPTIONS = ['Présentiel', 'Visio', 'Peu importe'];

const echangeFields = (e) => [
  { name: 'ce_que_je_propose', label: 'Ce que je propose', type: 'text', value: e?.ce_que_je_propose ?? '' },
  { name: 'ce_que_je_recherche', label: 'Ce que je recherche', type: 'text', value: e?.ce_que_je_recherche ?? '' },
  { name: 'format', label: 'Format', type: 'select', options: FORMAT_OPTIONS, value: e?.format ?? '' },
  { name: 'delai_souhaite', label: 'Délai souhaité (AAAA-MM-JJ, optionnel)', type: 'text', value: e?.delai_souhaite ?? '' },
  { name: 'message', label: 'Message (10 caractères minimum)', type: 'textarea', required: true, value: e?.message ?? '' },
];

export default function EchangesBody() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['echanges'],
    queryFn: () => api.get('/echanges/client/echanges?per_page=50'),
  });
  const list = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['echanges'] });

  const createPayload = {
    title: 'Proposer un échange',
    fields: echangeFields(),
    submitLabel: 'Publier',
    successToast: 'Échange publié',
    onSubmit: async (values) => {
      await api.post('/echanges/client/echanges', {
        sujet: buildEchangeSujet(values.ce_que_je_propose, values.ce_que_je_recherche),
        type: 'proposition',
        message: values.message,
        ce_que_je_propose: values.ce_que_je_propose || undefined,
        ce_que_je_recherche: values.ce_que_je_recherche || undefined,
        format: values.format || undefined,
        delai_souhaite: values.delai_souhaite || undefined,
      });
      await invalidate();
    },
  };

  return (
    <div className="stack gap-5">
      <header className="reveal r-1 row between wrap gap-3">
        <div>
          <h1 className="h-1">Mes échanges</h1>
          <p className="lead" style={{ marginTop: 4 }}>Le <span className="serif italic accent">troc de soins</span> entre membres de la communauté.</p>
        </div>
        <ModalButton modal="form" payload={createPayload} className="btn btn-primary"><Icon name="plus" size={15} /> Proposer un échange</ModalButton>
      </header>

      <div className="stack gap-3">
        {isLoading ? (
          <div className="empty">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="empty">Vous n'avez pas encore publié d'échange.</div>
        ) : list.map((e) => {
          const editable = e.statut === 'en_attente' || e.statut === 'lu';
          return (
            <div key={e.id} className="card card-pad">
              <div className="row gap-3 between" style={{ alignItems: 'flex-start' }}>
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span className="tile-icon tint-violet"><Icon name="share" size={18} /></span>
                  <div>
                    <div className="row gap-2"><span className="h-4" style={{ fontWeight: 500 }}>{e.sujet}</span></div>
                    <div className="small mt-1">{TYPE_FR[e.type] || e.type}{e.ce_que_je_propose ? ` · ${e.ce_que_je_propose}` : ''}{e.ce_que_je_recherche ? ` → ${e.ce_que_je_recherche}` : ''}</div>
                  </div>
                </div>
                <Badge variant={STATUT_TONE[e.statut] || 'neutral'}>{STATUT_FR[e.statut] || e.statut}</Badge>
              </div>
              <p className="small mt-2" style={{ fontStyle: 'italic' }}>« {e.message} »</p>
              <div className="divider" />
              <div className="row gap-2 between">
                <span className="tiny muted">Publié {dateFr(e.created_at)}{e.delai_souhaite ? ` · délai souhaité ${dateFr(e.delai_souhaite)}` : ''}</span>
                {editable && (
                  <div className="row gap-2">
                    <ModalButton
                      modal="form"
                      payload={{
                        title: "Modifier l'échange",
                        fields: echangeFields(e),
                        submitLabel: 'Enregistrer',
                        successToast: 'Échange mis à jour',
                        onSubmit: async (values) => {
                          await api.put(`/echanges/client/echanges/${e.id}`, {
                            sujet: buildEchangeSujet(values.ce_que_je_propose, values.ce_que_je_recherche),
                            message: values.message,
                            ce_que_je_propose: values.ce_que_je_propose || undefined,
                            ce_que_je_recherche: values.ce_que_je_recherche || undefined,
                            format: values.format || undefined,
                            delai_souhaite: values.delai_souhaite || undefined,
                          });
                          await invalidate();
                        },
                      }}
                      className="btn btn-ghost btn-sm"
                    ><Icon name="edit" size={14} /> Modifier</ModalButton>
                    <ModalButton
                      modal="confirm"
                      payload={{
                        title: "Retirer l'échange",
                        message: 'Cet échange sera définitivement retiré.',
                        danger: true,
                        confirmLabel: 'Retirer',
                        successToast: 'Échange retiré',
                        onConfirm: async () => {
                          await api.del(`/echanges/client/echanges/${e.id}`);
                          await invalidate();
                        },
                      }}
                      className="btn btn-danger-soft btn-sm"
                    ><Icon name="trash" size={14} /> Retirer</ModalButton>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="note"><Icon name="sparkle" size={15} color="var(--violet-2)" /> Les échanges reposent sur la confiance et le respect mutuel. Convenez ensemble des modalités avant de vous rencontrer.</div>
    </div>
  );
}
