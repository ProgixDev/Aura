'use client';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

export default function NewArticlePage() {
  return (
    <>
      <PageHead
        title="Nouvel article"
        subtitle="Rédigez une parution pour le magazine Aura"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Contenus', href: '/admin/contenu' }, { label: 'Nouvel article' }]}
        actions={<>
          <ToastButton message="Brouillon enregistré" tone="success" className="btn btn-soft btn-sm"><Icon name="edit" size={15} /> Brouillon</ToastButton>
          <ToastButton message="Article publié sur le magazine" tone="success" className="btn btn-primary btn-sm"><Icon name="check" size={15} /> Publier</ToastButton>
        </>}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Editor */}
        <div className="card card-pad">
          <div className="stack gap-4">
            <div className="field">
              <label>Titre de l'article</label>
              <input className="input" placeholder="Ex. Comment choisir un praticien en confiance" />
            </div>

            <div className="grid grid-2 gap-4">
              <div className="field">
                <label>Catégorie</label>
                <select className="input" defaultValue="Guide">
                  <option>Guide</option>
                  <option>Discipline</option>
                  <option>Conseils</option>
                  <option>Communauté</option>
                  <option>Bien-être</option>
                </select>
              </div>
              <div className="field">
                <label>Tonalité</label>
                <select className="input" defaultValue="violet">
                  <option value="violet">Violet</option>
                  <option value="sky">Ciel</option>
                  <option value="sage">Sauge</option>
                  <option value="gold">Or</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Extrait</label>
              <textarea className="input" rows={2} placeholder="Une phrase d'accroche affichée dans la liste des articles…" />
            </div>

            <div className="field">
              <label>Corps de l'article</label>
              <textarea className="input" rows={16} placeholder="Rédigez ici le contenu de l'article. Séparez les paragraphes par une ligne vide…" style={{ lineHeight: 1.7 }} />
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
              <select className="input" defaultValue="draft">
                <option value="draft">Brouillon</option>
                <option value="review">En relecture</option>
                <option value="published">Publié</option>
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Auteur</label>
              <input className="input" defaultValue="L'équipe Aura" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Temps de lecture</label>
              <input className="input" placeholder="Ex. 6 min" />
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 6 }}>Image de couverture</h3>
            <div
              className="center"
              style={{ border: '1px dashed var(--line)', borderRadius: 16, padding: 28, marginTop: 10, color: 'var(--muted)' }}
            >
              <Icon name="download" size={22} color="var(--muted)" />
              <p className="small" style={{ marginTop: 8 }}>Glissez une image ou</p>
              <ToastButton message="Sélecteur de fichier (démo)" tone="success" className="btn btn-soft btn-sm" style={{ marginTop: 8 }}>Parcourir</ToastButton>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 12 }}>SEO</h3>
            <div className="field">
              <label>Slug</label>
              <input className="input" placeholder="choisir-praticien-confiance" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Méta-description</label>
              <textarea className="input" rows={3} placeholder="Description affichée dans les résultats de recherche…" />
            </div>
            <p className="tiny muted" style={{ marginTop: 8 }}>Idéalement entre 120 et 158 caractères.</p>
          </div>
        </div>
      </div>
    </>
  );
}
