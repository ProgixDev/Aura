'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

export default function IntegrationsSettingsPage() {
  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['admin-integrations-stripe-status'],
    queryFn: () => api.get('/admin/integrations/stripe/status'),
  });
  const status = res?.data ?? { total_praticiens: 0, connected_praticiens: 0 };
  const connected = status.connected_praticiens > 0;

  return (
    <>
      <PageHead
        title="Intégrations"
        subtitle="Paiements et versements praticiens via Stripe Connect."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réglages', href: '/admin/parametres' }, { label: 'Intégrations' }]}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger le statut Stripe Connect.</div>}

      {!isError && (
        <div className="grid grid-2">
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 12 }}>
              <div className="row gap-3">
                <span className="tile-icon tint-violet"><Icon name="card" size={18} color="var(--violet-2)" /></span>
                <div>
                  <h3 className="h-4">Stripe</h3>
                  <Badge variant={connected ? 'success' : 'neutral'} dot>
                    {connected ? 'Connecté' : 'Aucun praticien connecté'}
                  </Badge>
                </div>
              </div>
            </div>
            <p className="small" style={{ marginBottom: 8 }}>
              Paiements des séances et versements aux praticiens via Stripe Connect (comptes Express).
            </p>
            <div className="tiny" style={{ marginBottom: 16 }}>
              {isLoading
                ? 'Chargement du statut…'
                : `${status.connected_praticiens} sur ${status.total_praticiens} praticiens ont activé leurs versements`}
            </div>
            <div className="row gap-2 wrap">
              <a
                href="https://dashboard.stripe.com/connect/accounts/overview"
                target="_blank"
                rel="noreferrer"
                className="btn btn-soft btn-sm"
              >
                <Icon name="arrowRight" size={15} /> Ouvrir le dashboard Stripe
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
