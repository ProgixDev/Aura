import Link from 'next/link';
import { pressItems } from '@/lib/data/content';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

export const metadata = { title: 'Presse — GuériEnergies' };

const FACTS = [
  ['2 400+', 'praticiens vérifiés'],
  ['48 000', 'séances réservées'],
  ['18', 'disciplines référencées'],
  ['2024', 'année de création'],
];

const ASSETS = [
  { t: 'Logos & symboles', d: 'Logotype, monogramme Lotus, déclinaisons.', i: 'sparkle', toast: 'Logos téléchargés (SVG + PNG).' },
  { t: 'Palette & typographies', d: 'Couleurs de marque, Cormorant & Outfit.', i: 'grid', toast: 'Charte graphique téléchargée.' },
  { t: 'Photos & captures', d: 'Visuels de l’app et de la plateforme.', i: 'layers', toast: 'Pack visuels téléchargé.' },
];

export default function PressePage() {
  return (
    <>
      <section className="aurora-dark grain" style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '92px 0 96px' }}>
        <div className="container-narrow reveal center">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Espace presse</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 18px' }}>
            GuériEnergies dans les <span className="italic" style={{ color: 'var(--violet)' }}>médias</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 540, margin: '0 auto 30px' }}>
            La plateforme qui structure et sécurise le soin énergétique en France. Ressources, chiffres et contacts pour les journalistes.
          </p>
          <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <ToastButton message="Kit de presse téléchargé (.zip)" tone="success" className="btn btn-aurora btn-lg">Télécharger le kit presse</ToastButton>
            <a href="mailto:presse@aura.fr" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Contacter le service presse</a>
          </div>
        </div>
      </section>

      {/* FACTS */}
      <section className="section-sm">
        <div className="container">
          <div className="grid grid-4">
            {FACTS.map(([v, l]) => (
              <div key={l} className="card card-pad center">
                <div className="serif accent" style={{ fontSize: 38 }}>{v}</div>
                <div className="small">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MENTIONS */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Ils en parlent</span><h2 className="h-2" style={{ marginTop: 8 }}>Revue de presse</h2></div>
          </div>
          <div className="grid grid-2" style={{ gap: 16 }}>
            {pressItems.map((p) => (
              <div key={p.id} className={`card card-pad card-hover tint-${p.tone}`}>
                <div className="row between" style={{ marginBottom: 12 }}>
                  <span className="serif italic" style={{ fontSize: 22 }}>{p.outlet}</span>
                  <span className="tiny muted">{p.date}</span>
                </div>
                <h3 className="h-3" style={{ marginBottom: 14 }}>« {p.title} »</h3>
                <ToastButton message={`Article « ${p.outlet} » ouvert.`} tone="success" className="btn btn-link btn-sm" style={{ padding: 0 }}>
                  Lire l’article →
                </ToastButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ASSETS */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Ressources</span><h2 className="h-2" style={{ marginTop: 8 }}>Éléments de marque</h2></div>
          </div>
          <div className="grid grid-3">
            {ASSETS.map((a) => (
              <div key={a.t} className="card card-pad stack" style={{ gap: 10 }}>
                <span className="tile-icon tint-violet"><Icon name={a.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-4">{a.t}</h3>
                <p className="small flex-1">{a.d}</p>
                <ToastButton message={a.toast} tone="success" className="btn btn-soft btn-sm">
                  <Icon name="download" size={14} /> Télécharger
                </ToastButton>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT PRESSE */}
      <section className="section">
        <div className="container-narrow">
          <div className="card card-pad row between" style={{ flexWrap: 'wrap', gap: 20 }}>
            <div>
              <span className="eyebrow">Contact presse</span>
              <h2 className="h-3" style={{ margin: '6px 0 4px' }}>Élise Tavernier</h2>
              <p className="small">Relations médias — réponse sous 24h.</p>
              <p className="serif italic accent mt-1">presse@aura.fr · +33 1 84 80 00 00</p>
            </div>
            <div className="row gap-3">
              <a href="mailto:presse@aura.fr" className="btn btn-primary">Écrire à l’équipe presse</a>
              <Link href="/contact" className="btn btn-ghost">Autres demandes</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
