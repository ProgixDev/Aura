'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_LABEL = { en_attente: 'En attente', publié: 'Publié', rejeté: 'Rejeté' };
const STATUT_TONE = { en_attente: 'warning', publié: 'success', rejeté: 'neutral' };

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { data: res } = useQuery({
    queryKey: ['admin-avis'],
    queryFn: () => api.get('/admin/avis?per_page=100'),
  });
  const rows = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-avis'] });

  const publish = async (id) => { await api.post(`/admin/avis/${id}/publish`); await invalidate(); };
  const reject = async (id) => { await api.post(`/admin/avis/${id}/reject`); await invalidate(); };

  const published = rows.filter((r) => r.statut === 'publié').length;
  const pending = rows.filter((r) => r.statut === 'en_attente').length;
  const rejected = rows.filter((r) => r.statut === 'rejeté').length;

  const columns = [
    {
      key: 'author', label: 'Auteur', width: 160,
      render: (r) => (
        <div className="row gap-2">
          <Avatar name={r.full_name_author} size={28} tone="violet" />
          <span className="table-cell-main">{r.full_name_author}</span>
        </div>
      ),
    },
    {
      key: 'praticien', label: 'Praticien',
      render: (r) => {
        const name = r.praticien ? `${r.praticien.firstname} ${r.praticien.lastname}` : '—';
        return (
          <div className="row gap-2">
            <Avatar name={name} size={28} tone="violet" />
            <span>{name}</span>
          </div>
        );
      },
    },
    { key: 'note', label: 'Note', width: 110, sortable: true, render: (r) => <Rating value={r.note} size={13} showCount={false} /> },
    {
      key: 'avis', label: 'Extrait',
      render: (r) => <span className="small" style={{ display: 'block', maxWidth: 360 }}>« {r.avis.length > 90 ? r.avis.slice(0, 90) + '…' : r.avis} »</span>,
    },
    { key: 'date_ajout', label: 'Reçu', width: 110, render: (r) => <span className="tiny">{dateFr(r.date_ajout)}</span> },
    {
      key: 'statut', label: 'Statut', width: 120,
      render: (r) => <Badge variant={STATUT_TONE[r.statut] || 'neutral'} dot>{STATUT_LABEL[r.statut] || r.statut}</Badge>,
    },
    {
      key: 'actions', label: '', width: 140,
      render: (r) => r.statut === 'en_attente' ? (
        <div className="row gap-2">
          <button type="button" className="btn btn-soft btn-sm btn-icon" title="Publier" onClick={() => publish(r.id)}>
            <Icon name="checkCircle" size={15} />
          </button>
          <button type="button" className="btn btn-danger-soft btn-sm btn-icon" title="Rejeter" onClick={() => reject(r.id)}>
            <Icon name="x" size={15} />
          </button>
        </div>
      ) : <span className="tiny muted">— traité</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Modération des avis"
        subtitle={`${rows.length} avis · ${pending} en attente de modération`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération', href: '/admin/signalements' }, { label: 'Avis' }]}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Publiés</div><div className="h-2" style={{ marginTop: 6 }}>{published}</div><div className="small">visibles sur les profils</div></div>
        <div className="card card-pad tint-violet"><div className="eyebrow">En attente</div><div className="h-2" style={{ marginTop: 6 }}>{pending}</div><div className="small">à valider</div></div>
        <div className="card card-pad"><div className="eyebrow">Rejetés</div><div className="h-2" style={{ marginTop: 6 }}>{rejected}</div><div className="small">sans suite</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['full_name_author', 'avis']}
        filters={[
          { key: 'statut', label: 'Tous les statuts', options: [
            { value: 'publié', label: 'Publié' },
            { value: 'en_attente', label: 'En attente' },
            { value: 'rejeté', label: 'Rejeté' },
          ] },
        ]}
        searchPlaceholder="Rechercher un avis, un auteur…"
        pageSize={8}
      />
    </>
  );
}
