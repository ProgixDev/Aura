import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { Rating } from '@/components/ui/Rating';
import { ToastButton } from '@/components/ui/ToastButton';

export const metadata = { title: 'L’application Aura' };

const FEATURES = [
  { i: 'search', t: 'Trouvez en un geste', d: 'Filtrez par discipline, ville et modalité. Les praticiens vérifiés d’abord.' },
  { i: 'message', t: 'Échangez en sécurité', d: 'Messagerie chiffrée pour poser vos questions avant de réserver.' },
  { i: 'calendar', t: 'Réservez en deux taps', d: 'Choisissez un créneau, payez, c’est confirmé. Annulation gratuite jusqu’à 24h.' },
  { i: 'bell', t: 'Rappels bienveillants', d: 'Notifications douces avant vos séances, sans jamais vous presser.' },
  { i: 'heart', t: 'Vos favoris à portée', d: 'Gardez vos praticiens et événements préférés, synchronisés partout.' },
  { i: 'shield', t: 'Paiement protégé', d: 'L’argent n’est versé qu’après la séance. Litige ? On tranche.' },
];

export default function ApplicationPage() {
  return (
    <>
      <section className="aurora-dark grain" style={{ '--orb-x': '85%', '--orb-y': '24%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '100px 0 110px' }}>
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: '1.1fr 0.9fr', gap: 40, alignItems: 'center' }}>
            <div className="reveal">
              <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Application mobile</span>
              <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 18px' }}>
                Aura, dans votre <span className="italic" style={{ color: 'var(--violet)' }}>poche</span>.
              </h1>
              <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 480, marginBottom: 30 }}>
                Trouvez, échangez, réservez — partout, à tout moment. L’expérience Aura, pensée pour le calme et la confiance.
              </p>
              <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
                <ToastButton message="Lien App Store envoyé." tone="success" className="btn btn-aurora btn-lg">
                  <Icon name="download" size={16} /> App Store
                </ToastButton>
                <ToastButton message="Lien Google Play envoyé." tone="success" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <Icon name="download" size={16} /> Google Play
                </ToastButton>
              </div>
              <div className="row gap-3" style={{ marginTop: 28, color: 'rgba(255,255,255,0.78)' }}>
                <Rating value={4.9} showCount={false} size={16} />
                <span className="small" style={{ color: 'rgba(255,255,255,0.7)' }}>4,9 / 5 · 12 000+ avis</span>
              </div>
            </div>

            {/* PHONE MOCKUP */}
            <div className="reveal r-2" style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="glass" style={{ width: 270, borderRadius: 38, padding: 14, border: '1px solid rgba(255,255,255,0.25)' }}>
                <div style={{ background: 'var(--pearl)', borderRadius: 28, overflow: 'hidden' }}>
                  <div className="aurora-dark grain" style={{ '--orb-x': '50%', '--orb-y': '20%', padding: '26px 18px 22px' }}>
                    <div className="row gap-2" style={{ marginBottom: 14 }}>
                      <Lotus size={18} color="#fff" />
                      <span className="serif" style={{ color: '#fff', fontSize: 18 }}>Aura</span>
                    </div>
                    <div className="serif" style={{ color: '#fff', fontSize: 22, lineHeight: 1.25 }}>Bonjour Camille,<br /><span className="italic" style={{ color: 'var(--violet)' }}>respirez</span>.</div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <div className="card-line card-pad" style={{ marginBottom: 12 }}>
                      <div className="tiny muted" style={{ marginBottom: 4 }}>Prochaine séance</div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>Reiki · Élodie M.</div>
                      <div className="row gap-2 mt-1"><Icon name="calendar" size={13} color="var(--muted)" /><span className="tiny">Demain · 14h30</span></div>
                    </div>
                    {['Magnétisme', 'Hypnose', 'Sonothérapie'].map((d, i) => (
                      <div key={d} className="row between" style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                        <span style={{ fontSize: 14 }}>{d}</span>
                        <Icon name="chevronRight" size={15} color="var(--muted)" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 44 }}>
            <span className="eyebrow">Pensée pour vous</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Tout ce qu’il faut, rien de trop</h2>
          </div>
          <div className="grid grid-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="card card-pad stack" style={{ gap: 10 }}>
                <span className="tile-icon tint-violet"><Icon name={f.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-4">{f.t}</h3>
                <p className="small">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-sm">
        <div className="container-narrow center">
          <h2 className="h-2" style={{ marginBottom: 12 }}>Disponible sur iOS et Android</h2>
          <p className="body" style={{ marginBottom: 24 }}>Gratuite, sans publicité, conçue avec soin.</p>
          <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <ToastButton message="Lien App Store envoyé." tone="success" className="btn btn-primary btn-lg"><Icon name="download" size={16} /> App Store</ToastButton>
            <ToastButton message="Lien Google Play envoyé." tone="success" className="btn btn-soft btn-lg"><Icon name="download" size={16} /> Google Play</ToastButton>
          </div>
          <div className="mt-3"><Link href="/" className="more">Découvrir Aura sur le web →</Link></div>
        </div>
      </section>
    </>
  );
}
