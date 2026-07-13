'use client';
import { useState } from 'react';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';
import { practitioners } from '@/lib/data/practitioners';

const KINDS = ['Retraite', 'Événement', 'Formation', 'Cercle', 'Atelier', 'Sortie'];

export default function NewEventPage() {
  const [hosts, setHosts] = useState([]);
  const [program, setProgram] = useState([
    { time: '', title: '' },
  ]);

  const toggleHost = (id) => setHosts((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const addStep = () => setProgram((p) => [...p, { time: '', title: '' }]);
  const removeStep = (i) => setProgram((p) => p.filter((_, idx) => idx !== i));
  const setStep = (i, key, val) => setProgram((p) => p.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)));

  return (
    <>
      <PageHead
        title="Nouvel événement"
        subtitle="Créez une retraite, un atelier ou un cercle et publiez-le sur Aura."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Événements', href: '/admin/evenements' }, { label: 'Nouveau' }]}
        actions={<>
          <ToastButton message="Brouillon enregistré" tone="success" className="btn btn-soft btn-sm"><Icon name="check" size={15} /> Enregistrer brouillon</ToastButton>
          <ToastButton message="Événement publié" tone="success" className="btn btn-primary btn-sm"><Icon name="sparkle" size={15} /> Publier</ToastButton>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        <div className="stack gap-5">
          {/* Infos */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Informations générales</h3>
            <div className="field">
              <label>Titre de l'événement</label>
              <input className="input" placeholder="Retraite équinoxe — Vercors" />
            </div>
            <div className="grid grid-2 mt-3">
              <div className="field">
                <label>Type</label>
                <select className="input" defaultValue="">
                  <option value="" disabled>Choisir un type…</option>
                  {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Dates</label>
                <input className="input" placeholder="21–23 mars 2026" />
              </div>
            </div>
            <div className="grid grid-3 mt-3">
              <div className="field">
                <label>Lieu</label>
                <input className="input" placeholder="Drôme · 26" />
              </div>
              <div className="field">
                <label>Prix (€)</label>
                <input className="input" type="number" placeholder="480" />
              </div>
              <div className="field">
                <label>Places</label>
                <input className="input" type="number" placeholder="12" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 16 }}>Présentation</h3>
            <div className="field">
              <label>Description</label>
              <textarea className="input" rows={6} placeholder="Décrivez l'expérience, le cadre, ce qui est inclus…" />
            </div>
          </div>

          {/* Program builder */}
          <div className="card card-pad">
            <div className="between" style={{ marginBottom: 16 }}>
              <h3 className="h-3">Programme</h3>
              <button className="btn btn-soft btn-sm" onClick={addStep}><Icon name="plus" size={14} /> Ajouter une étape</button>
            </div>
            <div className="stack gap-3">
              {program.map((s, i) => (
                <div key={i} className="row gap-2" style={{ alignItems: 'flex-start' }}>
                  <input className="input" style={{ width: 110 }} placeholder="07h00" value={s.time} onChange={(ev) => setStep(i, 'time', ev.target.value)} />
                  <input className="input flex-1" placeholder="Méditation à l'aube" value={s.title} onChange={(ev) => setStep(i, 'title', ev.target.value)} />
                  <button className="btn btn-icon btn-ghost btn-sm" onClick={() => removeStep(i)} disabled={program.length === 1} aria-label="Supprimer"><Icon name="trash" size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side: hosts */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-3" style={{ marginBottom: 6 }}>Animé par</h3>
            <p className="small" style={{ marginBottom: 14 }}>Sélectionnez un ou plusieurs praticiens hôtes.</p>
            <div className="stack gap-2">
              {practitioners.slice(0, 8).map((p) => {
                const active = hosts.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggleHost(p.id)}
                    className={`row gap-3 card-line card-pad ${active ? 'active' : ''}`}
                    style={{ textAlign: 'left', borderColor: active ? 'var(--violet-2)' : 'var(--line)', background: active ? 'var(--violet-1)' : 'transparent', cursor: 'pointer' }}>
                    <Avatar src={p.photo} name={p.name} tone={p.tone} size={36} />
                    <div className="flex-1">
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                      <div className="tiny">{p.specialties[0]} · {p.city}</div>
                    </div>
                    {active && <Icon name="checkCircle" size={18} color="var(--violet-2)" />}
                  </button>
                );
              })}
            </div>
            {hosts.length > 0 && <div className="tiny" style={{ marginTop: 12 }}>{hosts.length} hôte{hosts.length > 1 ? 's' : ''} sélectionné{hosts.length > 1 ? 's' : ''}</div>}
          </div>

          <div className="card card-pad tint-violet">
            <div className="row gap-2" style={{ marginBottom: 8 }}><Icon name="sparkle" size={16} color="var(--violet-2)" /><strong>Astuce</strong></div>
            <p className="small">Un événement publié apparaît immédiatement dans le catalogue public et déclenche une notification aux abonnés des hôtes.</p>
          </div>

          <div className="card card-pad">
            <div className="stack gap-2">
              <ToastButton message="Événement publié" tone="success" className="btn btn-primary btn-block"><Icon name="sparkle" size={15} /> Publier l'événement</ToastButton>
              <ToastButton message="Brouillon enregistré" tone="success" className="btn btn-soft btn-block"><Icon name="check" size={15} /> Enregistrer comme brouillon</ToastButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
