'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { reviews, getPractitioner } from '@/lib/data/practitioners';
import { tone } from '@/lib/format';

const STATUS_LABEL = { published: 'Publié', pending: 'En attente', flagged: 'Signalé' };

export default function AdminReviewsPage() {
  const rows = reviews.map((r) => {
    const p = getPractitioner(r.practitionerId);
    return { ...r, practitionerName: p ? p.name : '—', practitionerPhoto: p ? p.photo : null, practitionerTone: p ? p.tone : 'violet' };
  });

  const flagged = rows.filter((r) => r.status === 'flagged').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const published = rows.filter((r) => r.status === 'published').length;

  const columns = [
    {
      key: 'author', label: 'Auteur', width: 160,
      render: (r) => (
        <div className="row gap-2">
          <Avatar name={r.author} size={28} tone="violet" />
          <span className="table-cell-main">{r.author}</span>
        </div>
      ),
    },
    {
      key: 'practitionerName', label: 'Praticien',
      render: (r) => (
        <div className="row gap-2">
          <Avatar src={r.practitionerPhoto} name={r.practitionerName} size={28} tone={r.practitionerTone} />
          <span>{r.practitionerName}</span>
        </div>
      ),
    },
    { key: 'rating', label: 'Note', width: 110, sortable: true, render: (r) => <Rating value={r.rating} size={13} /> },
    {
      key: 'text', label: 'Extrait',
      render: (r) => <span className="small" style={{ display: 'block', maxWidth: 360 }}>« {r.text.length > 90 ? r.text.slice(0, 90) + '…' : r.text} »</span>,
    },
    { key: 'when', label: 'Reçu', width: 110, render: (r) => <span className="tiny">{r.when}</span> },
    {
      key: 'status', label: 'Statut', width: 120,
      render: (r) => <Badge variant={r.status === 'flagged' ? 'danger' : r.status === 'pending' ? 'warning' : 'success'} dot>{STATUS_LABEL[r.status] || r.status}</Badge>,
    },
    {
      key: 'actions', label: '', width: 60,
      render: (r) => (
        <ModalButton modal="moderateReview" payload={{ name: r.author, target: r.practitionerName }} className="btn btn-soft btn-sm btn-icon" title="Modérer">
          <Icon name="more" size={16} />
        </ModalButton>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Modération des avis"
        subtitle={`${reviews.length} avis · ${flagged} signalé${flagged > 1 ? 's' : ''} à traiter`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération', href: '/admin/signalements' }, { label: 'Avis' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Publiés</div><div className="h-2" style={{ marginTop: 6 }}>{published}</div><div className="small">visibles sur les profils</div></div>
        <div className="card card-pad"><div className="eyebrow">En attente</div><div className="h-2" style={{ marginTop: 6 }}>{pending}</div><div className="small">à valider</div></div>
        <div className="card card-pad tint-violet"><div className="eyebrow">Signalés</div><div className="h-2" style={{ marginTop: 6 }}>{flagged}</div><div className="small">priorité de modération</div></div>
      </div>

      {flagged > 0 && (
        <div className="note tint-violet" style={{ marginBottom: 20 }}>
          <div className="row gap-2"><Icon name="flag" size={16} color="var(--danger)" /><strong>Avis signalés en attente.</strong></div>
          <p className="small" style={{ marginTop: 6 }}>Les avis signalés sont mis en avant ci-dessous. Vérifiez le contexte avant de <span className="serif italic accent">publier, masquer ou supprimer</span>.</p>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['author', 'practitionerName', 'text']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [
            { value: 'published', label: 'Publié' },
            { value: 'pending', label: 'En attente' },
            { value: 'flagged', label: 'Signalé' },
          ] },
        ]}
        searchPlaceholder="Rechercher un avis, un auteur…"
        pageSize={8}
      />
    </>
  );
}
