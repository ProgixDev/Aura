import AvisList from './AvisList';

export const metadata = { title: 'Mes avis — GUÉRIENERGIES' };

export default function AvisPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Mes avis</h1>
        <p className="lead" style={{ marginTop: 4 }}>Vos retours aident toute la <span className="serif italic accent">communauté</span> à choisir.</p>
      </header>

      <AvisList />
    </div>
  );
}
