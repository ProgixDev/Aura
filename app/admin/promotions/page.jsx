'use client';
import { PageHead } from '@/components/ui/PageHead';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { promos } from '@/lib/data/admin';
import { tone } from '@/lib/format';

export default function AdminPromotionsPage() {
  const activeCount = promos.filter((p) => p.status === 'active').length;
  const totalUses = promos.reduce((s, p) => s + p.uses, 0);

  const columns = [
    { key: 'code', label: 'Code', sortable: true, render: (r) => <span className="table-cell-main" style={{ fontFamily: 'monospace', letterSpacing: '.04em' }}>{r.code}</span> },
    { key: 'type', label: 'Remise', render: (r) => <Badge variant="info">{r.type}</Badge> },
    { key: 'uses', label: 'Utilisations', sortable: true, render: (r) => <span>{r.uses}<span className="muted"> / {r.max}</span></span> },
    { key: 'expiry', label: 'Expiration', render: (r) => <span className="small">{r.expiry}</span> },
    { key: 'status', label: 'Statut', render: (r) => <Badge variant={tone(r.status)}>{r.status}</Badge> },
    {
      key: 'actions', label: '', width: 130, render: (r) => (
        <div className="row gap-2">
          <ModalButton modal="editField" payload={{ title: `Modifier ${r.code}`, fields: [{ name: 'code', label: 'Code', type: 'text' }, { name: 'type', label: 'Remise', type: 'text' }, { name: 'expiry', label: 'Expiration', type: 'text' }] }} className="btn btn-soft btn-sm btn-icon" as="div"><Icon name="edit" size={15} /></ModalButton>
          <ModalButton modal="deleteItem" payload={{ title: `Supprimer ${r.code}`, message: `Le code ${r.code} sera définitivement supprimé.`, successToast: 'Code supprimé' }} className="btn btn-danger-soft btn-sm btn-icon" as="div"><Icon name="trash" size={15} /></ModalButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Codes promo"
        subtitle="Réductions et campagnes d'acquisition."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Promotions' }]}
        actions={<ModalButton modal="createPromo" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouveau code</ModalButton>}
      />

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard label="Codes actifs" value={String(activeCount)} icon="ticket" />
        <StatCard label="Utilisations totales" value={totalUses.toLocaleString('fr-FR')} delta="+12%" deltaDir="up" icon="tag" />
        <StatCard label="Codes archivés" value={String(promos.length - activeCount)} icon="layers" />
      </div>

      <DataTable
        columns={columns}
        rows={promos}
        searchKeys={['code', 'type']}
        filters={[{ key: 'status', label: 'Statut', options: [{ value: 'active', label: 'Actif' }, { value: 'archived', label: 'Archivé' }] }]}
        searchPlaceholder="Rechercher un code…"
        pageSize={10}
        toolbar={<ModalButton modal="createPromo" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouveau code</ModalButton>}
      />
    </>
  );
}
