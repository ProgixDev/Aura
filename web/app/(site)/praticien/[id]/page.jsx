'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { ModalButton } from '@/components/ui/ModalButton';
import { ProfileBody } from './ProfileBody';
import FavoriteButton from './FavoriteButton';

export default function PractitionerProfilePage({ params }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['praticien', id],
    queryFn: () => api.get(`/praticiens/${id}`),
  });
  // Real avis count/average — fetched here too (not just inside ProfileBody)
  // so the hero stat strip shows the same real numbers as the reviews tab.
  // Same ['avis', id] key as ProfileBody's own query, so React Query serves
  // both from one shared cache entry rather than firing two requests.
  const { data: avisRes } = useQuery({
    queryKey: ['avis', id],
    queryFn: () => api.get(`/avis?praticien_id=${id}`),
  });
  const avisList = avisRes?.data ?? [];
  const reviewCount = avisList.length;
  const avgNote = reviewCount
    ? Math.round((avisList.reduce((sum, a) => sum + a.note, 0) / reviewCount) * 10) / 10
    : 0;

  if (!isLoading && !data?.data) {
    return (
      <section className="section">
        <div className="container center">
          <h1 className="h-2">Praticien introuvable</h1>
          <p className="lead" style={{ marginTop: 10 }}>Ce profil n'existe pas ou n'est plus disponible.</p>
          <Link href="/praticiens" className="btn btn-soft" style={{ marginTop: 18 }}>Retour à l'annuaire</Link>
        </div>
      </section>
    );
  }
  if (!data?.data) return null;

  const p = mapPraticien(data.data);
  const specChips = [...p.specialties, ...(p.extraSpecialty ? [p.extraSpecialty] : [])];

  return (
    <>
      {/* HERO */}
      <section style={{ position: 'relative', height: 420 }}>
        {p.hero ? (
          <img src={p.hero} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="aurora-dark grain" style={{ '--orb-x': '65%', '--orb-y': '25%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', width: '100%', height: '100%' }} />
        )}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(20,16,30,0.42) 0%, rgba(20,16,30,0.08) 38%, rgba(20,16,30,0.62) 100%)',
          }}
        />
        {/* TOP ACTION ROW */}
        <div className="container" style={{ position: 'absolute', top: 22, left: 0, right: 0 }}>
          <div className="between">
            <Link
              href="/praticiens"
              className="btn btn-icon"
              style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
              aria-label="Retour"
            >
              <Icon name="arrowLeft" size={18} />
            </Link>
            <div className="row gap-2">
              <FavoriteButton praticienId={p.id} style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }} />
              <ModalButton
                modal="report"
                payload={{ name: p.name }}
                as="button"
                className="btn btn-icon"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
              >
                <Icon name="flag" size={18} />
              </ModalButton>
              <ModalButton
                modal="share"
                payload={{ label: 'le profil de ' + p.name, url: '/praticien/' + p.id }}
                as="button"
                className="btn btn-icon"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
              >
                <Icon name="share" size={18} />
              </ModalButton>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING IDENTITY CARD */}
      <div className="container" style={{ position: 'relative' }}>
        <div className="card card-pad" style={{ marginTop: -80, position: 'relative', zIndex: 2 }}>
          <div className="row gap-2 wrap" style={{ marginBottom: 12 }}>
            {p.verified && <Badge variant="verified" dot>Vérifiée</Badge>}
            <span className="tiny muted" style={{ marginLeft: 'auto' }}>{p.level}</span>
          </div>

          <h1 className="h-1" style={{ marginBottom: 6 }}>{p.name}</h1>
          <div className="row gap-2 small muted" style={{ marginBottom: 16 }}>
            <span className="row gap-1"><Icon name="pin" size={14} color="var(--muted)" />{p.city}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>{p.mode}</span>
          </div>

          <div className="row gap-2 wrap" style={{ marginBottom: 18 }}>
            {specChips.map((s, i) => (
              <span key={s} className={`chip tone-${i % 2 === 0 ? 'violet' : 'sky'}`}>{s}</span>
            ))}
          </div>

          {/* STAT STRIP */}
          <div className="divider" />
          <div className="row gap-6 wrap" style={{ marginTop: 16, alignItems: 'center' }}>
            <Rating value={avgNote} count={reviewCount} showCount size={16} />
            <span className="price" style={{ fontSize: 22 }}>
              {p.price}€<small>/séance</small>
            </span>
          </div>
        </div>
      </div>

      {/* CONTENT + STICKY RAIL */}
      <section className="section-sm">
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 40, alignItems: 'start' }}>
            <div>
              <ProfileBody p={p} id={id} />
            </div>

            {/* BOOKING RAIL */}
            <aside style={{ position: 'sticky', top: 24 }}>
              <div className="card card-pad">
                <div className="price" style={{ fontSize: 26 }}>
                  {p.price}€<small>/séance</small>
                </div>
                <div className="small muted" style={{ marginBottom: 16 }}>{p.mode}</div>

                <Button href={`/reserver/${p.id}`} variant="aurora" size="lg" block>
                  Réserver une séance
                </Button>
                <div style={{ height: 10 }} />
                <ModalButton
                  modal="contact"
                  payload={{ name: p.name }}
                  as="button"
                  className="btn btn-soft btn-block"
                >
                  <Icon name="message" size={16} /> Contacter
                </ModalButton>

                <div className="divider" style={{ margin: '18px 0' }} />

                <ul className="stack gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li className="row gap-2 small">
                    <Icon name="shield" size={15} color="var(--sage-2, var(--violet-2))" />
                    Identité &amp; assurance vérifiées
                  </li>
                  <li className="row gap-2 small">
                    <Icon name="card" size={15} color="var(--violet-2)" />
                    Paiement protégé, versé après la séance
                  </li>
                  <li className="row gap-2 small">
                    <Icon name="calendar" size={15} color="var(--violet-2)" />
                    Annulation gratuite jusqu'à 24h avant
                  </li>
                </ul>
              </div>

              <ModalButton
                modal="report"
                payload={{ name: p.name }}
                as="button"
                className="btn btn-link btn-sm btn-block"
                style={{ marginTop: 14 }}
              >
                <Icon name="flag" size={13} /> Signaler ce profil
              </ModalButton>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
