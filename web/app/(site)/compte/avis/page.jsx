import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { reviews } from '@/lib/data/practitioners';
import { getPractitioner } from '@/lib/data/practitioners';

export const metadata = { title: 'Mes avis — AURA' };

// Subset authored by "Sarah" — reuse review data and attach a practitioner.
const MINE = ['r1', 'r3', 'r5', 'r8'];

export default function AvisPage() {
  const mine = MINE.map((id) => reviews.find((r) => r.id === id)).filter(Boolean);

  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Mes avis</h1>
        <p className="lead" style={{ marginTop: 4 }}>Vos retours aident toute la <span className="serif italic accent">communauté</span> à choisir.</p>
      </header>

      <div className="stack gap-3">
        {mine.map((r) => {
          const p = getPractitioner(r.practitionerId);
          return (
            <div key={r.id} className="card card-pad">
              <div className="row gap-3 between" style={{ alignItems: 'flex-start' }}>
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <Avatar src={p.photo} name={p.name} tone={p.tone} size={48} />
                  <div>
                    <Link href={`/praticien/${p.id}`} className="h-4" style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</Link>
                    <div className="row gap-2 small"><span>{p.specialties[0]}</span><span style={{ opacity: 0.5 }}>•</span><span>{r.mode}</span></div>
                  </div>
                </div>
                <Badge variant={r.status === 'published' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}>
                  {r.status === 'published' ? 'Publié' : r.status === 'pending' ? 'En attente' : 'Signalé'}
                </Badge>
              </div>
              <div className="row gap-2 mt-3"><Rating value={r.rating} showCount={false} size={15} /><span className="tiny muted">{r.when}</span></div>
              <p className="body mt-2" style={{ fontStyle: 'italic' }}>« {r.text} »</p>
              <div className="divider" />
              <div className="row gap-2">
                <ModalButton modal="review" payload={{ name: p.name }} className="btn btn-soft btn-sm"><Icon name="edit" size={14} /> Modifier</ModalButton>
                <ModalButton modal="deleteItem" payload={{ title: 'Supprimer cet avis', message: `Supprimer définitivement votre avis sur ${p.name} ?`, confirmLabel: 'Supprimer', danger: true, successToast: 'Avis supprimé' }} className="btn btn-danger-soft btn-sm"><Icon name="trash" size={14} /> Supprimer</ModalButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
