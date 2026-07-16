'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { BookingFlow } from './BookingFlow';

export default function ReserverPage({ params }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['praticien', id],
    queryFn: () => api.get(`/praticiens/${id}`),
  });

  if (!isLoading && !data?.data) {
    return (
      <section className="section">
        <div className="container-narrow center">
          <h1 className="h-2">Praticien introuvable</h1>
          <p className="lead mt-2">Ce profil n’existe pas ou n’est plus disponible.</p>
          <Link href="/praticiens" className="btn btn-primary mt-4">Voir tous les praticiens</Link>
        </div>
      </section>
    );
  }
  if (!data?.data) return null;

  return <BookingFlow p={mapPraticien(data.data)} />;
}
