'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { findBySlug } from '@/lib/data/find-by-slug';
import { Avatar } from '@/components/ui/Avatar';
import { ModalButton } from '@/components/ui/ModalButton';
import { Icon } from '@/components/ui/Icon';

const ORB = {
  sky: ['#A8C8E8', '#5B7FB8'],
  violet: ['#C4B0E8', '#7B5FCF'],
  sage: ['#B8D4C2', '#6FA383'],
  gold: ['#E4C896', '#C49A4A'],
};

export default function DisciplinePage({ params }) {
  const { slug } = use(params);

  const { data: disciplinesRes } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const disciplines = disciplinesRes?.data ?? [];
  const d = findBySlug(disciplines, slug);

  const { data: praticiensRes } = useQuery({
    queryKey: ['praticiens'],
    queryFn: () => api.get('/praticiens'),
  });
  const praticiens = praticiensRes?.data ?? [];

  if (disciplinesRes && !d) {
    return (
      <section className="section">
        <div className="container-narrow center">
          <h1 className="h-2">Discipline introuvable</h1>
          <p className="lead" style={{ marginTop: 10 }}>Cette discipline n'existe pas ou n'est plus disponible.</p>
          <Link href="/disciplines" className="btn btn-soft" style={{ marginTop: 18 }}>Retour aux disciplines</Link>
        </div>
      </section>
    );
  }
  if (!d) return null;

  const [orb1, orb2] = ORB[d.tonalite] || ORB.violet;
  const matches = praticiens.filter((p) => p.specialite === d.nom);

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '68%', '--orb-y': '20%', '--orb-1': orb1, '--orb-2': orb2, padding: '104px 0 110px' }}
      >
        <div className="container-narrow reveal">
          <div className="row gap-2 small" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 22 }}>
            <Link href="/disciplines" style={{ color: 'rgba(255,255,255,0.7)' }}>Disciplines</Link>
            <Icon name="chevronRight" size={13} color="rgba(255,255,255,0.5)" />
            <span>{d.nom}</span>
          </div>
          <span className={`tile-icon glyph-${d.tonalite}`} style={{ fontSize: 26, marginBottom: 20, background: 'rgba(255,255,255,0.12)' }}>{d.glyphe}</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '0 0 16px' }}>{d.nom}</h1>
          <p className="lead italic serif" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 560 }}>{d.accroche}.</p>
          <div className="row gap-3" style={{ marginTop: 32, flexWrap: 'wrap' }}>
            <Link href="/praticiens" className="btn btn-aurora btn-lg">Voir les praticiens</Link>
          </div>
        </div>
      </section>

      {/* PRACTITIONERS */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Sélection</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>Praticiens en {d.nom}</h2>
            </div>
            <Link href="/praticiens" className="more">Tous les praticiens →</Link>
          </div>
          {matches.length > 0 ? (
            <div className="grid" style={{ gap: 16 }}>
              {matches.map((p) => (
                <Link key={p.id} href={`/praticien/${p.id}`} className="card card-hover" style={{ display: 'flex', gap: 16, padding: 18, alignItems: 'flex-start' }}>
                  <Avatar name={`${p.firstname} ${p.lastname}`} size={72} />
                  <div className="flex-1">
                    <div className="h-4" style={{ fontWeight: 500 }}>{p.firstname} {p.lastname}</div>
                    <div className="small" style={{ margin: '4px 0 8px' }}>{p.specialite}</div>
                    <div className="row gap-2 wrap small">
                      <span className="row gap-1"><Icon name="pin" size={13} color="var(--muted)" />{p.ville}</span>
                      <span className="price" style={{ marginLeft: 'auto', fontSize: 18 }}>{Math.round(Number(p.tarif))}€<small>/séance</small></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty card card-pad center">
              <span className={`tile-icon glyph-${d.tonalite}`} style={{ fontSize: 22, margin: '0 auto 12px' }}>{d.glyphe}</span>
              <p className="body">Aucun praticien affiché pour le moment dans cette discipline.</p>
              <div style={{ marginTop: 16 }}>
                <Link href="/praticiens" className="btn btn-primary">Explorer toutes les disciplines</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '22%', '--orb-y': '30%', '--orb-1': orb1, '--orb-2': orb2, padding: 'clamp(40px,6vw,68px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Une question sur le {d.nom.toLowerCase()} ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 500, margin: '0 auto 28px' }}>
              Posez vos questions avant de réserver — sans engagement, dans un cadre bienveillant.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="contact" payload={{ name: d.nom }} className="btn btn-aurora btn-lg">Poser une question</ModalButton>
              <Link href="/praticiens" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Trouver un praticien</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
