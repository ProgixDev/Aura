'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import {
  ROLE_ORDER, ROLE_LABELS, ROLE_DESCRIPTIONS,
  CAPABILITY_ORDER, CAPABILITY_LABELS, CAPABILITIES,
} from '@/lib/capabilities';

const ROLE_TINT = { admin: 'tint-violet', moderateur: 'tint-sky', support: 'tint-sage', comptabilite: 'tint-gold' };
const ROLE_GLYPH = { admin: 'var(--violet-2)', moderateur: 'var(--sky-2)', support: 'var(--sage-2)', comptabilite: 'var(--gold)' };
const ROLE_SHORT = { admin: 'Admin', moderateur: 'Modér.', support: 'Support', comptabilite: 'Compta.' };

export default function RolesPage() {
  const { data, isError } = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: () => api.get('/admin/list?per_page=100'),
  });
  const team = data?.data ?? [];
  const counts = ROLE_ORDER.reduce((acc, rid) => {
    acc[rid] = team.filter((u) => (u.role ?? 'admin') === rid).length;
    return acc;
  }, {});

  return (
    <>
      <PageHead
        title="Rôles & permissions"
        subtitle="Ce que chaque rôle de l'équipe peut faire — matrice fixe, non éditable."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Rôles' }]}
      />

      {isError && <div className="empty"><div className="glyph">❍</div>Impossible de charger les rôles.</div>}

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {ROLE_ORDER.map((rid) => (
          <div key={rid} className="card card-pad">
            <div className="row gap-3" style={{ marginBottom: 12 }}>
              <span className={`tile-icon ${ROLE_TINT[rid]}`}><Icon name="shield" size={18} color={ROLE_GLYPH[rid]} /></span>
              <div>
                <h3 className="h-4">{ROLE_LABELS[rid]}</h3>
                <div className="tiny">{counts[rid] || 0} membre{(counts[rid] || 0) > 1 ? 's' : ''}</div>
              </div>
            </div>
            <p className="small" style={{ marginBottom: 14 }}>{ROLE_DESCRIPTIONS[rid]}</p>
            <div className="divider" />
            <div className="stack gap-2" style={{ marginTop: 14 }}>
              {CAPABILITIES[rid].map((cap) => (
                <div key={cap} className="row gap-2">
                  <Icon name="checkCircle" size={16} color="var(--sage-2)" />
                  <span className="small">{CAPABILITY_LABELS[cap]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="between" style={{ padding: '18px 20px' }}>
          <h3 className="h-3">Matrice des permissions</h3>
          <span className="tiny">accès par capacité</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Capacité</th>
                {ROLE_ORDER.map((rid) => <th key={rid} className="center">{ROLE_SHORT[rid]}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_ORDER.map((cap) => (
                <tr key={cap}>
                  <td className="table-cell-main">{CAPABILITY_LABELS[cap]}</td>
                  {ROLE_ORDER.map((rid) => (
                    <td key={rid} className="center">
                      {CAPABILITIES[rid].includes(cap)
                        ? <Icon name="check" size={16} color="var(--sage-2)" />
                        : <span className="tiny muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
