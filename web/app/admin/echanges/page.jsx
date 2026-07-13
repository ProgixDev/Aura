'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { exchanges } from '@/lib/data/exchanges';

export default function AdminExchangesPage() {
  const careForService = exchanges.filter((e) => e.tag.includes('service')).length;
  const careForCare = exchanges.filter((e) => e.tag === 'Soin contre soin').length;

  const columns = [
    { key: 'who', label: 'Membre', sortable: true, render: (e) => (
      <div className="row gap-3">
        <Avatar name={e.who} tone={e.tone} size={36} />
        <div>
          <div style={{ fontWeight: 500 }}>{e.who}</div>
          <div className="tiny">{e.role}</div>
        </div>
      </div>
    ) },
    { key: 'give', label: 'Propose', render: (e) => <span className="small">{e.give}</span> },
    { key: 'want', label: 'Recherche', render: (e) => <span className="small accent">{e.want}</span> },
    { key: 'tag', label: 'Type', render: (e) => <Badge variant="neutral">{e.tag}</Badge> },
    { key: 'mode', label: 'Mode', render: (e) => <span className="small">{e.mode}</span> },
    { key: 'publishedAgo', label: 'Publié', render: (e) => <span className="tiny muted">{e.publishedAgo}</span> },
    { key: 'actions', label: '', width: 110, render: (e) => (
      <div className="row gap-1" onClick={(ev) => ev.stopPropagation()}>
        <ModalButton modal="confirm" payload={{ title: 'Masquer l\'annonce', message: `Masquer l'annonce de ${e.who} ? Elle ne sera plus visible publiquement.`, confirmLabel: 'Masquer', danger: true, successToast: 'Annonce masquée' }} className="btn btn-danger-soft btn-sm btn-icon" as="div" title="Masquer">
          <Icon name="x" size={14} />
        </ModalButton>
        <ModalButton modal="report" payload={{ name: e.who }} className="btn btn-soft btn-sm btn-icon" as="div" title="Signaler">
          <Icon name="flag" size={14} />
        </ModalButton>
      </div>
    ) },
  ];

  return (
    <>
      <PageHead
        title="Échanges"
        subtitle={`${exchanges.length} annonces de troc de soins à modérer`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Échanges' }]}
        actions={<ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Annonces actives</div><div className="h-2" style={{ marginTop: 6 }}>{exchanges.length}</div><div className="small">publiées par la communauté</div></div>
        <div className="card card-pad"><div className="eyebrow">Soin contre service</div><div className="h-2" style={{ marginTop: 6 }}>{careForService}</div><div className="small">échanges mixtes</div></div>
        <div className="card card-pad"><div className="eyebrow">Soin contre soin</div><div className="h-2" style={{ marginTop: 6 }}>{careForCare}</div><div className="small">entre praticiens</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={exchanges}
        searchKeys={['who', 'role', 'give', 'want']}
        filters={[
          { key: 'tag', label: 'Tous les types', options: [
            { value: 'Soin contre service', label: 'Soin contre service' },
            { value: 'Soin contre soin', label: 'Soin contre soin' },
            { value: 'Formation contre soin', label: 'Formation contre soin' },
          ] },
          { key: 'mode', label: 'Tous les modes', options: [
            { value: 'Présentiel', label: 'Présentiel' }, { value: 'Peu importe', label: 'Peu importe' },
          ] },
        ]}
        rowHref={(e) => `/admin/echange/${e.id}`}
        searchPlaceholder="Rechercher un membre, un soin…"
        pageSize={8}
      />
    </>
  );
}
