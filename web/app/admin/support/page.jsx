'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

// support_tickets.statut is French: ouvert|en_cours|resolu|ferme.
const STATUT_LABEL = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu', ferme: 'Clôturé' };
const STATUT_TONE = { ouvert: 'info', en_cours: 'warning', resolu: 'success', ferme: 'neutral' };
const PRIORITY_TONE = { haute: 'danger', normale: 'warning', basse: 'neutral' };

export default function SupportPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'support'],
    queryFn: () => api.get('/admin/support?per_page=100'),
  });
  const rows = data?.data ?? [];
  const stats = data?.statistiques;

  const columns = [
    { key: 'id', label: 'Réf.', sortable: true, render: (t) => <span className="table-cell-main">SUP-{t.id}</span> },
    { key: 'sujet', label: 'Sujet', render: (t) => <span style={{ fontWeight: 500 }}>{t.sujet}</span> },
    { key: 'requester_name', label: 'Auteur', sortable: true, render: (t) => <span className="small">{t.requester_name}</span> },
    { key: 'categorie', label: 'Catégorie', render: (t) => <Badge variant="neutral">{t.categorie}</Badge> },
    { key: 'created_at', label: 'Date', sortable: true, render: (t) => <span className="small">{dateFr(t.created_at)}</span> },
    { key: 'priorite', label: 'Priorité', render: (t) => <Badge variant={PRIORITY_TONE[t.priorite] || 'neutral'} dot>{t.priorite}</Badge> },
    { key: 'statut', label: 'Statut', render: (t) => <Badge variant={STATUT_TONE[t.statut] || 'neutral'} dot>{STATUT_LABEL[t.statut] || t.statut}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Support"
        subtitle={isLoading ? 'Chargement…' : `${stats?.ouvert ?? 0} ticket${(stats?.ouvert ?? 0) > 1 ? 's' : ''} ouvert${(stats?.ouvert ?? 0) > 1 ? 's' : ''} · ${stats?.en_cours ?? 0} en cours`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Support' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Ouverts</div><div className="h-2" style={{ marginTop: 6 }}>{stats?.ouvert ?? 0}</div><div className="small">à traiter</div></div>
        <div className="card card-pad"><div className="eyebrow">En cours</div><div className="h-2" style={{ marginTop: 6 }}>{stats?.en_cours ?? 0}</div><div className="small">en discussion</div></div>
        <div className="card card-pad"><div className="eyebrow">Résolus</div><div className="h-2" style={{ marginTop: 6 }}>{stats?.resolu ?? 0}</div><div className="small">clos avec succès</div></div>
        <div className="card card-pad"><div className="eyebrow">Total</div><div className="h-2" style={{ marginTop: 6 }}>{stats?.total ?? rows.length}</div><div className="small">tickets enregistrés</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les tickets.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={rows}
          searchKeys={['requester_name', 'requester_email', 'sujet']}
          filters={[
            { key: 'statut', label: 'Tous les statuts', options: [
              { value: 'ouvert', label: 'Ouvert' }, { value: 'en_cours', label: 'En cours' },
              { value: 'resolu', label: 'Résolu' }, { value: 'ferme', label: 'Clôturé' },
            ] },
            { key: 'priorite', label: 'Toutes priorités', options: [
              { value: 'haute', label: 'Haute' }, { value: 'normale', label: 'Normale' }, { value: 'basse', label: 'Basse' },
            ] },
          ]}
          rowHref={(t) => `/admin/support/${t.id}`}
          searchPlaceholder="Rechercher un ticket…"
          pageSize={8}
        />
      )}
    </>
  );
}
