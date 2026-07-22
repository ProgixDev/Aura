'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const STATUS_LABEL = { pending: 'En attente', resolved: 'Résolu', rejected: 'Rejeté' };
const STATUS_TONE = { pending: 'warning', resolved: 'success', rejected: 'neutral' };
const PRIO_TONE = { urgente: 'danger', haute: 'danger', normale: 'warning', basse: 'neutral' };
// `type` has no backend-enforced enum (Task 3) — this is the real vocabulary
// mobile's report.tsx (Task 14) actually sends, not a fabricated taxonomy.
const TYPE_LABEL = {
  overclaim: 'Promesses exagérées',
  behavior: 'Comportement',
  fake: 'Faux avis',
  pros: 'Prosélytisme',
  other: 'Autre',
};

export default function AdminReportsPage() {
  const queryClient = useQueryClient();
  const { data: res } = useQuery({
    queryKey: ['admin-signalements'],
    queryFn: () => api.get('/admin/signalements?per_page=100'),
  });
  const reports = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-signalements'] });

  const resolve = async (id) => { await api.post(`/admin/signalements/${id}/resolve`); await invalidate(); };
  const reject = async (id) => { await api.post(`/admin/signalements/${id}/reject`); await invalidate(); };

  const pending = reports.filter((r) => r.statut === 'pending').length;
  const high = reports.filter((r) => (r.priorite === 'haute' || r.priorite === 'urgente') && r.statut === 'pending').length;

  const columns = [
    { key: 'date_signalement', label: 'Date', width: 110, sortable: true, render: (r) => <span className="small">{dateFr(r.date_signalement)}</span> },
    {
      key: 'type', label: 'Type', width: 150,
      render: (r) => <span className="row gap-2"><Icon name="flag" size={15} color="var(--muted)" />{TYPE_LABEL[r.type] || r.type}</span>,
    },
    {
      key: 'sujet', label: 'Sujet',
      render: (r) => (
        <div>
          <span className="table-cell-main" style={{ display: 'block', maxWidth: 320 }}>{r.sujet}</span>
          {r.praticien && (
            <Link href={`/admin/praticien/${r.praticien.id}`} className="tiny more">
              {r.praticien.firstname} {r.praticien.lastname} <span className="muted">· praticien</span>
            </Link>
          )}
          {r.client && (
            <Link href={`/admin/client/${r.client.id}`} className="tiny more">
              {r.client.firstname} {r.client.lastname} <span className="muted">· client</span>
            </Link>
          )}
        </div>
      ),
    },
    { key: 'motif', label: 'Motif', render: (r) => <span className="small">{r.motif}</span> },
    { key: 'reporter', label: 'Signalé par', width: 150, render: (r) => <span className="small">{r.signalePar?.name ?? 'Utilisateur'}</span> },
    { key: 'priorite', label: 'Priorité', width: 110, render: (r) => <Badge variant={PRIO_TONE[r.priorite]} dot>{r.priorite}</Badge> },
    { key: 'statut', label: 'Statut', width: 120, render: (r) => <Badge variant={STATUS_TONE[r.statut]}>{STATUS_LABEL[r.statut]}</Badge> },
    {
      key: 'actions', label: '', width: 150,
      render: (r) => r.statut === 'pending' ? (
        <div className="row gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => resolve(r.id)}>Traiter</button>
          <button type="button" className="btn btn-danger-soft btn-sm btn-icon" title="Rejeter" onClick={() => reject(r.id)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ) : <span className="tiny muted">— traité</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Signalements"
        subtitle={`${pending} signalement${pending > 1 ? 's' : ''} en attente · ${high} en priorité haute`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération' }, { label: 'Signalements' }]}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad tint-violet"><div className="eyebrow">À traiter</div><div className="h-2" style={{ marginTop: 6 }}>{pending}</div><div className="small">en file de modération</div></div>
        <div className="card card-pad"><div className="eyebrow">Priorité haute</div><div className="h-2" style={{ marginTop: 6 }}>{high}</div><div className="small">à examiner en premier</div></div>
        <div className="card card-pad"><div className="eyebrow">Résolus</div><div className="h-2" style={{ marginTop: 6 }}>{reports.filter((r) => r.statut === 'resolved').length}</div><div className="small">sur la période</div></div>
        <div className="card card-pad"><div className="eyebrow">Rejetés</div><div className="h-2" style={{ marginTop: 6 }}>{reports.filter((r) => r.statut === 'rejected').length}</div><div className="small">sans suite</div></div>
      </div>

      <div className="note" style={{ marginBottom: 20 }}>
        <p className="small"><span className="serif italic accent">Confiance & sécurité.</span> Chaque signalement est traité par l'équipe de modération sous 24h. Les motifs liés à un paiement hors plateforme sont prioritaires.</p>
      </div>

      <DataTable
        columns={columns}
        rows={reports}
        searchKeys={['sujet', 'motif']}
        filters={[
          { key: 'statut', label: 'Tous les statuts', options: [
            { value: 'pending', label: 'En attente' },
            { value: 'resolved', label: 'Résolu' },
            { value: 'rejected', label: 'Rejeté' },
          ] },
          { key: 'type', label: 'Tous les types', options: Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label })) },
        ]}
        searchPlaceholder="Rechercher un signalement…"
        pageSize={8}
      />
    </>
  );
}
