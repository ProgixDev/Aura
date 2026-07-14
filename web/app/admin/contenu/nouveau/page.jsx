'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';

const CATEGORIES = ['Guide', 'Discipline', 'Conseils', 'Communauté', 'Bien-être'];
const TONES = ['violet', 'sky', 'sage', 'gold'];
const STATUSES = ['brouillon', 'en_revue', 'publié', 'archivé'];

export default function NewArticlePage() {
  const router = useRouter();
  const [titre, setTitre] = useState('');
  const [categorie, setCategorie] = useState(CATEGORIES[0]);
  const [tonalite, setTonalite] = useState(TONES[0]);
  const [extrait, setExtrait] = useState('');
  const [corps, setCorps] = useState('');
  const [status, setStatus] = useState('brouillon');
  const [auteur, setAuteur] = useState("L'équipe Aura");
  const [tempsLecture, setTempsLecture] = useState('');
  const [imageCouverture, setImageCouverture] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [motClef, setMotClef] = useState('');
  const [error, setError] = useState(null);

  const createMutation = useMutation({
    mutationFn: () => api.post('/articles/create-article', {
      titre, categorie, tonalite, extrait, corps, status, auteur,
      temps_lecture: Number(tempsLecture) || 1,
      image_couverture: imageCouverture || undefined,
      meta_description: metaDescription || undefined,
      mot_clef: motClef || undefined,
    }),
    onSuccess: () => router.push('/admin/contenu'),
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
        title="Nouvel article"
        subtitle="Rédigez une parution pour le magazine Aura"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Contenus', href: '/admin/contenu' }, { label: 'Nouvel article' }]}
        actions={<button type="submit" className="btn btn-primary btn-sm" disabled={createMutation.isPending}><Icon name="check" size={15} /> {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}</button>}
      />

      {error && <div className="note tint-violet" style={{ marginBottom: 16, color: 'var(--danger)' }}>{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Editor */}
        <div className="card card-pad">
          <div className="stack gap-4">
            <div className="field">
              <label>Titre de l'article</label>
              <input className="input" required value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Comment choisir un praticien en confiance" />
            </div>

            <div className="grid grid-2 gap-4">
              <div className="field">
                <label>Catégorie</label>
                <select className="input" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Tonalité</label>
                <select className="input" value={tonalite} onChange={(e) => setTonalite(e.target.value)}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Extrait</label>
              <textarea className="input" rows={2} required value={extrait} onChange={(e) => setExtrait(e.target.value)} placeholder="Une phrase d'accroche affichée dans la liste des articles…" />
            </div>

            <div className="field">
              <label>Corps de l'article</label>
              <textarea className="input" rows={16} required value={corps} onChange={(e) => setCorps(e.target.value)} placeholder="Rédigez ici le contenu de l'article. Séparez les paragraphes par une ligne vide…" style={{ lineHeight: 1.7 }} />
              <span className="tiny muted" style={{ marginTop: 6 }}>Astuce : gardez un ton calme et éditorial, fidèle à la voix Aura.</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 12 }}>Publication</h3>
            <div className="field">
              <label>Statut</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Auteur</label>
              <input className="input" required value={auteur} onChange={(e) => setAuteur(e.target.value)} />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Temps de lecture (minutes)</label>
              <input className="input" type="number" min="1" required value={tempsLecture} onChange={(e) => setTempsLecture(e.target.value)} placeholder="6" />
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 6 }}>Image de couverture</h3>
            <div className="field">
              <label>URL de l'image</label>
              <input className="input" value={imageCouverture} onChange={(e) => setImageCouverture(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 12 }}>SEO</h3>
            <p className="tiny muted" style={{ marginBottom: 12 }}>Le slug est généré automatiquement à partir du titre.</p>
            <div className="field">
              <label>Mot-clé principal</label>
              <input className="input" value={motClef} onChange={(e) => setMotClef(e.target.value)} placeholder="bien-être" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Méta-description</label>
              <textarea className="input" rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="Description affichée dans les résultats de recherche…" />
            </div>
            <p className="tiny muted" style={{ marginTop: 8 }}>Idéalement entre 120 et 158 caractères.</p>
          </div>
        </div>
      </div>
    </form>
  );
}
