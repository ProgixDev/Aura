'use client';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { team } from '@/lib/data/admin';
import { tone } from '@/lib/format';

const ROLE_TONE = { 'Administrateur': 'verified', 'Modérateur': 'info', 'Support': 'success', 'Comptabilité': 'warning' };

export default function TeamPage() {
  const active = team.filter((u) => u.status === 'active').length;

  const columns = [
    {
      key: 'name', label: 'Membre', sortable: true,
      render: (u) => (
        <div className="row gap-3">
          <Avatar name={u.name} tone={u.tone} size={36} />
          <div><div style={{ fontWeight: 500 }}>{u.name}</div><div className="tiny">{u.email}</div></div>
        </div>
      ),
    },
    { key: 'role', label: 'Rôle', sortable: true, render: (u) => <Badge variant={ROLE_TONE[u.role] || 'neutral'}>{u.role}</Badge> },
    { key: 'status', label: 'Statut', render: (u) => <Badge variant={tone(u.status)} dot>{u.status}</Badge> },
    { key: 'lastActive', label: 'Dernière activité', render: (u) => <span className="small">{u.lastActive}</span> },
    {
      key: 'actions', label: '', width: 120,
      render: (u) => (
        <div className="row gap-2" onClick={(e) => e.stopPropagation()}>
          <ModalButton modal="editRole" payload={{ name: u.name }} className="btn btn-soft btn-sm btn-icon" as="button"><Icon name="edit" size={15} /></ModalButton>
          <ModalButton modal="suspendUser" payload={{ name: u.name }} className="btn btn-danger-soft btn-sm btn-icon" as="button"><Icon name="shield" size={15} /></ModalButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="Équipe"
        subtitle={`${team.length} membres · ${active} actifs`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Équipe' }]}
        actions={<>
          <ModalButton modal="invite" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Inviter</ModalButton>
        </>}
      />

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Membres</div><div className="h-2" style={{ marginTop: 6 }}>{team.length}</div><div className="small">{active} actifs</div></div>
        <div className="card card-pad"><div className="eyebrow">Invitations</div><div className="h-2" style={{ marginTop: 6 }}>{team.filter((u) => u.status === 'invited').length}</div><div className="small">en attente</div></div>
        <div className="card card-pad"><div className="eyebrow">Modérateurs</div><div className="h-2" style={{ marginTop: 6 }}>{team.filter((u) => u.role === 'Modérateur').length}</div><div className="small">contenus & avis</div></div>
        <div className="card card-pad"><div className="eyebrow">Rôles</div><div className="h-2" style={{ marginTop: 6 }}>4</div><div className="small"><a className="more" href="/admin/roles">gérer →</a></div></div>
      </div>

      <DataTable
        columns={columns}
        rows={team}
        searchKeys={['name', 'email', 'role']}
        filters={[
          { key: 'role', label: 'Tous les rôles', options: [{ value: 'Administrateur', label: 'Administrateur' }, { value: 'Modérateur', label: 'Modérateur' }, { value: 'Support', label: 'Support' }, { value: 'Comptabilité', label: 'Comptabilité' }] },
          { key: 'status', label: 'Tous les statuts', options: [{ value: 'active', label: 'Actif' }, { value: 'invited', label: 'Invité' }] },
        ]}
        searchPlaceholder="Rechercher un membre…"
        pageSize={10}
      />
    </>
  );
}
