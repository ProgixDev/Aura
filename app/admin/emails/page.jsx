'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { emailTemplates } from '@/lib/data/admin';
import { dateFr } from '@/lib/format';

const STATUS_LABEL = { active: 'Actif', draft: 'Brouillon' };

export default function AdminEmailsPage() {
  const active = emailTemplates.filter((t) => t.status === 'active').length;

  const columns = [
    {
      key: 'name', label: 'Modèle',
      render: (t) => (
        <div className="row gap-2">
          <span className="tile-icon glyph-violet" style={{ fontSize: 15, width: 30, height: 30 }}><Icon name="mail" size={15} /></span>
          <span className="table-cell-main">{t.name}</span>
        </div>
      ),
    },
    { key: 'subject', label: 'Objet', render: (t) => <span className="small" style={{ display: 'block', maxWidth: 320 }}>{t.subject}</span> },
    { key: 'updated', label: 'Mis à jour', width: 130, sortable: true, render: (t) => <span className="small">{dateFr(t.updated)}</span> },
    { key: 'status', label: 'Statut', width: 110, render: (t) => <Badge variant={t.status === 'active' ? 'success' : 'neutral'} dot>{STATUS_LABEL[t.status] || t.status}</Badge> },
    {
      key: 'actions', label: '', width: 150,
      render: (t) => (
        <div className="row gap-1">
          <ToastButton message={`Aperçu de « ${t.name} » (démo)`} tone="success" className="btn btn-soft btn-sm btn-icon" title="Aperçu">
            <Icon name="mail" size={15} />
          </ToastButton>
          <ModalButton
            modal="editField"
            payload={{ title: `Modifier « ${t.name} »`, fields: [
              { name: 'name', label: 'Nom du modèle', type: 'text' },
              { name: 'subject', label: 'Objet', type: 'text' },
              { name: 'body', label: 'Corps de l\'email', type: 'textarea' },
              { name: 'status', label: 'Statut', type: 'select', options: ['active', 'draft'] },
            ] }}
            className="btn btn-soft btn-sm btn-icon"
            title="Modifier"
          >
            <Icon name="edit" size={15} />
          </ModalButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Modèles d'emails"
        subtitle={`${emailTemplates.length} modèles · ${active} actifs`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Emails' }]}
        actions={
          <ModalButton
            modal="form"
            payload={{ title: 'Nouveau modèle', submitLabel: 'Créer le modèle', successToast: 'Modèle créé', fields: [
              { name: 'name', label: 'Nom du modèle', type: 'text', required: true },
              { name: 'subject', label: 'Objet', type: 'text', required: true },
              { name: 'body', label: 'Corps de l\'email', type: 'textarea' },
            ] }}
            className="btn btn-primary btn-sm"
          >
            <Icon name="plus" size={15} /> Nouveau modèle
          </ModalButton>
        }
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Modèles</div><div className="h-2" style={{ marginTop: 6 }}>{emailTemplates.length}</div><div className="small">transactionnels & marketing</div></div>
        <div className="card card-pad"><div className="eyebrow">Actifs</div><div className="h-2" style={{ marginTop: 6 }}>{active}</div><div className="small">envoyés automatiquement</div></div>
        <div className="card card-pad"><div className="eyebrow">Brouillons</div><div className="h-2" style={{ marginTop: 6 }}>{emailTemplates.filter((t) => t.status === 'draft').length}</div><div className="small">en préparation</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={emailTemplates}
        searchKeys={['name', 'subject']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [
            { value: 'active', label: 'Actif' },
            { value: 'draft', label: 'Brouillon' },
          ] },
        ]}
        searchPlaceholder="Rechercher un modèle…"
        pageSize={8}
      />
    </>
  );
}
