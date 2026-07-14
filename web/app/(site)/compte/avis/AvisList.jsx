'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_LABEL = { en_attente: 'En attente', publié: 'Publié', rejeté: 'Rejeté' };
const STATUT_TONE = { en_attente: 'warning', publié: 'success', rejeté: 'danger' };

export default function AvisList() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['mes-avis'],
    queryFn: () => api.get('/client/avis'),
  });
  const mine = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mes-avis'] });

  if (isLoading) return <div className="empty">Chargement…</div>;

  if (mine.length === 0) {
    return (
      <div className="empty">
        <Icon name="star" size={28} color="var(--muted)" />
        <p className="mt-2">Vous n'avez pas encore laissé d'avis.</p>
      </div>
    );
  }

  return (
    <div className="stack gap-3">
      {mine.map((r) => {
        const p = r.praticien;
        const editable = r.statut === 'en_attente';
        return (
          <div key={r.id} className="card card-pad">
            <div className="row gap-3 between" style={{ alignItems: 'flex-start' }}>
              <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                <Avatar name={p ? `${p.firstname} ${p.lastname}` : r.full_name_author} tone="violet" size={48} />
                <div>
                  {p ? (
                    <Link href={`/praticien/${p.id}`} className="h-4" style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.firstname} {p.lastname}</Link>
                  ) : (
                    <span className="h-4" style={{ fontWeight: 500 }}>Praticien</span>
                  )}
                  {p?.specialite && <div className="row gap-2 small"><span>{p.specialite}</span></div>}
                </div>
              </div>
              <Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{STATUT_LABEL[r.statut] || r.statut}</Badge>
            </div>
            <div className="row gap-2 mt-3"><Rating value={r.note} showCount={false} size={15} /><span className="tiny muted">{dateFr(r.date_ajout)}</span></div>
            <p className="body mt-2" style={{ fontStyle: 'italic' }}>« {r.avis} »</p>
            {editable && (
              <>
                <div className="divider" />
                <div className="row gap-2">
                  <ModalButton
                    modal="form"
                    payload={{
                      title: 'Modifier votre avis',
                      fields: [
                        { name: 'rating', label: 'Note', type: 'rating', value: r.note },
                        { name: 'text', label: 'Votre avis', type: 'textarea', required: true, value: r.avis },
                      ],
                      submitLabel: 'Enregistrer',
                      successToast: 'Avis mis à jour',
                      onSubmit: async (values) => {
                        await api.put(`/client/avis/${r.id}`, { note: Number(values.rating), avis: values.text });
                        await invalidate();
                      },
                    }}
                    className="btn btn-soft btn-sm"
                  ><Icon name="edit" size={14} /> Modifier</ModalButton>
                  <ModalButton
                    modal="confirm"
                    payload={{
                      title: 'Supprimer cet avis',
                      message: 'Supprimer définitivement cet avis ?',
                      confirmLabel: 'Supprimer',
                      danger: true,
                      successToast: 'Avis supprimé',
                      onConfirm: async () => {
                        await api.del(`/client/avis/${r.id}`);
                        await invalidate();
                      },
                    }}
                    className="btn btn-danger-soft btn-sm"
                  ><Icon name="trash" size={14} /> Supprimer</ModalButton>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
