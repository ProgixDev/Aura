'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';
import { api } from '@/lib/api';

/** Search filters modal for the practitioner directory. */
export function FiltersModal({ id, onApply }) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  // Same query key + shape as web/app/(site)/praticiens/page.jsx's discipline chips —
  // one shared react-query cache entry, `nom`/`slug`/`tonalite` straight off the API.
  const { data: disciplinesRes } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const disciplines = disciplinesRes?.data ?? [];
  const [mode, setMode] = useState('all');
  const [price, setPrice] = useState(120);
  const [level, setLevel] = useState('all');
  const [discs, setDiscs] = useState([]);

  const toggle = (slug) => setDiscs((d) => (d.includes(slug) ? d.filter((x) => x !== slug) : [...d, slug]));
  const apply = () => { onApply?.({ mode, price, level, discs }); close(id); toast('Filtres appliqués', 'success'); };

  return (
    <Modal id={id} title="Filtres" size="modal-lg"
      footer={<>
        <button className="btn btn-soft" onClick={() => { setMode('all'); setPrice(120); setLevel('all'); setDiscs([]); }}>Réinitialiser</button>
        <button className="btn btn-primary" onClick={apply}>Voir les résultats</button>
      </>}>
      <div className="field"><label>Modalité</label>
        <div className="row gap-2 wrap">
          {[['all', 'Tout'], ['présentiel', 'Présentiel'], ['visio', 'Visio']].map(([v, l]) => (
            <button key={v} className={`chip ${mode === v ? 'active' : ''}`} onClick={() => setMode(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="field"><label>Prix maximum · {price} €</label>
        <input type="range" min="40" max="150" value={price} onChange={(e) => setPrice(+e.target.value)} style={{ width: '100%' }} />
      </div>
      <div className="field"><label>Niveau</label>
        <div className="row gap-2 wrap">
          {[['all', 'Tout'], ['Novice', 'Novice'], ['Praticien confirmé', 'Confirmé'], ['Expert', 'Expert']].map(([v, l]) => (
            <button key={v} className={`chip ${level === v ? 'active' : ''}`} onClick={() => setLevel(v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="field"><label>Disciplines</label>
        <div className="row gap-2 wrap">
          {disciplines.map((d) => (
            <button key={d.slug} className={`chip tone-${d.tonalite} ${discs.includes(d.slug) ? 'active' : ''}`} onClick={() => toggle(d.slug)}>{d.nom}</button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default FiltersModal;
