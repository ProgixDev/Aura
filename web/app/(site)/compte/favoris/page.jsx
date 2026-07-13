import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ToastButton } from '@/components/ui/ToastButton';
import { practitioners } from '@/lib/data/practitioners';

export const metadata = { title: 'Mes favoris — AURA' };

const FAV_IDS = ['p1', 'p3', 'p2', 'p5', 'p8'];

export default function FavorisPage() {
  const favs = FAV_IDS.map((id) => practitioners.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="stack gap-5">
      <header className="reveal r-1 row between wrap gap-3">
        <div>
          <h1 className="h-1">Mes favoris</h1>
          <p className="lead" style={{ marginTop: 4 }}>Les praticiens que vous gardez <span className="serif italic accent">près du cœur</span>.</p>
        </div>
        <Button href="/praticiens" variant="soft" size="sm"><Icon name="search" size={15} /> Explorer</Button>
      </header>

      {favs.length ? (
        <div className="grid grid-2">
          {favs.map((p) => (
            <div key={p.id} className="card card-pad">
              <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                <Avatar src={p.photo} name={p.name} tone={p.tone} size={64} online={p.online} />
                <div className="flex-1">
                  <div className="row gap-2" style={{ marginBottom: 2 }}>
                    <Link href={`/praticien/${p.id}`} className="h-4" style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</Link>
                    {p.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
                  </div>
                  <div className="small" style={{ marginBottom: 6 }}>{p.specialties.join(' · ')}</div>
                  <Rating value={p.rating} count={p.reviews} size={13} />
                  <div className="row gap-2 small mt-2"><Icon name="pin" size={13} color="var(--muted)" />{p.city} · {p.mode}</div>
                </div>
              </div>
              <div className="divider" />
              <div className="row gap-2 between">
                <span className="price" style={{ fontSize: 18 }}>{p.price}€<small>/séance</small></span>
                <div className="row gap-2">
                  <ToastButton message={`${p.name} retiré des favoris`} tone="danger" className="btn btn-icon btn-ghost" title="Retirer"><Icon name="heart" size={16} color="var(--violet-2)" /></ToastButton>
                  <Button href={`/praticien/${p.id}`} variant="primary" size="sm">Réserver</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Icon name="heart" size={28} color="var(--muted)" />
          <p className="mt-2">Vous n'avez pas encore de favoris.</p>
          <Button href="/praticiens" variant="primary" size="sm">Découvrir les praticiens</Button>
        </div>
      )}
    </div>
  );
}
