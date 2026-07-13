import Link from 'next/link';
import { practitioners, getPractitioner } from '@/lib/data/practitioners';
import { BookingFlow } from './BookingFlow';

export function generateStaticParams() {
  return practitioners.map((p) => ({ id: p.id }));
}

export default async function ReserverPage({ params }) {
  const { id } = await params;
  const p = getPractitioner(id);

  if (!p) {
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

  return <BookingFlow p={p} />;
}
