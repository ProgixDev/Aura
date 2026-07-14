'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/ui/Icon';
import { useUI } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';

export function FavoriteButton({ praticienId, style }) {
  const queryClient = useQueryClient();
  const toast = useUI((s) => s.toast);
  const openModal = useUI((s) => s.openModal);
  const isLoggedIn = useAuthStore((s) => !!s.token);
  const [pending, setPending] = useState(false);

  const { data: res } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/client/favorites'),
    enabled: isLoggedIn,
  });
  const favorites = res?.data ?? [];
  const isFavorite = favorites.some((f) => f.praticien_id === Number(praticienId));

  const toggle = async () => {
    if (!isLoggedIn) { openModal('login'); return; }
    if (pending) return;
    setPending(true);
    try {
      if (isFavorite) {
        await api.del(`/client/favorites/${praticienId}`);
        toast('Retiré des favoris', 'success');
      } else {
        await api.post('/client/favorites', { praticien_id: Number(praticienId) });
        toast('Ajouté aux favoris', 'success');
      }
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (err) {
      toast(err?.message || 'Une erreur est survenue', 'danger');
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-icon"
      style={style}
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Icon name="heart" size={18} color={isFavorite ? 'var(--violet-2)' : undefined} />
    </button>
  );
}

export default FavoriteButton;
