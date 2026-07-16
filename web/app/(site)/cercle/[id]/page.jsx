'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

export default function CerclePage({ params }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['cercle', id],
    queryFn: () => api.get(`/cercles/${id}`),
  });
  const c = data?.data;

  if (!isLoading && !c) {
    return (
      <section className="section">
        <div className="container-narrow center">
          <h1 className="h-2">Cercle introuvable</h1>
          <p className="lead" style={{ marginTop: 10 }}>Ce cercle n'existe pas ou n'est plus disponible.</p>
          <Link href="/cercles" className="btn btn-soft" style={{ marginTop: 18 }}>Retour aux cercles</Link>
        </div>
      </section>
    );
  }
  if (!c) return null;

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{
          '--orb-x': '70%', '--orb-y': '20%', '--orb-1': c.color || '#C4B0E8', '--orb-2': '#7B5FCF', padding: '96px 0 100px',
          ...(c.image ? { backgroundImage: `linear-gradient(rgba(20,12,35,0.35), rgba(10,6,20,0.65)), url(${c.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
        }}
      >
        <div className="container reveal">
          <div className="row gap-2 small" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 22 }}>
            <Link href="/cercles" style={{ color: 'rgba(255,255,255,0.7)' }}>Cercles</Link>
            <Icon name="chevronRight" size={13} color="rgba(255,255,255,0.5)" />
            <span>{c.nom}</span>
          </div>
          <div className="row between wrap gap-4" style={{ alignItems: 'flex-end' }}>
            <div>
              <h1 className="h-display" style={{ color: '#fff', margin: '14px 0 16px', maxWidth: 680 }}>{c.nom}</h1>
              {c.animateur && (
                <div className="row gap-6 wrap" style={{ color: 'rgba(255,255,255,0.82)' }}>
                  <span className="row gap-2"><Icon name="user" size={16} color="rgba(255,255,255,0.7)" />Animé par {c.animateur}</span>
                </div>
              )}
            </div>
            <ToastButton
              message={`Vous avez rejoint « ${c.nom} » 🌿`}
              tone="success"
              className="btn btn-aurora btn-lg"
            >
              Rejoindre le cercle
            </ToastButton>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="section">
        <div className="container-narrow">
          {c.description && <p className="lead">{c.description}</p>}

          <div className="card card-pad" style={{ marginTop: 28 }}>
            <h3 className="h-4" style={{ marginBottom: 8, fontWeight: 500 }}>À propos</h3>
            <p className="small">
              Un espace de partage continu autour de la pratique. Échanges, ressources, rencontres : ici, on chemine ensemble, dans le respect et la bienveillance.
            </p>
            {c.animateur && (
              <>
                <div className="divider" />
                <dl className="dl">
                  <dt>Animation</dt><dd>{c.animateur}</dd>
                </dl>
              </>
            )}
          </div>

          <div className="row gap-3" style={{ marginTop: 24 }}>
            <ToastButton
              message={`Vous avez rejoint « ${c.nom} » 🌿`}
              tone="success"
              className="btn btn-primary"
            >
              Rejoindre le cercle
            </ToastButton>
          </div>
        </div>
      </section>
    </>
  );
}
