import Link from 'next/link';
import { jobs, values } from '@/lib/data/content';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';

export const metadata = { title: 'Carrières — GuériEnergies' };

const PERKS = [
  { i: 'home', t: 'Télétravail souple', d: 'Travaillez d’où vous êtes, avec des temps de rencontre réguliers.' },
  { i: 'heart', t: 'Bien-être pris au sérieux', d: 'Crédit séances GuériEnergies offert et journées de respiration.' },
  { i: 'chart', t: 'Croissance partagée', d: 'BSPCE pour tous, et un vrai plan d’évolution.' },
  { i: 'calendar', t: '6 semaines de congés', d: 'Plus les ponts. On ne plaisante pas avec le repos.' },
  { i: 'book', t: 'Budget apprentissage', d: '1 500 € / an pour vous former, lire, vous équiper.' },
  { i: 'users', t: 'Équipe à taille humaine', d: 'Moins de 40 personnes, des décisions rapides, du sens.' },
];

const applyFields = (title) => ([
  { name: 'name', label: 'Nom complet', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'linkedin', label: 'Profil LinkedIn ou portfolio', type: 'text' },
  { name: 'motivation', label: `Pourquoi le poste « ${title} » ?`, type: 'textarea', required: true },
]);

export default function CarrieresPage() {
  return (
    <>
      <section className="aurora-dark grain" style={{ '--orb-x': '30%', '--orb-y': '22%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '96px 0 100px' }}>
        <div className="container-narrow reveal center">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Rejoindre GuériEnergies</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '18px 0 18px' }}>
            Construire un soin <span className="italic" style={{ color: 'var(--violet)' }}>de confiance</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto' }}>
            Nous bâtissons la plateforme de référence du bien-être énergétique. Avec rigueur sur les faits, douceur dans la forme — et des gens qui y croient.
          </p>
        </div>
      </section>

      {/* CULTURE / VALUES */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 44 }}>
            <span className="eyebrow">Notre culture</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Ce qui nous guide</h2>
          </div>
          <div className="grid grid-4">
            {values.map((v) => (
              <div key={v.t} className="card card-pad stack" style={{ gap: 10 }}>
                <span className="tile-icon tint-violet"><Icon name={v.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-4">{v.t}</h3>
                <p className="small">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPEN ROLES */}
      <section className="section-sm" style={{ background: 'var(--mist)' }}>
        <div className="container-narrow">
          <div className="section-head">
            <div><span className="eyebrow">On recrute</span><h2 className="h-2" style={{ marginTop: 8 }}>Postes ouverts</h2></div>
            <span className="more" style={{ pointerEvents: 'none' }}>{jobs.length} offres</span>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {jobs.map((j) => (
              <div key={j.id} className="card card-pad row between" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div className="row gap-2" style={{ marginBottom: 6 }}>
                    <Badge variant="info">{j.team}</Badge>
                    <Badge variant="neutral">{j.type}</Badge>
                  </div>
                  <h3 className="h-4" style={{ marginBottom: 4 }}>{j.title}</h3>
                  <p className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="pin" size={14} color="var(--muted)" /> {j.location}
                  </p>
                </div>
                <ModalButton
                  modal="form"
                  payload={{ title: `Postuler — ${j.title}`, fields: applyFields(j.title), submitLabel: 'Envoyer ma candidature', successToast: 'Candidature envoyée — merci, on revient vite vers vous !' }}
                  className="btn btn-primary"
                >
                  Postuler
                </ModalButton>
              </div>
            ))}
          </div>
          <div className="card card-pad center mt-4" style={{ marginTop: 24 }}>
            <p className="body" style={{ marginBottom: 12 }}>Aucun poste ne correspond, mais vous adorez ce qu’on fait ?</p>
            <ModalButton
              modal="form"
              payload={{ title: 'Candidature spontanée', fields: applyFields('candidature spontanée'), submitLabel: 'Envoyer', successToast: 'Merci ! Nous gardons votre profil précieusement.' }}
              className="btn btn-soft"
            >
              Candidature spontanée
            </ModalButton>
          </div>
        </div>
      </section>

      {/* PERKS */}
      <section className="section">
        <div className="container">
          <div className="center" style={{ marginBottom: 44 }}>
            <span className="eyebrow">Avantages</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Prendre soin de celles et ceux qui prennent soin</h2>
          </div>
          <div className="grid grid-3">
            {PERKS.map((p) => (
              <div key={p.t} className="card-line card-pad stack" style={{ gap: 8 }}>
                <Icon name={p.i} size={20} color="var(--violet-2)" />
                <h3 className="h-4">{p.t}</h3>
                <p className="small">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
