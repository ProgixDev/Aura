'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUT_TONE = { en_attente: 'warning', lu: 'info', en_cours: 'info', traite: 'success', archive: 'neutral', signale: 'danger' };
const PRIORITE_TONE = { basse: 'neutral', moyenne: 'info', haute: 'warning', urgente: 'danger' };
const TYPE_LABEL = { proposition: 'Proposition', demande: 'Demande', information: 'Information', autre: 'Autre' };

export default function AdminExchangesPage() {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'echanges'],
    queryFn: () => api.get('/echanges?per_page=100'),
  });
  const echanges = (data?.data ?? []).map((e) => ({
    ...e,
    client_nom: e.client
      ? `${e.client.firstname} ${e.client.lastname}`
      : e.praticien ? `${e.praticien.firstname} ${e.praticien.lastname} (praticien)` : 'Membre',
  }));
  const enAttente = echanges.filter((e) => e.statut === 'en_attente').length;
  const signales = echanges.filter((e) => e.statut === 'signale').length;

  const hideMutation = useMutation({
    mutationFn: (id) => api.post(`/echanges/${id}/hide`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'echanges'] });
      toast(res.message, 'success');
    },
    onError: (err) => toast(err.message || 'Erreur', 'danger'),
  });

  const columns = [
    { key: 'sujet', label: 'Échange', sortable: true, render: (e) => (
      <div className="row gap-3">
        <Avatar name={e.client_nom} size={36} />
        <div>
          <div style={{ fontWeight: 500 }}>{e.sujet}</div>
          <div className="tiny">{e.client_nom}</div>
        </div>
      </div>
    ) },
    { key: 'type', label: 'Type', render: (e) => <Badge variant="neutral">{TYPE_LABEL[e.type] || e.type}</Badge> },
    { key: 'priorite', label: 'Priorité', render: (e) => <Badge variant={PRIORITE_TONE[e.priorite] || 'neutral'}>{e.priorite}</Badge> },
    { key: 'statut', label: 'Statut', render: (e) => <Badge variant={STATUT_TONE[e.statut] || 'neutral'} dot>{e.statut}</Badge> },
    { key: 'created_at', label: 'Publié', sortable: true, render: (e) => <span className="tiny muted">{dateFr(e.created_at)}</span> },
    { key: 'actions', label: '', width: 60, render: (e) => (
      <button className="btn btn-icon btn-ghost btn-sm" onClick={(ev) => { ev.stopPropagation(); hideMutation.mutate(e.id); }} title={e.est_masque ? 'Démasquer' : 'Masquer'}>
        <Icon name={e.est_masque ? 'checkCircle' : 'x'} size={14} />
      </button>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Échanges"
        subtitle={`${echanges.length} échange${echanges.length > 1 ? 's' : ''} · ${enAttente} en attente`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Échanges' }]}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Total</div><div className="h-2" style={{ marginTop: 6 }}>{echanges.length}</div><div className="small">échanges soumis</div></div>
        <div className="card card-pad"><div className="eyebrow">En attente</div><div className="h-2" style={{ marginTop: 6 }}>{enAttente}</div><div className="small">à traiter</div></div>
        <div className="card card-pad"><div className="eyebrow">Signalés</div><div className="h-2" style={{ marginTop: 6 }}>{signales}</div><div className="small">nécessitent une revue</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les échanges.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={echanges}
          searchKeys={['sujet', 'client_nom', 'message']}
          filters={[
            { key: 'type', label: 'Tous les types', options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
            { key: 'statut', label: 'Tous les statuts', options: Object.keys(STATUT_TONE).map((s) => ({ value: s, label: s })) },
          ]}
          rowHref={(e) => `/admin/echange/${e.id}`}
          searchPlaceholder="Rechercher un membre, un sujet…"
          pageSize={8}
        />
      )}
    </>
  );
}
