'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapEvent } from '@/lib/data/event-adapter';
import { EventCard } from '@/components/cards/EventCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

const KINDS = ['Tous', 'Retraites', 'Ateliers', 'Cercles', 'Formations', 'Sorties'];

export default function EvenementsPage() {
  const { data } = useQuery({
    queryKey: ['events', 'public'],
    queryFn: () => api.get('/events?status=publié&per_page=50'),
  });
  const events = (data?.data ?? []).map(mapEvent);

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '64%', '--orb-y': '16%', '--orb-1': '#A8C8E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}
      >
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Agenda</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Retraites & <span className="italic" style={{ color: 'var(--violet)' }}>événements</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto' }}>
            Des parenthèses pour reposer le système nerveux : retraites en nature, bains sonores, cercles de parole, ateliers. Encadrés par des praticiens vérifiés.
          </p>
        </div>
      </section>

      {/* FILTER CHIPS */}
      <section className="section-sm" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="row wrap gap-2">
            {KINDS.map((k, i) => (
              <span key={k} className={`chip ${i === 0 ? 'active' : ''}`}>{k}</span>
            ))}
            <Link href="/cercles" className="chip tone-violet" style={{ marginLeft: 'auto' }}>
              <Icon name="users" size={13} color="var(--violet-2)" /> Rejoindre un cercle
            </Link>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Prochainement</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>{events.length} rendez-vous à venir</h2>
            </div>
          </div>
          <div className="grid grid-3">
            {events.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </div>
      </section>

      {/* CERCLES TEASER */}
      <section className="section-sm">
        <div className="container">
          <div className="card card-pad row between wrap gap-4" style={{ alignItems: 'center' }}>
            <div className="flex-1" style={{ minWidth: 280 }}>
              <span className="eyebrow">Communauté</span>
              <h2 className="h-3" style={{ margin: '8px 0 6px' }}>Les cercles Aura</h2>
              <p className="body">Au-delà des événements ponctuels, prolongez la rencontre dans nos cercles : des espaces de partage continus, en ligne et en présentiel.</p>
            </div>
            <Link href="/cercles" className="btn btn-primary">Découvrir les cercles</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '24%', '--orb-y': '32%', '--orb-1': '#E4C896', '--orb-2': '#7B5FCF', padding: 'clamp(40px,6vw,68px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Vous organisez un événement ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 500, margin: '0 auto 28px' }}>
              Praticiens vérifiés : proposez vos retraites, ateliers et cercles à toute la communauté Aura.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton
                modal="form"
                payload={{ title: 'Proposer un événement', fields: [{ name: 'title', label: 'Titre de l’événement', type: 'text', required: true }, { name: 'kind', label: 'Type', type: 'select', options: ['Retraite', 'Atelier', 'Cercle', 'Formation', 'Sortie'], required: true }, { name: 'place', label: 'Lieu', type: 'text', required: true }, { name: 'date', label: 'Date', type: 'text' }, { name: 'desc', label: 'Description', type: 'textarea' }], submitLabel: 'Soumettre', successToast: 'Événement soumis — nous revenons vers vous sous 48h.' }}
                className="btn btn-aurora btn-lg"
              >
                Proposer un événement
              </ModalButton>
              <Link href="/devenir-praticien" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Devenir praticien</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
