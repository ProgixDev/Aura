'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

const KINDS = ['Retraite', 'Événement', 'Formation', 'Cercle', 'Atelier', 'Sortie'];

export default function NewEventPage() {
  const router = useRouter();
  const [titre, setTitre] = useState('');
  const [type, setType] = useState('');
  const [dates, setDates] = useState(['']);
  const [lieu, setLieu] = useState('');
  const [prix, setPrix] = useState('');
  const [nombrePlaces, setNombrePlaces] = useState('');
  const [description, setDescription] = useState('');
  const [hosts, setHosts] = useState([]);
  const [error, setError] = useState(null);

  const { data: praticiensData } = useQuery({
    queryKey: ['admin', 'praticiens', 'picker'],
    queryFn: () => api.get('/praticiens?per_page=100'),
  });
  const praticiens = praticiensData?.data ?? [];

  const toggleHost = (id) => setHosts((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const addDate = () => setDates((d) => [...d, '']);
  const removeDate = (i) => setDates((d) => d.filter((_, idx) => idx !== i));
  const setDateAt = (i, val) => setDates((d) => d.map((x, idx) => (idx === i ? val : x)));

  const createMutation = useMutation({
    mutationFn: () => api.post('/events/create-event', {
      titre, type, dates: dates.filter(Boolean), lieu,
      prix: Number(prix) || 0, nombre_places: Number(nombrePlaces) || 0,
      description, animateurs: hosts.map((id) => ({ id })),
    }),
    onSuccess: (res) => router.push(`/admin/evenement/${res.data.id}`),
    onError: (err) => setError(err.message || 'Erreur lors de la création'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  };

  return (
    <form onSubmit={submit}>
      <PageHead
        title="Nouvel événement"
        subtitle="Créez une retraite, un atelier ou un cercle et publiez-le sur GuériEnergies."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: 'Nouveau' }]}
        actions={<a href="/admin/evenements" className="btn btn-soft btn-sm">Annuler</a>}
      />

      {error && <div className="note tint-violet" style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          {/* Infos */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Informations générales</h3>
            <div className="field">
              <label>Titre de l'événement</label>
              <input className="input" required value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Retraite équinoxe — Vercors" />
            </div>
            <div className="grid grid-2 mt-3">
              <div className="field">
                <label>Type</label>
                <select className="input" required value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="" disabled>Choisir un type…</option>
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Lieu</label>
                <input className="input" required value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Drôme · 26" />
              </div>
            </div>
            <div className="grid grid-2 mt-3">
              <div className="field">
                <label>Prix (€)</label>
                <input className="input" type="number" min="0" required value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="480" />
              </div>
              <div className="field">
                <label>Places</label>
                <input className="input" type="number" min="1" required value={nombrePlaces} onChange={(e) => setNombrePlaces(e.target.value)} placeholder="12" />
              </div>
            </div>
            <div className="field mt-3">
              <label>Dates</label>
              <div className="stack gap-2">
                {dates.map((d, i) => (
                  <div key={i} className="row gap-2">
                    <input className="input" type="date" required value={d} onChange={(ev) => setDateAt(i, ev.target.value)} />
                    <button type="button" className="btn btn-icon btn-ghost btn-sm" onClick={() => removeDate(i)} disabled={dates.length === 1} aria-label="Supprimer la date"><Icon name="trash" size={15} /></button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-soft btn-sm" style={{ marginTop: 8 }} onClick={addDate}><Icon name="plus" size={14} /> Ajouter une date</button>
            </div>
          </div>

          {/* Description */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Présentation</h3>
            <div className="field">
              <label>Description</label>
              <textarea className="input" rows={6} required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez l'expérience, le cadre, ce qui est inclus…" />
            </div>
          </div>
        </div>

        {/* Side: hosts */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 6 }}>Animé par</h3>
            <p className="small" style={{ marginBottom: 14 }}>Sélectionnez un ou plusieurs praticiens hôtes (facultatif).</p>
            <div className="stack gap-2">
              {praticiens.slice(0, 20).map((p) => {
                const active = hosts.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggleHost(p.id)}
                    className={`row gap-3 card-line card-pad ${active ? 'active' : ''}`}
                    style={{ textAlign: 'left', borderColor: active ? 'var(--violet-2)' : 'var(--line)', background: active ? 'var(--violet-1)' : 'transparent', cursor: 'pointer' }}>
                    <Avatar name={`${p.firstname} ${p.lastname}`} size={36} />
                    <div className="flex-1">
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.firstname} {p.lastname}</div>
                      <div className="tiny">{p.specialite} · {p.ville}</div>
                    </div>
                    {active && <Icon name="checkCircle" size={18} color="var(--violet-2)" />}
                  </button>
                );
              })}
            </div>
            {hosts.length > 0 && <div className="tiny" style={{ marginTop: 12 }}>{hosts.length} hôte{hosts.length > 1 ? 's' : ''} sélectionné{hosts.length > 1 ? 's' : ''}</div>}
          </div>

          <div className="card card-pad">
            <button type="submit" className="btn btn-primary btn-block" disabled={createMutation.isPending}>
              <Icon name="check" size={15} /> {createMutation.isPending ? 'Création…' : "Créer l'événement"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
