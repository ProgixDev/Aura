import Link from 'next/link';
import { Lotus } from '@/components/ui/Lotus';
import { NewsletterField } from './NewsletterField';

const COLS = [
  { h: 'Découvrir', links: [['/praticiens', 'Praticiens'], ['/disciplines', 'Disciplines'], ['/evenements', 'Événements'], ['/cercles', 'Cercles'], ['/temoignages', 'Témoignages']] },
  { h: 'Praticiens', links: [['/devenir-praticien', 'Devenir praticien'], ['/tarifs', 'Tarifs'], ['/confiance-securite', 'Confiance & sécurité'], ['/aide', "Centre d'aide"]] },
  { h: 'GuériEnergies', links: [['/a-propos', 'À propos'], ['/manifeste', 'Manifeste'], ['/blog', 'Journal'], ['/presse', 'Presse'], ['/carrieres', 'Carrières'], ['/contact', 'Contact']] },
  { h: 'Légal', links: [['/cgu', "Conditions d'utilisation"], ['/confidentialite', 'Confidentialité'], ['/cookies', 'Cookies'], ['/mentions-legales', 'Mentions légales']] },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="cols">
          <div>
            <div className="brand"><Lotus size={28} color="#fff" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />GuériEnergies</div>
            <p className="small" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 280, marginBottom: 20 }}>
              Tous les guérisseurs, un seul lieu de confiance. Trouvez un praticien vérifié du bien-être énergétique partout en France.
            </p>
            <NewsletterField />
          </div>
          {COLS.map((c) => (
            <div key={c.h}>
              <h5>{c.h}</h5>
              <div className="col-links">
                {c.links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
              </div>
            </div>
          ))}
        </div>
        <div className="legal">
          <span>© 2026 GuériEnergies — Fait avec soin en France.</span>
          <span className="row gap-4">
            <Link href="/application">Application mobile</Link>
            <Link href="/admin">Espace admin</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
