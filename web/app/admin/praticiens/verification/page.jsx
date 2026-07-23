'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api, apiFetchBlob } from '@/lib/api';
import { contactRecipient } from '@/lib/contact';
import { dateFr } from '@/lib/format';

const DOC_TYPES = ['piece_identite', 'diplome', 'charte', 'justificatif_siret'];
const DOC_LABELS = {
  piece_identite: "Pièce d'identité", diplome: 'Diplôme', charte: 'Charte signée',
  justificatif_siret: 'Justificatif SIRET',
};

async function openDocument(doc, toast) {
  try {
    const blob = await apiFetchBlob(`/v1/admin/praticiens/verification/documents/${doc.id}/file`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    toast(err.message || "Impossible d'ouvrir le document", 'danger');
  }
}

export default function VerificationQueuePage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'praticiens', 'verification'],
    queryFn: () => api.get('/v1/admin/praticiens/verification?per_page=100'),
  });
  const queue = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'praticiens', 'verification'] });

  const verifyMutation = useMutation({
    mutationFn: (p) => api.post(`/v1/admin/praticiens/verification/${p.id}/verify`, {
      documents: (p.documents || []).map((d) => ({ id: d.id, statut: 'valide' })),
    }),
    onSuccess: (res) => { invalidate(); toast(res.message || 'Praticien vérifié', 'success'); },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, motif_rejet }) => api.post(`/v1/admin/praticiens/verification/${id}/reject`, { motif_rejet }),
    onSuccess: () => { invalidate(); toast('Candidature rejetée', 'success'); },
  });
  const relanceMutation = useMutation({
    mutationFn: (id) => api.post(`/v1/admin/praticiens/verification/${id}/relance`),
    onSuccess: () => toast('Relance envoyée avec succès', 'success'),
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  // Same /verify endpoint the bulk "Vérifier" button uses, but with a single-item
  // documents[] — the backend already recomputes the praticien's overall status from
  // every document's real state, so a one-doc call is a fully correct partial decision,
  // not a special case.
  const verifyOneMutation = useMutation({
    mutationFn: ({ praticienId, docId }) => api.post(`/v1/admin/praticiens/verification/${praticienId}/verify`, {
      documents: [{ id: docId, statut: 'valide' }],
    }),
    onSuccess: () => { invalidate(); toast('Document validé', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });
  const rejectOneMutation = useMutation({
    mutationFn: ({ praticienId, docId, reason }) => api.post(`/v1/admin/praticiens/verification/${praticienId}/verify`, {
      documents: [{ id: docId, statut: 'rejete', commentaire_rejet: reason }],
      commentaire_global: reason,
    }),
    onSuccess: () => { invalidate(); toast('Document rejeté', 'success'); },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  return (
    <>
      <PageHead
        title="File de vérification"
        subtitle={isLoading ? 'Chargement…' : `${queue.length} praticien${queue.length > 1 ? 's' : ''} en attente de validation manuelle.`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens', href: '/admin/praticiens' }, { label: 'Vérification' }]}
        actions={<Badge variant="warning" dot>{queue.length} en attente</Badge>}
      />

      <div className="note tint-gold" style={{ marginBottom: 22 }}>
        <Icon name="shield" size={16} color="var(--gold-2)" />
        <span className="small">Validez ou rejetez chaque document individuellement avec ✓/✗, ou utilisez Vérifier/Rejeter pour statuer sur l'ensemble du dossier en une fois. Une fois les {DOC_TYPES.length} documents validés, le praticien obtient le statut <strong>validé</strong> et apparaît dans les résultats de recherche.</span>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger la file de vérification.</div>}
      {!isLoading && !isError && queue.length === 0 && (
        <div className="empty"><div className="glyph">❍</div>Aucun praticien en attente.</div>
      )}

      <div className="grid grid-2">
        {queue.map((p) => {
          const docs = p.documents || [];
          const missing = DOC_TYPES.length - docs.length;
          return (
            <div key={p.id} className="card card-pad">
              <div className="row gap-3" style={{ marginBottom: 16 }}>
                <Avatar name={`${p.firstname} ${p.lastname}`} size={52} />
                <div className="flex-1">
                  <div className="row gap-2"><strong>{p.firstname} {p.lastname}</strong><Badge variant="warning">{p.statut_verification}</Badge></div>
                  <div className="small">{p.specialite} · {p.niveau}</div>
                  <div className="tiny">{p.ville} · inscrit le {dateFr(p.date_inscription || p.created_at)}</div>
                  <div className="tiny muted">SIRET {p.siret}</div>
                </div>
              </div>

              <div className="divider" />

              <div className="eyebrow" style={{ marginTop: 4, marginBottom: 10 }}>Documents soumis</div>
              <div className="stack gap-2" style={{ marginBottom: 16 }}>
                {DOC_TYPES.map((type) => {
                  const doc = docs.find((d) => d.type === type);
                  const ok = doc?.statut === 'valide';
                  const rejected = doc?.statut === 'rejete';
                  const submitted = !!doc;
                  return (
                    <div key={type} className="row gap-2 between">
                      <span className="row gap-2 small">
                        <Icon name={submitted ? (ok ? 'checkCircle' : 'clock') : 'x'} size={15} color={ok ? 'var(--sage-2)' : submitted ? 'var(--gold-2)' : 'var(--danger)'} />
                        {DOC_LABELS[type]}
                      </span>
                      <div className="row gap-2">
                        <Badge variant={ok ? 'success' : submitted ? 'warning' : 'danger'}>{submitted ? doc.statut : 'manquant'}</Badge>
                        {submitted && <button className="btn btn-link btn-sm" onClick={() => openDocument(doc, toast)}>Voir</button>}
                        {submitted && !ok && (
                          <button
                            className="btn btn-icon btn-soft btn-sm" title="Valider ce document"
                            onClick={() => verifyOneMutation.mutate({ praticienId: p.id, docId: doc.id })}
                          >
                            <Icon name="check" size={13} color="var(--sage-2)" />
                          </button>
                        )}
                        {submitted && !rejected && (
                          <ModalButton modal="confirm" payload={{
                            title: 'Rejeter ce document', danger: true, withReason: true,
                            reasonLabel: 'Motif du rejet (visible par le praticien)',
                            message: `Rejeter « ${DOC_LABELS[type]} » ? Le praticien pourra en soumettre un nouveau.`,
                            confirmLabel: 'Rejeter', successToast: null,
                            onConfirm: (reason) => rejectOneMutation.mutateAsync({ praticienId: p.id, docId: doc.id, reason }),
                          }} className="btn btn-icon btn-soft btn-sm" title="Rejeter ce document">
                            <Icon name="x" size={13} color="var(--danger)" />
                          </ModalButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {missing > 0 && (
                <div className="note tint-violet" style={{ marginBottom: 14 }}>
                  <span className="tiny">{missing} document{missing > 1 ? 's' : ''} manquant{missing > 1 ? 's' : ''} — </span>
                  <button className="btn btn-link btn-sm" onClick={() => relanceMutation.mutate(p.id)}>relancer le praticien</button>
                </div>
              )}

              <div className="row gap-2 wrap">
                <ModalButton modal="confirm" payload={{
                  title: 'Vérifier le praticien',
                  message: 'Confirmer que les documents soumis sont conformes ? Le statut sera mis à jour selon les documents validés.',
                  confirmLabel: 'Vérifier', successToast: null,
                  onConfirm: () => verifyMutation.mutateAsync(p),
                }} className="btn btn-primary btn-sm flex-1">
                  <Icon name="check" size={15} /> Vérifier
                </ModalButton>
                <ModalButton modal="confirm" payload={{
                  title: 'Rejeter la candidature', danger: true, withReason: true,
                  reasonLabel: 'Motif du rejet (10 caractères minimum)',
                  message: 'Le praticien sera notifié du refus.', confirmLabel: 'Rejeter', successToast: null,
                  onConfirm: (reason) => rejectMutation.mutateAsync({ id: p.id, motif_rejet: reason }),
                }} className="btn btn-danger-soft btn-sm flex-1">
                  <Icon name="x" size={15} /> Rejeter
                </ModalButton>
                <ModalButton modal="contact" payload={{
                  name: `${p.firstname} ${p.lastname}`,
                  onSubmit: (values) => contactRecipient('praticien', p.id, values),
                }} className="btn btn-soft btn-sm btn-icon" as="button" title="Contacter">
                  <Icon name="mail" size={15} />
                </ModalButton>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
