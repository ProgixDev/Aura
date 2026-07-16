'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { mapEvent } from '@/lib/data/event-adapter';
import { num } from '@/lib/format';
import { PractitionerCard } from '@/components/cards/PractitionerCard';
import { DisciplineTile } from '@/components/cards/DisciplineTile';
import { EventCard } from '@/components/cards/EventCard';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

const STEPS = [
  { n: '01', t: 'Cherchez en confiance', d: "Filtrez par discipline, ville, modalité. Chaque praticien est vérifié : diplômes, assurance, identité." },
  { n: '02', t: 'Échangez avant de réserver', d: 'Posez vos questions dans la messagerie sécurisée. Les paiements ne se font jamais en privé.' },
  { n: '03', t: 'Réservez et vivez la séance', d: 'Choisissez un créneau, payez en sécurité. Annulation gratuite jusqu’à 24h avant.' },
];
const VALUES = [
  { i: 'shield', t: 'Praticiens vérifiés', d: 'Documents contrôlés un par un. Le badge Vérifiée se mérite.' },
  { i: 'message', t: 'Paiement protégé', d: "L'argent n'est versé qu'après la séance. Litige ? Nous tranchons." },
  { i: 'heart', t: 'Sans jugement', d: 'Un espace doux, respectueux, pour celles et ceux qui cherchent.' },
];

// Discipline rows come back with French field names (nom/tonalite/glyphe) and no
// praticien-count aggregate — map to what DisciplineTile renders, leaving count
// absent (DisciplineTile hides that line rather than showing an invented number).
function mapDiscipline(row) {
  return { slug: row.slug, name: row.nom, tone: row.tonalite, glyph: row.glyphe };
}

export default function HomePage() {
  const { data: praticiensRes } = useQuery({
    queryKey: ['praticiens', 'home-featured'],
    queryFn: () => api.get('/praticiens?per_page=3'),
  });
  const featured = (praticiensRes?.data ?? []).map(mapPraticien);

  const { data: disciplinesRes } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const disciplineTiles = (disciplinesRes?.data ?? []).slice(0, 8).map(mapDiscipline);

  const { data: eventsRes } = useQuery({
    queryKey: ['events', 'home-featured'],
    queryFn: () => api.get('/events?status=publié&per_page=3'),
  });
  const featuredEvents = (eventsRes?.data ?? []).map(mapEvent);

  const { data: statsRes } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/stats'),
  });
  const stats = statsRes?.data ?? { praticiens_verifies: 0, seances: 0, satisfaction: 0, villes: 0 };
  const heroStats = [
    [`${num(stats.praticiens_verifies)}+`, 'praticiens vérifiés'],
    [num(stats.seances), 'séances réservées'],
    [`${num(stats.satisfaction)} / 5`, 'satisfaction'],
  ];

  return (
    <>
      {/* HERO */}
      <section className="aurora-dark grain" style={{ '--orb-x': '60%', '--orb-y': '12%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '120px 0 130px', textAlign: 'center' }}>
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>La plateforme du soin énergétique</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Tous les guérisseurs,<br />un seul lieu de <span className="italic" style={{ color: 'var(--violet)' }}>confiance</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto 32px' }}>
            Magnétisme, Reiki, hypnose, chamanisme… Trouvez un praticien vérifié près de chez vous, échangez, réservez — en toute sérénité.
          </p>
          <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/praticiens" className="btn btn-aurora btn-lg">Trouver un praticien</Link>
            <Link href="/devenir-praticien" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Je suis praticien</Link>
          </div>
          <div className="row gap-6" style={{ justifyContent: 'center', marginTop: 44, color: 'rgba(255,255,255,0.75)', flexWrap: 'wrap' }}>
            {heroStats.map(([v, l]) => (
              <div key={l} className="center"><div className="serif" style={{ fontSize: 30, color: '#fff' }}>{v}</div><div className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {VALUES.map((v) => (
              <div key={v.t} className="card card-pad">
                <span className="tile-icon tint-violet" style={{ marginBottom: 14 }}><Icon name={v.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-3" style={{ marginBottom: 6 }}>{v.t}</h3>
                <p className="body">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DISCIPLINES */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Explorer</span><h2 className="h-2" style={{ marginTop: 8 }}>Par discipline</h2></div>
            <Link href="/disciplines" className="more">Toutes les disciplines →</Link>
          </div>
          <div className="grid grid-4">
            {disciplineTiles.map((d) => <DisciplineTile key={d.slug} d={d} />)}
          </div>
        </div>
      </section>

      {/* FEATURED PRACTITIONERS */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Sélection</span><h2 className="h-2" style={{ marginTop: 8 }}>Praticiens à la une</h2></div>
            <Link href="/praticiens" className="more">Voir tous →</Link>
          </div>
          <div className="grid" style={{ gap: 16 }}>
            {featured.map((p) => <PractitionerCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="center" style={{ marginBottom: 48 }}>
            <span className="eyebrow">Simple et sûr</span>
            <h2 className="h-1" style={{ marginTop: 10 }}>Comment ça marche</h2>
          </div>
          <div className="grid grid-3">
            {STEPS.map((s) => (
              <div key={s.n} className="stack">
                <span className="serif italic accent" style={{ fontSize: 40 }}>{s.n}</span>
                <h3 className="h-3" style={{ margin: '8px 0 6px' }}>{s.t}</h3>
                <p className="body">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 40 }}>
            <Link href="/comment-ca-marche" className="btn btn-primary">En savoir plus</Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="section">
        <div className="container-narrow center">
          <Rating value={5} showCount={false} size={20} />
          <p className="serif" style={{ fontSize: 'clamp(24px,3.4vw,38px)', lineHeight: 1.3, margin: '20px 0 28px', fontWeight: 400 }}>
            « J’arrivais nouée, je suis sortie posée. Aura m’a permis de trouver quelqu’un de confiance, sans avoir à fouiller des heures. »
          </p>
          <div className="row gap-3" style={{ justifyContent: 'center' }}>
            <Avatar name="Marie B." size={44} tone="sky" />
            <div style={{ textAlign: 'left' }}><div style={{ fontWeight: 500 }}>Marie B.</div><div className="small">Annecy · cliente depuis 2024</div></div>
          </div>
          <div style={{ marginTop: 24 }}><Link href="/temoignages" className="more">Lire d’autres témoignages →</Link></div>
        </div>
      </section>

      {/* EVENTS */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Agenda</span><h2 className="h-2" style={{ marginTop: 8 }}>Retraites & événements</h2></div>
            <Link href="/evenements" className="more">Tout l’agenda →</Link>
          </div>
          <div className="grid grid-3">
            {featuredEvents.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '20%', '--orb-y': '30%', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Prêt·e à prendre soin de vous ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>Créez votre compte gratuitement et trouvez le praticien qui vous correspond.</p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="signup" className="btn btn-aurora btn-lg">Créer mon compte</ModalButton>
              <Link href="/application" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Télécharger l’app</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
