'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { PractitionerCard } from '@/components/cards/PractitionerCard';
import { ModalButton } from '@/components/ui/ModalButton';
import { Icon } from '@/components/ui/Icon';

const MODES = [
  { key: 'all', label: 'Toutes modalités' },
  { key: 'présentiel', label: 'Présentiel' },
  { key: 'visio', label: 'Visio' },
];

const SORTS = [
  { key: 'pertinence', label: 'Pertinence' },
  { key: 'prix', label: 'Prix croissant' },
  { key: 'note', label: 'Mieux notés' },
];

export default function PraticiensPage() {
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('all');
  const [mode, setMode] = useState('all');
  const [sort, setSort] = useState('pertinence');

  const { data: praticiensRes } = useQuery({
    queryKey: ['praticiens'],
    queryFn: () => api.get('/praticiens?per_page=50'),
  });
  const practitioners = useMemo(
    () => (praticiensRes?.data ?? []).map(mapPraticien),
    [praticiensRes],
  );

  const { data: disciplinesRes } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const chips = (disciplinesRes?.data ?? []).slice(0, 8);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = practitioners.filter((p) => {
      if (discipline !== 'all' && !p.specialties.includes(discipline) && p.extraSpecialty !== discipline) return false;
      if (mode !== 'all' && !p.mode.toLowerCase().includes(mode)) return false;
      if (q) {
        const hay = [p.name, p.city, ...p.specialties, p.extraSpecialty || ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'prix') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'note') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [practitioners, query, discipline, mode, sort]);

  return (
    <>
      {/* INTRO HERO */}
      <section className="section-sm" style={{ paddingBottom: 0 }}>
        <div className="container reveal">
          <span className="eyebrow">L'annuaire GUÉRIENERGIES</span>
          <h1 className="h-1" style={{ margin: '12px 0 14px' }}>
            Trouver un <span className="italic accent">praticien</span>
          </h1>
          <p className="lead" style={{ maxWidth: 560 }}>
            {practitioners.length} praticiens vérifiés en France. Filtrez par discipline,
            modalité et ressenti — chaque profil est contrôlé un par un.
          </p>
        </div>
      </section>

      {/* STICKY SEARCH + FILTERS */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(251,249,246,0.86)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--line)', marginTop: 28,
        }}
      >
        <div className="container" style={{ padding: '16px 0' }}>
          <div className="row gap-2 wrap">
            <div className="row gap-2 flex-1" style={{ position: 'relative', minWidth: 240 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Icon name="search" size={16} color="var(--muted)" />
              </span>
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Discipline, ville, nom…"
                style={{ paddingLeft: 40, width: '100%' }}
              />
            </div>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: 180 }}>
              {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 180 }}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <ModalButton modal="filters" className="btn btn-soft" as="button">
              <Icon name="filter" size={15} /> Filtres
            </ModalButton>
          </div>

          {/* DISCIPLINE CHIPS */}
          <div className="row gap-2 wrap" style={{ marginTop: 14 }}>
            <button
              type="button"
              className={`chip${discipline === 'all' ? ' active' : ''}`}
              onClick={() => setDiscipline('all')}
            >
              Toutes
            </button>
            {chips.map((d) => (
              <button
                key={d.slug}
                type="button"
                className={`chip tone-${d.tonalite}${discipline === d.nom ? ' active' : ''}`}
                onClick={() => setDiscipline(discipline === d.nom ? 'all' : d.nom)}
              >
                {d.nom}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <section className="section-sm">
        <div className="container">
          <div className="between" style={{ marginBottom: 18 }}>
            <p className="small muted">
              <strong style={{ color: 'var(--ink)' }}>{results.length}</strong>{' '}
              {results.length > 1 ? 'praticiens trouvés' : 'praticien trouvé'}
              {discipline !== 'all' && <> en <span className="italic accent">{discipline}</span></>}
            </p>
            {(discipline !== 'all' || mode !== 'all' || query) && (
              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={() => { setQuery(''); setDiscipline('all'); setMode('all'); }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="empty card card-pad center">
              <span className="tile-icon tint-violet" style={{ margin: '0 auto 14px' }}>
                <Icon name="search" size={20} color="var(--violet-2)" />
              </span>
              <h3 className="h-3" style={{ marginBottom: 6 }}>Aucun praticien ne correspond</h3>
              <p className="body">Essayez d'élargir vos critères ou de réinitialiser les filtres.</p>
            </div>
          ) : (
            <div className="stack gap-4">
              {results.map((p) => <PractitionerCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
