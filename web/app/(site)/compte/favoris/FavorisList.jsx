'use client';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';

export default function FavorisList() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/client/favorites'),
  });
  const favs = (res?.data ?? []).map((f) => mapPraticien(f.praticien));

  const remove = async (id) => {
    await api.del(`/client/favorites/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  if (isLoading) return <div className="empty">Chargement…</div>;

  if (favs.length === 0) {
    return (
      <div className="empty">
        <Icon name="heart" size={28} color="var(--muted)" />
        <p className="mt-2">Vous n'avez pas encore de favoris.</p>
        <Button href="/praticiens" variant="primary" size="sm">Découvrir les praticiens</Button>
      </div>
    );
  }

  return (
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
              <button type="button" className="btn btn-icon btn-ghost" title="Retirer des favoris" onClick={() => remove(p.id)}>
                <Icon name="heart" size={16} color="var(--violet-2)" />
              </button>
              <Button href={`/praticien/${p.id}`} variant="primary" size="sm">Réserver</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
