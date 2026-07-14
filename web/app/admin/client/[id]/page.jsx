'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { euro, dateFr } from '@/lib/format';

const STATUT_TONE = { paid: 'success', en_attente: 'warning', rembourse: 'info' };

export default function ClientDetailPage() {
  const { id } = useParams();
  // ClientsController has only `index` — no admin show route exists for a single
  // client at all (not even a ClientGuard-scoped one, unlike paiements). Derive from
  // the same admin list query the list page uses; same 100-row-cap caveat as Task 20.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'clients'],
    queryFn: () => api.get('/clients?per_page=100'),
  });
  const c = (data?.data ?? []).find((x) => String(x.id) === String(id));

  const { data: paiementsData } = useQuery({
    queryKey: ['admin', 'paiements', 'client', id],
    queryFn: () => api.get(`/paiements?client_id=${id}&per_page=100`),
    enabled: !!c,
  });
  const paiements = paiementsData?.data ?? [];

  if (isLoading) return <div className="empty"><div className="glyph">❍</div>Chargement…</div>;
  if (isError || !c) {
    return (
      <>
        <PageHead title="Client introuvable" crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients', href: '/admin/clients' }, { label: 'Introuvable' }]} />
        <div className="empty"><div className="glyph">❍</div>Aucun client ne correspond à cet identifiant.</div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title={`${c.firstname} ${c.lastname}`}
        subtitle={`Client depuis le ${dateFr(c.created_at)} · ${c.city}`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Clients', href: '/admin/clients' }, { label: `${c.firstname} ${c.lastname}` }]}
      />

      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row gap-4 wrap">
          <Avatar name={`${c.firstname} ${c.lastname}`} size={64} />
          <div className="flex-1">
            <h2 className="h-3" style={{ marginBottom: 4 }}>{c.firstname} {c.lastname}</h2>
            <div className="small row gap-3 wrap">
              <span className="row gap-2"><Icon name="mail" size={14} color="var(--muted)" /> {c.email}</span>
              <span className="row gap-2"><Icon name="pin" size={14} color="var(--muted)" /> {c.city}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="between" style={{ padding: '18px 20px' }}>
          <h3 className="h-4">Paiements de ce client</h3>
          <span className="tiny muted">{paiements.length}</span>
        </div>
        <table className="table">
          <thead><tr><th>Référence</th><th>Praticien</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {paiements.length === 0 ? (
              <tr><td colSpan={5}><div className="empty"><div className="glyph">❍</div>Aucun paiement</div></td></tr>
            ) : paiements.map((p) => (
              <tr key={p.id}>
                <td className="table-cell-main">{p.reference}</td>
                <td className="small">{p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A'}</td>
                <td className="small">{dateFr(p.date_paiement)}</td>
                <td>{euro(p.montant_brut)}</td>
                <td><Badge variant={STATUT_TONE[p.statut] || 'neutral'}>{p.statut}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tiny muted" style={{ marginTop: 16 }}>
        Notes internes, suspension, réinitialisation de mot de passe et export de données ne sont pas disponibles ici — le backend n'expose aujourd'hui qu'une fiche client minimale.
      </p>
    </>
  );
}
