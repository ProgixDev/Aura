'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const GALLERY_TONES = ['violet', 'sky', 'sage'];

function ExchangePanel({ p }) {
  return (
    <div className="panel tint-violet" style={{ padding: 22 }}>
      <span className="eyebrow">Échange proposé</span>
      <div className="row gap-3 wrap" style={{ marginTop: 14, alignItems: 'center' }}>
        <div className="card card-pad flex-1" style={{ minWidth: 180 }}>
          <span className="tiny muted">Je propose</span>
          <div className="h-4" style={{ marginTop: 4 }}>{p.exchange.gives}</div>
        </div>
        <Icon name="arrowRight" size={22} color="var(--violet-2)" />
        <div className="card card-pad flex-1" style={{ minWidth: 180 }}>
          <span className="tiny muted">Je recherche</span>
          <div className="h-4" style={{ marginTop: 4 }}>{p.exchange.wants}</div>
        </div>
      </div>
    </div>
  );
}

export function ProfileBody({ p, id }) {
  const queryClient = useQueryClient();
  // Same ['avis', id] query key page.jsx uses for the hero stat strip — one
  // shared cache entry, not a second network request.
  const { data: avisRes } = useQuery({
    queryKey: ['avis', id],
    queryFn: () => api.get(`/avis?praticien_id=${id}`),
  });
  const reviews = avisRes?.data ?? [];
  const reviewCount = reviews.length;
  const avgNote = reviewCount
    ? Math.round((reviews.reduce((sum, r) => sum + r.note, 0) / reviewCount) * 10) / 10
    : 0;

  const tabs = [
    { key: 'about', label: 'À propos' },
    { key: 'reviews', label: `Avis (${reviewCount})` },
    { key: 'exchange', label: 'Échanges' },
  ];

  return (
    <Tabs tabs={tabs}>
      {(active) => {
        if (active === 'about') {
          return (
            <div className="stack gap-6" style={{ marginTop: 26 }}>
              <p className="lead">{p.bio}</p>

              {p.approach && (
                <div>
                  <span className="eyebrow">Sa démarche</span>
                  <p className="body" style={{ marginTop: 8 }}>{p.approach}</p>
                </div>
              )}

              <div className="grid grid-2">
                <div className="card card-pad center">
                  <div className="serif" style={{ fontSize: 34, lineHeight: 1, color: 'var(--violet-2)' }}>
                    {p.experience.years}
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>ans d'expérience</div>
                </div>
                {p.experience.sessions != null && (
                  <div className="card card-pad center">
                    <div className="serif" style={{ fontSize: 34, lineHeight: 1, color: 'var(--violet-2)' }}>
                      {p.experience.sessions}
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>séances réalisées</div>
                  </div>
                )}
              </div>

              <div>
                <span className="eyebrow">En images</span>
                <div className="grid grid-3" style={{ marginTop: 12 }}>
                  {p.gallery && p.gallery.length > 0
                    ? p.gallery.map((src, i) => (
                        <ModalButton
                          key={i}
                          modal="lightbox"
                          payload={{ images: p.gallery, start: i }}
                          as="div"
                          className="card card-hover"
                          style={{ overflow: 'hidden', padding: 0, cursor: 'pointer', aspectRatio: '4 / 3' }}
                        >
                          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </ModalButton>
                      ))
                    : GALLERY_TONES.map((t, i) => (
                        <div
                          key={i}
                          className={`tint-${t}`}
                          style={{ borderRadius: 20, aspectRatio: '4 / 3' }}
                        />
                      ))}
                </div>
              </div>

              {p.exchange && <ExchangePanel p={p} />}
            </div>
          );
        }

        if (active === 'reviews') {
          return (
            <div className="stack gap-4" style={{ marginTop: 26 }}>
              <div className="between">
                <div className="row gap-3" style={{ alignItems: 'baseline' }}>
                  <span className="serif" style={{ fontSize: 30, color: 'var(--violet-2)' }}>{avgNote}</span>
                  <Rating value={avgNote} count={reviewCount} showCount />
                </div>
                <ModalButton
                  modal="review"
                  payload={{
                    name: p.name,
                    onSubmit: async (values) => {
                      await api.post('/client/avis', {
                        praticien_id: p.id,
                        note: Number(values.rating) || 5,
                        avis: values.text,
                      });
                      await queryClient.invalidateQueries({ queryKey: ['avis', id] });
                    },
                  }}
                  className="btn btn-soft btn-sm"
                  as="button"
                >
                  <Icon name="edit" size={14} /> Laisser un avis
                </ModalButton>
              </div>

              {reviews.length === 0 ? (
                <div className="note">Aucun avis publié pour l'instant.</div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="card card-pad">
                    <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                      <Avatar name={r.full_name_author} size={44} />
                      <div className="flex-1">
                        <div className="between">
                          <div className="h-4">{r.full_name_author}</div>
                          <span className="tiny muted">{dateFr(r.date_ajout)}</span>
                        </div>
                        <div className="row gap-2" style={{ margin: '4px 0 10px' }}>
                          <Rating value={r.note} size={13} showCount={false} />
                        </div>
                        <p className="body">{r.avis}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        }

        // exchange
        return (
          <div className="stack gap-5" style={{ marginTop: 26 }}>
            {p.exchange && <ExchangePanel p={p} />}
            <div className="note">
              <strong>Le troc bienveillant.</strong> Sur AURA, certains praticiens acceptent
              d'échanger un soin contre un autre savoir-faire. Contactez {p.name.split(' ')[0]} via
              la messagerie pour proposer votre échange — aucun paiement n'est requis.
            </div>
          </div>
        );
      }}
    </Tabs>
  );
}

export default ProfileBody;
