'use client';
import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { practitioners } from '@/lib/data/practitioners';
import { euro, tone } from '@/lib/format';

const levelVariant = (lvl) => (lvl === 'Expert' ? 'verified' : lvl === 'Novice' ? 'novice' : 'info');

export default function AdminPractitionersPage() {
  const verifiedCount = practitioners.filter((p) => p.verified).length;
  const onlineCount = practitioners.filter((p) => p.online).length;
  const totalEarnings = practitioners.reduce((s, p) => s + (p.earnings || 0), 0);

  const columns = [
    {
      key: 'name', label: 'Praticien', sortable: true,
      render: (p) => (
        <div className="row gap-3">
          <Avatar src={p.photo} name={p.name} tone={p.tone} size={36} online={p.online} />
          <div>
            <div style={{ fontWeight: 500 }} className="row gap-2">
              {p.name}{p.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
            </div>
            <div className="tiny">{p.region}</div>
          </div>
        </div>
      ),
    },
    { key: 'specialties', label: 'Spécialités', render: (p) => <span className="small">{p.specialties.join(' · ')}</span> },
    { key: 'city', label: 'Ville', sortable: true },
    { key: 'level', label: 'Niveau', render: (p) => <Badge variant={levelVariant(p.level)}>{p.level}</Badge> },
    { key: 'rating', label: 'Note', sortable: true, render: (p) => <Rating value={p.rating} count={p.reviews} size={13} showCount /> },
    { key: 'earnings', label: 'Revenus', sortable: true, render: (p) => <strong>{euro(p.earnings)}</strong> },
    { key: 'status', label: 'Statut', render: (p) => <Badge variant={tone(p.status)} dot>{p.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Praticiens"
        subtitle={`${practitioners.length} praticiens · ${verifiedCount} vérifiés · ${onlineCount} en ligne`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens' }]}
        actions={<>
          <Link href="/admin/praticiens/verification" className="btn btn-soft btn-sm"><Icon name="shield" size={15} /> File de vérification</Link>
          <ModalButton modal="exportData" className="btn btn-primary btn-sm"><Icon name="download" size={15} /> Exporter</ModalButton>
        </>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Communauté</div><div className="h-2" style={{ marginTop: 6 }}>{practitioners.length}</div><div className="small">praticiens actifs sur la plateforme</div></div>
        <div className="card card-pad"><div className="eyebrow">Vérifiés</div><div className="h-2" style={{ marginTop: 6 }}>{verifiedCount}</div><div className="small">profils certifiés Aura</div></div>
        <div className="card card-pad"><div className="eyebrow">Revenus cumulés</div><div className="h-2" style={{ marginTop: 6 }}>{euro(totalEarnings)}</div><div className="small">générés par les praticiens</div></div>
      </div>

      <DataTable
        columns={columns}
        rows={practitioners}
        searchKeys={['name', 'city']}
        filters={[
          { key: 'status', label: 'Tous les statuts', options: [{ value: 'active', label: 'Actif' }, { value: 'suspended', label: 'Suspendu' }, { value: 'pending', label: 'En attente' }] },
          { key: 'level', label: 'Tous les niveaux', options: [{ value: 'Expert', label: 'Expert' }, { value: 'Praticien confirmé', label: 'Confirmé' }, { value: 'Novice', label: 'Novice' }] },
        ]}
        rowHref={(p) => `/admin/praticien/${p.id}`}
        searchPlaceholder="Rechercher un praticien, une ville…"
        pageSize={8}
      />
    </>
  );
}
