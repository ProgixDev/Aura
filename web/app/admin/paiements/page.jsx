'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api, errorMessage } from '@/lib/api';
import { euro, dateFr, downloadCsv } from '@/lib/format';
import { useUI } from '@/lib/store';

const STATUT_TONE = { paid: 'success', en_attente: 'warning', rembourse: 'info' };

export default function AdminPaiementsPage() {
  const toast = useUI((s) => s.toast);
  const { data, isError } = useQuery({
    queryKey: ['admin', 'paiements'],
    queryFn: () => api.get('/paiements?per_page=100'),
  });
  // Real, table-wide aggregates (not affected by the 100-row page cap) — this is why
  // the stat cards hit a separate endpoint instead of reducing over `paiements` below.
  const { data: statsData } = useQuery({
    queryKey: ['admin', 'paiements', 'statistics'],
    queryFn: () => api.get('/paiements/statistics'),
  });
  const stats = statsData?.data?.general;

  const paiements = (data?.data ?? []).map((p) => ({
    ...p,
    client_nom: p.client ? `${p.client.firstname} ${p.client.lastname}` : '',
    praticien_nom: p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : '',
  }));

  const exportCsv = async () => {
    try {
      const res = await api.get('/paiements/export/csv');
      downloadCsv(res.data);
    } catch (err) {
      toast(errorMessage(err), 'danger');
    }
  };

  const columns = [
    { key: 'reference', label: 'Réf.', sortable: true, render: (r) => <span className="table-cell-main">{r.reference}</span> },
    { key: 'date_paiement', label: 'Date', sortable: true, render: (r) => <span className="small">{dateFr(r.date_paiement)}</span> },
    { key: 'client_nom', label: 'Client', sortable: true, render: (r) => <span className="small">{r.client_nom || '—'}</span> },
    { key: 'praticien_nom', label: 'Praticien', render: (r) => <span className="small">{r.praticien_nom || 'N/A'}</span> },
    { key: 'montant_brut', label: 'Brut', sortable: true, render: (r) => euro(r.montant_brut) },
    { key: 'commission', label: 'Commission', sortable: true, render: (r) => <span className="muted">{euro(r.commission)}</span> },
    { key: 'montant_net_praticien', label: 'Net praticien', render: (r) => <strong>{euro(r.montant_net_praticien)}</strong> },
    { key: 'moyen_paiement', label: 'Moyen', render: (r) => <Badge variant="neutral">{r.moyen_paiement}</Badge> },
    { key: 'statut', label: 'Statut', render: (r) => <Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{r.statut}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Paiements"
        subtitle="Tous les flux financiers transitant par GuériEnergies."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Paiements' }]}
        actions={<button className="btn btn-soft btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> Exporter (CSV)</button>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Volume total" value={euro(stats?.montant_total)} icon="euro" />
        <StatCard label="Commissions GuériEnergies" value={euro(stats?.commission_totale)} icon="chart" />
        <StatCard label="Net reversé" value={euro(stats?.net_total)} icon="card" />
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les paiements.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={paiements}
          searchKeys={['reference', 'client_nom', 'praticien_nom']}
          filters={[
            { key: 'statut', label: 'Statut', options: [...new Set(paiements.map((p) => p.statut))].filter(Boolean).map((s) => ({ value: s, label: s })) },
            { key: 'moyen_paiement', label: 'Moyen', options: [...new Set(paiements.map((p) => p.moyen_paiement))].filter(Boolean).map((m) => ({ value: m, label: m })) },
          ]}
          rowHref={(r) => `/admin/paiement/${r.id}`}
          searchPlaceholder="Rechercher une transaction…"
          pageSize={10}
          toolbar={<button className="btn btn-soft btn-sm" onClick={exportCsv}><Icon name="download" size={15} /> Export comptable</button>}
        />
      )}
    </>
  );
}
