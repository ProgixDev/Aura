import { PageHead } from '@/components/ui/PageHead';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { roles } from '@/lib/data/admin';

const ROLE_TINT = { admin: 'tint-violet', mod: 'tint-sky', support: 'tint-sage', finance: 'tint-gold' };
const ROLE_GLYPH = { admin: 'var(--violet-2)', mod: 'var(--sky-2)', support: 'var(--sage-2)', finance: 'var(--gold)' };

// Permissions matrix: capability x role (✓ allowed).
const CAPABILITIES = [
  { label: 'Tableau de bord', roles: ['admin', 'mod', 'support', 'finance'] },
  { label: 'Praticiens & vérifications', roles: ['admin', 'mod'] },
  { label: 'Clients', roles: ['admin', 'mod', 'support'] },
  { label: 'Réservations', roles: ['admin', 'support'] },
  { label: 'Avis & modération', roles: ['admin', 'mod'] },
  { label: 'Signalements & litiges', roles: ['admin', 'mod'] },
  { label: 'Tickets de support', roles: ['admin', 'support'] },
  { label: 'Paiements & remboursements', roles: ['admin', 'finance'] },
  { label: 'Abonnements & promos', roles: ['admin', 'finance'] },
  { label: 'Équipe & rôles', roles: ['admin'] },
  { label: 'Réglages système', roles: ['admin'] },
];

const ROLE_ORDER = ['admin', 'mod', 'support', 'finance'];
const ROLE_SHORT = { admin: 'Admin', mod: 'Modér.', support: 'Support', finance: 'Compta.' };

export default function RolesPage() {
  return (
    <>
      <PageHead
        title="Rôles & permissions"
        subtitle="Définissez ce que chaque membre de l’équipe peut faire."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Rôles' }]}
        actions={<ModalButton modal="editRole" className="btn btn-primary btn-sm"><Icon name="plus" size={15} /> Nouveau rôle</ModalButton>}
      />

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {roles.map((r) => (
          <div key={r.id} className="card card-pad">
            <div className="between" style={{ marginBottom: 12 }}>
              <div className="row gap-3">
                <span className={`tile-icon ${ROLE_TINT[r.id] || 'tint-violet'}`}><Icon name="shield" size={18} color={ROLE_GLYPH[r.id] || 'var(--violet-2)'} /></span>
                <div>
                  <h3 className="h-4">{r.name}</h3>
                  <div className="tiny">{r.members} membre{r.members > 1 ? 's' : ''}</div>
                </div>
              </div>
              <ModalButton modal="editRole" payload={{ name: r.name }} className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Modifier</ModalButton>
            </div>
            <p className="small" style={{ marginBottom: 14 }}>{r.desc}</p>
            <div className="divider" />
            <div className="stack gap-2" style={{ marginTop: 14 }}>
              {r.perms.map((p) => (
                <div key={p} className="row gap-2">
                  <Icon name="checkCircle" size={16} color="var(--sage-2)" />
                  <span className="small">{p}</span>
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
              {CAPABILITIES.map((cap) => (
                <tr key={cap.label}>
                  <td className="table-cell-main">{cap.label}</td>
                  {ROLE_ORDER.map((rid) => (
                    <td key={rid} className="center">
                      {cap.roles.includes(rid)
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
