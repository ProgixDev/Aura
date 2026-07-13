'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { reports } from '@/lib/data/admin';
import { dateFr } from '@/lib/format';

const STATUS_LABEL = { pending: 'En attente', resolved: 'Résolu', rejected: 'Rejeté' };
const STATUS_TONE = { pending: 'warning', resolved: 'success', rejected: 'neutral' };
const PRIO_TONE = { haute: 'danger', normale: 'warning', basse: 'neutral' };
const TYPE_GLYPH = { Avis: 'star', Profil: 'user', Message: 'message', 'Événement': 'calendar' };

export default function AdminReportsPage() {
  const pending = reports.filter((r) => r.status === 'pending').length;
  const high = reports.filter((r) => r.priority === 'haute' && r.status === 'pending').length;

  const columns = [
    { key: 'date', label: 'Date', width: 110, sortable: true, render: (r) => <span className="small">{dateFr(r.date)}</span> },
    {
      key: 'type', label: 'Type', width: 130,
      render: (r) => (
        <span className="row gap-2"><Icon name={TYPE_GLYPH[r.type] || 'flag'} size={15} color="var(--muted)" />{r.type}</span>
      ),
    },
    { key: 'target', label: 'Sujet', render: (r) => <span className="table-cell-main" style={{ display: 'block', maxWidth: 320 }}>{r.target}</span> },
    { key: 'reason', label: 'Motif', render: (r) => <span className="small">{r.reason}</span> },
    { key: 'reporter', label: 'Signalé par', width: 150, render: (r) => <span className="small">{r.reporter}</span> },
    { key: 'priority', label: 'Priorité', width: 110, render: (r) => <Badge variant={PRIO_TONE[r.priority]} dot>{r.priority}</Badge> },
    { key: 'status', label: 'Statut', width: 120, render: (r) => <Badge variant={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
    {
      key: 'actions', label: '', width: 110,
      render: (r) => r.status === 'pending'
        ? <ModalButton modal="resolveReport" payload={{ title: r.target, reason: r.reason }} className="btn btn-primary btn-sm">Traiter</ModalButton>
        : <span className="tiny muted">— traité</span>,
    },
  ];

  return (
    <>
      <PageHead
        title="Signalements"
        subtitle={`${pending} signalement${pending > 1 ? 's' : ''} en attente · ${high} en priorité haute`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération' }, { label: 'Signalements' }]}
        actions={<ModalButton modal="exportData" className="btn btn-soft btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad tint-violet"><div className="eyebrow">À traiter</div><div className="h-2" style={{ marginTop: 6 }}>{pending}</div><div className="small">en file de modération</div></div>
        <div className="card card-pad"><div className="eyebrow">Priorité haute</div><div className="h-2" style={{ marginTop: 6 }}>{high}</div><div className="small">à examiner en premier</div></div>
        <div className="card card-pad"><div className="eyebrow">Résolus</div><div className="h-2" style={{ marginTop: 6 }}>{reports.filter((r) => r.status === 'resolved').length}</div><div className="small">sur la période</div></div>
        <div className="card card-pad"><div className="eyebrow">Rejetés</div><div className="h-2" style={{ marginTop: 6 }}>{reports.filter((r) => r.status === 'rejected').length}</div><div className="small">sans suite</div></div>
      </div>

      <div className="note" style={{ marginBottom: 20 }}>
        <p className="small"><span className="serif italic accent">Confiance & sécurité.</span> Chaque signalement est traité par l'équipe de modération sous 24h. Les motifs liés à un paiement hors plateforme sont prioritaires.</p>
      </div>

      <DataTable
        columns={columns}
        rows={reports}
        searchKeys={['target', 'reason', 'reporter']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [
            { value: 'pending', label: 'En attente' },
            { value: 'resolved', label: 'Résolu' },
            { value: 'rejected', label: 'Rejeté' },
          ] },
          { key: 'type', label: 'Tous les types', options: [
            { value: 'Avis', label: 'Avis' },
            { value: 'Profil', label: 'Profil' },
            { value: 'Message', label: 'Message' },
            { value: 'Événement', label: 'Événement' },
          ] },
        ]}
        searchPlaceholder="Rechercher un signalement…"
        pageSize={8}
      />
    </>
  );
}
