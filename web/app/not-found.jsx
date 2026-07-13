import Link from 'next/link';
import { Lotus } from '@/components/ui/Lotus';

export default function NotFound() {
  return (
    <section className="aurora-dark grain" style={{ '--orb-x': '50%', '--orb-y': '30%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 0' }}>
      <div className="container-narrow reveal">
        <div className="row" style={{ justifyContent: 'center', marginBottom: 22 }}>
          <span style={{ display: 'inline-flex', padding: 18, borderRadius: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <Lotus size={28} color="#fff" />
          </span>
        </div>
        <div className="serif italic" style={{ fontSize: 'clamp(64px,12vw,120px)', lineHeight: 1, color: 'var(--violet)' }}>404</div>
        <h1 className="h-1" style={{ color: '#fff', margin: '14px 0 12px' }}>Page introuvable</h1>
        <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 460, margin: '0 auto 30px' }}>
          La page que vous cherchez s’est évaporée, comme une volute d’encens. Reprenons en douceur.
        </p>
        <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" className="btn btn-aurora btn-lg">Retour à l’accueil</Link>
          <Link href="/praticiens" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Voir les praticiens</Link>
        </div>
        <div style={{ marginTop: 28 }}>
          <Link href="/aide" className="more" style={{ color: 'rgba(255,255,255,0.75)' }}>Besoin d’aide ? Visitez le centre d’aide →</Link>
        </div>
      </div>
    </section>
  );
}
