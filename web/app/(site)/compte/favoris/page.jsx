import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import FavorisList from './FavorisList';

export const metadata = { title: 'Mes favoris — GUÉRIENERGIES' };

export default function FavorisPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1 row between wrap gap-3">
        <div>
          <h1 className="h-1">Mes favoris</h1>
          <p className="lead" style={{ marginTop: 4 }}>Les praticiens que vous gardez <span className="serif italic accent">près du cœur</span>.</p>
        </div>
        <Button href="/praticiens" variant="soft" size="sm"><Icon name="search" size={15} /> Explorer</Button>
      </header>

      <FavorisList />
    </div>
  );
}
