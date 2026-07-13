import { bookings } from '@/lib/data/admin';
import ReservationsBody from './ReservationsBody';

export const metadata = { title: 'Mes réservations — AURA' };

export default function ReservationsPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Mes réservations</h1>
        <p className="lead" style={{ marginTop: 4 }}>Vos séances <span className="serif italic accent">à venir</span> et votre historique.</p>
      </header>

      <ReservationsBody bookings={bookings} />
    </div>
  );
}
