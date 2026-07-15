'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { ouvert: 'warning', resolu: 'success' };
const STATUT_LABEL = { ouvert: 'Ouvert', resolu: 'Résolu' };
const PRIO_TONE = { haute: 'danger', normale: 'warning' };

export default function AdminLitigesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);

  const { data, isError } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: () => api.get('/admin/disputes?per_page=100'),
  });
  const disputes = data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });

  // Client/praticien pickers for the "Nouveau litige" form — both endpoints are
  // already real (GET /clients is AdminGuard-only, GET /praticiens is public);
  // capped at 100 rows each, same convention as other admin list views in this
  // codebase (e.g. admin/avis uses `per_page=100`).
  const { data: clientsRes } = useQuery({
    queryKey: ['admin', 'clients', 'for-disputes'],
    queryFn: () => api.get('/clients?per_page=100'),
  });
  const { data: praticiensRes } = useQuery({
    queryKey: ['admin', 'praticiens', 'for-disputes'],
    queryFn: () => api.get('/praticiens?per_page=100'),
  });
  const clientOptions = (clientsRes?.data ?? [])
    .map((c) => ({ value: String(c.id), label: `${c.firstname} ${c.lastname}` }));
  const praticienOptions = (praticiensRes?.data ?? [])
    .map((p) => ({ value: String(p.id), label: `${p.firstname} ${p.lastname}` }));

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/disputes', payload),
    onSuccess: () => { invalidate(); toast('Litige ouvert', 'success'); },
  });
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution_notes }) =>
      api.post(`/admin/disputes/${id}/resolve`, { resolution_notes }),
    onSuccess: () => { invalidate(); toast('Litige résolu', 'success'); },
  });

  const open = disputes.filter((d) => d.statut === 'ouvert').length;
  const highPriority = disputes.filter((d) => d.statut === 'ouvert' && d.priorite === 'haute').length;
  const amount = disputes.filter((d) => d.statut === 'ouvert').reduce((s, d) => s + (d.montant ?? 0), 0);

  const createPayload = {
    title: 'Ouvrir un litige',
    subtitle: 'Enregistre un différend client ↔ praticien pour médiation.',
    fields: [
      { name: 'client_id', label: 'Client', type: 'select', options: clientOptions, required: true },
      { name: 'praticien_id', label: 'Praticien', type: 'select', options: praticienOptions, required: true },
      { name: 'montant', label: 'Montant en jeu (€, optionnel)', type: 'number', placeholder: '95' },
      {
        name: 'priorite', label: 'Priorité', type: 'select', value: 'normale',
        options: [{ value: 'normale', label: 'Normale' }, { value: 'haute', label: 'Haute' }],
      },
      { name: 'motif', label: 'Motif', type: 'textarea', placeholder: 'Décrivez le différend…', required: true },
    ],
    submitLabel: 'Ouvrir le litige',
    successToast: null,
    onSubmit: (values) => createMutation.mutateAsync({
      client_id: Number(values.client_id),
      praticien_id: Number(values.praticien_id),
      montant: values.montant ? Number(values.montant) : undefined,
      priorite: values.priorite || undefined,
      motif: values.motif,
    }),
  };

  return (
    <>
      <PageHead
        title="Litiges"
        subtitle="Médiation entre clients et praticiens."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Litiges' }]}
        actions={
          <div className="row gap-2">
            <ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
            <ModalButton modal="form" payload={createPayload} className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouveau litige</ModalButton>
          </div>
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Litiges ouverts" value={String(open)} icon="shield" />
        <StatCard label="Priorité haute" value={String(highPriority)} icon="flag" />
        <StatCard label="Montant en jeu" value={euro(amount)} icon="euro" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les litiges.</div>}

      {!isError && disputes.length === 0 && (
        <div className="empty"><div className="glyph">❍</div>Aucun litige pour le moment.</div>
      )}

      <div className="stack gap-4">
        {disputes.map((d) => {
          const urgent = d.statut === 'ouvert' && d.priorite === 'haute';
          const clientName = d.client ? `${d.client.firstname} ${d.client.lastname}` : 'Client';
          const practitionerName = d.praticien ? `${d.praticien.firstname} ${d.praticien.lastname}` : 'Praticien';
          return (
            <div key={d.id} className={`card card-pad${urgent ? ' tint-violet' : ''}`} style={urgent ? { borderColor: 'var(--danger)' } : undefined}>
              <div className="between wrap gap-3" style={{ alignItems: 'flex-start' }}>
                <div className="flex-1">
                  <div className="row gap-2 wrap" style={{ marginBottom: 8 }}>
                    <strong>LIT-{d.id}</strong>
                    <Badge variant={PRIO_TONE[d.priorite] || 'neutral'}>Priorité {d.priorite}</Badge>
                    <Badge variant={STATUT_TONE[d.statut] || 'neutral'}>{STATUT_LABEL[d.statut] || d.statut}</Badge>
                    <span className="tiny muted">{dateFr(d.created_at)}</span>
                  </div>
                  <div className="h-4 serif" style={{ marginBottom: 10 }}>{d.motif}</div>
                  <div className="row gap-5 wrap small">
                    <div className="row gap-2"><Avatar name={clientName} size={28} tone="sky" /><span>{clientName} <span className="muted">· client</span></span></div>
                    <div className="row gap-2"><Avatar name={practitionerName} size={28} tone="violet" /><span>{practitionerName} <span className="muted">· praticien</span></span></div>
                    {d.montant != null && <div className="row gap-2"><Icon name="euro" size={15} color="var(--muted)" /><span>{euro(d.montant)}</span></div>}
                  </div>
                  {d.statut === 'resolu' && d.resolution_notes && (
                    <p className="small muted" style={{ marginTop: 10 }}>Résolution : {d.resolution_notes}</p>
                  )}
                </div>
                <div className="row gap-2">
                  {d.statut === 'ouvert' ? (
                    <ModalButton
                      modal="confirm"
                      payload={{
                        title: 'Résoudre le litige',
                        message: `Confirmer la résolution du litige entre ${clientName} et ${practitionerName} ?`,
                        withReason: true,
                        reasonLabel: 'Notes de résolution (requis)',
                        confirmLabel: 'Résoudre',
                        successToast: null,
                        onConfirm: (reason) => resolveMutation.mutateAsync({ id: d.id, resolution_notes: reason }),
                      }}
                      className="btn btn-primary btn-sm"
                      as="div"
                    >
                      Résoudre
                    </ModalButton>
                  ) : (
                    <Badge variant="success" dot>Résolu</Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
