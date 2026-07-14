'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { euro } from '@/lib/format';

const VERIF_TONE = { valide: 'success', en_attente: 'warning', en_cours: 'info', rejete: 'danger' };

export default function AdminPractitionersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'praticiens'],
    queryFn: () => api.get('/praticiens?per_page=100'),
  });
  const practitioners = data?.data ?? [];
  const verifiedCount = practitioners.filter((p) => p.statut_verification === 'valide').length;
  const avgTarif = practitioners.length
    ? practitioners.reduce((s, p) => s + Number(p.tarif || 0), 0) / practitioners.length
    : 0;

  const columns = [
    { key: 'firstname', label: 'Praticien', sortable: true, render: (p) => (
      <div className="row gap-3">
        <Avatar name={`${p.firstname} ${p.lastname}`} size={36} />
        <div>
          <div style={{ fontWeight: 500 }} className="row gap-2">
            {p.firstname} {p.lastname}
            {p.statut_verification === 'valide' && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
          </div>
          <div className="tiny">{p.ville}</div>
        </div>
      </div>
    ) },
    { key: 'specialite', label: 'Spécialité', sortable: true, render: (p) => <span className="small">{p.specialite}</span> },
    { key: 'niveau', label: 'Niveau', render: (p) => <Badge variant="info">{p.niveau}</Badge> },
    { key: 'tarif', label: 'Tarif', sortable: true, render: (p) => <strong>{euro(p.tarif)}</strong> },
    { key: 'statut_verification', label: 'Vérification', render: (p) => <Badge variant={VERIF_TONE[p.statut_verification] || 'neutral'} dot>{p.statut_verification}</Badge> },
    { key: 'status', label: 'Statut', render: (p) => <Badge variant={p.status === 'actif' ? 'success' : 'neutral'} dot>{p.status}</Badge> },
  ];

  return (
    <>
      <PageHead
        title="Praticiens"
        subtitle={isLoading ? 'Chargement…' : `${practitioners.length} praticiens · ${verifiedCount} vérifiés`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Praticiens' }]}
        actions={<Link href="/admin/praticiens/verification" className="btn btn-soft btn-sm"><Icon name="shield" size={15} /> File de vérification</Link>}
      />

      <div className="grid grid-3" style={{ marginBottom: 22 }}>
        <div className="card card-pad"><div className="eyebrow">Communauté</div><div className="h-2" style={{ marginTop: 6 }}>{practitioners.length}</div><div className="small">praticiens sur la plateforme</div></div>
        <div className="card card-pad"><div className="eyebrow">Vérifiés</div><div className="h-2" style={{ marginTop: 6 }}>{verifiedCount}</div><div className="small">profils validés</div></div>
        <div className="card card-pad"><div className="eyebrow">Tarif moyen</div><div className="h-2" style={{ marginTop: 6 }}>{euro(avgTarif)}</div><div className="small">par séance</div></div>
      </div>

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les praticiens.</div>}

      {!isError && (
        <DataTable
          columns={columns}
          rows={practitioners}
          searchKeys={['firstname', 'lastname', 'ville']}
          filters={[
            { key: 'status', label: 'Tous les statuts', options: [...new Set(practitioners.map((p) => p.status))].map((s) => ({ value: s, label: s })) },
            { key: 'statut_verification', label: 'Toutes les vérifications', options: [...new Set(practitioners.map((p) => p.statut_verification))].map((s) => ({ value: s, label: s })) },
          ]}
          rowHref={(p) => `/admin/praticien/${p.id}`}
          searchPlaceholder="Rechercher un praticien, une ville…"
          pageSize={8}
        />
      )}
    </>
  );
}
