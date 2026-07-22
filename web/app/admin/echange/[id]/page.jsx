'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { useUI } from '@/lib/store';
import { dateFr } from '@/lib/format';

const STATUT_OPTIONS = ['en_attente', 'lu', 'en_cours', 'traite', 'archive', 'signale'];
const PRIORITE_OPTIONS = ['basse', 'moyenne', 'haute', 'urgente'];
const STATUT_TONE = { en_attente: 'warning', lu: 'info', en_cours: 'info', traite: 'success', archive: 'neutral', signale: 'danger' };
const TYPE_LABEL = { proposition: 'Proposition', demande: 'Demande', information: 'Information', autre: 'Autre' };

export default function AdminEchangeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  // adminShow flips statut en_attente -> lu server-side as a real, intentional side
  // effect (server/src/echanges/echanges.service.ts) — this page doesn't fight that;
  // viewing a submission is what marks it read, by design.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'echanges', id],
    queryFn: () => api.get(`/echanges/${id}`),
  });
  const e = data?.data;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'echanges', id] });

  const updateMutation = useMutation({
    mutationFn: (values) => api.put(`/echanges/${id}`, values),
    onSuccess: () => { invalidate(); toast('Échange mis à jour', 'success'); },
  });
  const hideMutation = useMutation({
    mutationFn: () => api.post(`/echanges/${id}/hide`),
    onSuccess: (res) => { invalidate(); toast(res.message, 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const reportMutation = useMutation({
    mutationFn: (motif_signalement) => api.post(`/echanges/${id}/report`, { motif_signalement }),
    onSuccess: () => { invalidate(); toast('Échange signalé', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.del(`/echanges/${id}`),
    onSuccess: () => { toast('Échange supprimé', 'success'); router.push('/admin/echanges'); },
  });

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !e) {
    return (
      <>
        <PageHead title="Échange introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Échanges', href: '/admin/echanges' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Cet échange n'existe pas.<div className="mt-3"><Link href="/admin/echanges" className="btn btn-soft btn-sm">Retour aux échanges</Link></div></div>
      </>
    );
  }

  const auteurNom = e.client
    ? `${e.client.firstname} ${e.client.lastname}`
    : e.praticien ? `${e.praticien.firstname} ${e.praticien.lastname}` : 'Membre';
  const auteurEmail = e.client?.email || e.praticien?.email;
  const auteurType = e.client ? 'Client' : e.praticien ? 'Praticien' : null;

  return (
    <>
      <PageHead
        title={e.sujet}
        subtitle={`${TYPE_LABEL[e.type] || e.type} · ${auteurNom}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Échanges', href: '/admin/echanges' }, { label: e.sujet }]}
        actions={<>
          <button className="btn btn-soft btn-sm" onClick={() => hideMutation.mutate()}>
            <Icon name={e.est_masque ? 'checkCircle' : 'x'} size={15} /> {e.est_masque ? 'Démasquer' : 'Masquer'}
          </button>
          <ModalButton modal="confirm" payload={{
            title: 'Signaler cet échange', withReason: true, reasonLabel: 'Motif du signalement',
            message: "L'échange sera marqué comme signalé.", confirmLabel: 'Signaler', successToast: null,
            onConfirm: (reason) => reportMutation.mutateAsync(reason || 'Signalé par un administrateur'),
          }} className="btn btn-soft btn-sm"><Icon name="flag" size={15} /> Signaler</ModalButton>
          <ModalButton modal="confirm" payload={{
            title: "Supprimer l'échange", message: `« ${e.sujet} » sera définitivement supprimé.`,
            confirmLabel: 'Supprimer', danger: true, successToast: null,
            onConfirm: () => deleteMutation.mutateAsync(),
          }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={15} /> Supprimer</ModalButton>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Message</h3>
            <p className="body" style={{ marginBottom: 14 }}>{e.message}</p>
            {(e.ce_que_je_propose || e.ce_que_je_recherche) && (
              <div className="grid grid-2 gap-3">
                {e.ce_que_je_propose && <div><div className="eyebrow">Propose</div><p className="small">{e.ce_que_je_propose}</p></div>}
                {e.ce_que_je_recherche && <div><div className="eyebrow">Recherche</div><p className="small accent">{e.ce_que_je_recherche}</p></div>}
              </div>
            )}
            {e.format && <p className="tiny muted" style={{ marginTop: 10 }}>Modalité : {e.format}</p>}
            {e.delai_souhaite && <p className="tiny muted">Délai souhaité : {dateFr(e.delai_souhaite)}</p>}
          </div>

          {e.pieces_jointes?.length > 0 && (
            <div className="card card-pad">
              <h3 className="h-3" style={{ marginBottom: 12 }}>Pièces jointes</h3>
              <div className="stack gap-2">
                {e.pieces_jointes.map((f, i) => (
                  <div key={i} className="row gap-2 small"><Icon name="download" size={14} />{f.nom}</div>
                ))}
              </div>
            </div>
          )}

          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 12 }}>Réponse admin</h3>
            <ModalButton modal="form" payload={{
              title: 'Répondre / mettre à jour', submitLabel: 'Enregistrer', successToast: null,
              fields: [
                { name: 'statut', label: 'Statut', type: 'select', options: STATUT_OPTIONS, value: e.statut },
                { name: 'priorite', label: 'Priorité', type: 'select', options: PRIORITE_OPTIONS, value: e.priorite },
                { name: 'reponse_admin', label: 'Réponse', type: 'textarea', value: e.reponse_admin },
              ],
              onSubmit: (values) => updateMutation.mutateAsync(values),
            }} className="btn btn-primary btn-sm">Mettre à jour le statut / répondre</ModalButton>
            {e.reponse_admin && <p className="small" style={{ marginTop: 12 }}>{e.reponse_admin}</p>}
          </div>
        </div>

        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Statut</h3>
            <dl className="dl">
              <dt>Statut</dt><dd><Badge variant={STATUT_TONE[e.statut] || 'neutral'}>{e.statut}</Badge></dd>
              <dt>Priorité</dt><dd>{e.priorite}</dd>
              <dt>Masqué</dt><dd>{e.est_masque ? 'Oui' : 'Non'}</dd>
              {e.motif_signalement && <><dt>Motif du signalement</dt><dd>{e.motif_signalement}</dd></>}
            </dl>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Auteur</h3>
            <div className="row gap-3">
              <Avatar name={auteurNom} size={44} />
              <div>
                <div style={{ fontWeight: 500 }}>{auteurNom}</div>
                {auteurType && <div className="tiny muted">{auteurType}</div>}
                {auteurEmail && <div className="tiny">{auteurEmail}</div>}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Horodatage</h3>
            <dl className="dl">
              <dt>Publié le</dt><dd>{dateFr(e.created_at)}</dd>
              <dt>Lu le</dt><dd>{e.lu_a ? dateFr(e.lu_a) : '—'}</dd>
              <dt>Traité le</dt><dd>{e.traite_a ? dateFr(e.traite_a) : '—'}</dd>
              <dt>Répondu le</dt><dd>{e.repondu_a ? dateFr(e.repondu_a) : '—'}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
