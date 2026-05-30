'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { ToastButton } from '@/components/ui/ToastButton';
import { Lotus } from '@/components/ui/Lotus';
import { euro } from '@/lib/format';

const DAYS = [
  { key: 'd1', dow: 'Lun', dom: '02', month: 'juin', full: 'lundi 2 juin' },
  { key: 'd2', dow: 'Mar', dom: '03', month: 'juin', full: 'mardi 3 juin' },
  { key: 'd3', dow: 'Mer', dom: '04', month: 'juin', full: 'mercredi 4 juin' },
  { key: 'd4', dow: 'Jeu', dom: '05', month: 'juin', full: 'jeudi 5 juin' },
  { key: 'd5', dow: 'Ven', dom: '06', month: 'juin', full: 'vendredi 6 juin' },
];

const SLOTS = [
  { t: '09:00', off: false }, { t: '10:30', off: true }, { t: '11:30', off: false },
  { t: '14:00', off: false }, { t: '15:30', off: false }, { t: '16:30', off: true },
  { t: '17:30', off: false }, { t: '18:30', off: false },
];

const STEPS = ['Créneau', 'Modalité', 'Paiement', 'Confirmation'];

export function BookingFlow({ p }) {
  const [step, setStep] = useState(1);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState('');
  const [promo, setPromo] = useState('');

  const canPresentiel = !/visio uniquement/i.test(p.mode || '');
  const canVisio = /visio/i.test(p.mode || '');

  const selectedDay = DAYS.find((d) => d.key === day);
  const fee = 2;
  const total = p.price + fee;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const pct = (step / STEPS.length) * 100;

  const step1Ready = day && slot;
  const step2Ready = !!mode;

  return (
    <section className="section">
      <div className="container">
        {/* Top bar */}
        <div className="between wrap gap-3" style={{ marginBottom: 24 }}>
          <Link href={`/praticiens/${p.id}`} className="btn btn-ghost btn-sm">
            <Icon name="chevronLeft" size={16} /> Retour au profil
          </Link>
          <div className="row gap-2" style={{ color: 'var(--muted)' }}>
            <Lotus size={16} color="var(--violet-2)" />
            <span className="small">Réservation sécurisée</span>
          </div>
        </div>

        {/* Progress */}
        <div className="reveal" style={{ marginBottom: 28 }}>
          <div className="between" style={{ marginBottom: 10 }}>
            {STEPS.map((label, i) => (
              <div key={label} className="row gap-2" style={{ opacity: step >= i + 1 ? 1 : 0.4 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center',
                  fontSize: 13, fontWeight: 600,
                  background: step > i + 1 ? 'var(--violet-2)' : step === i + 1 ? 'var(--violet)' : 'var(--line)',
                  color: step >= i + 1 ? '#fff' : 'var(--muted)',
                }}>
                  {step > i + 1 ? <Icon name="check" size={14} color="#fff" /> : i + 1}
                </span>
                <span className="small" style={{ display: 'none' }}>{label}</span>
                <span className="small hide-sm">{label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--violet),var(--violet-2))', transition: 'width .4s ease' }} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 28, alignItems: 'start' }}>
          {/* Main column */}
          <div>
            {/* STEP 1 */}
            {step === 1 && (
              <div className="reveal">
                <span className="eyebrow">Étape 1</span>
                <h1 className="h-2" style={{ margin: '6px 0 4px' }}>
                  Choisissez votre <span className="serif-accent">jour</span>
                </h1>
                <p className="body mb-4">Sélectionnez une date puis un créneau disponible.</p>

                <div className="row gap-3 wrap" style={{ marginBottom: 28 }}>
                  {DAYS.map((d) => {
                    const active = day === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => { setDay(d.key); setSlot(''); }}
                        className="card-hover"
                        style={{
                          flex: '1 1 96px', minWidth: 88, padding: '16px 8px', borderRadius: 20,
                          textAlign: 'center', cursor: 'pointer',
                          border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                          background: active ? 'rgba(164,139,216,0.10)' : 'var(--card)',
                        }}
                      >
                        <div className="tiny" style={{ color: active ? 'var(--violet-2)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d.dow}</div>
                        <div className="serif" style={{ fontSize: 28, lineHeight: 1.1, color: active ? 'var(--violet-2)' : 'var(--ink)' }}>{d.dom}</div>
                        <div className="tiny muted">{d.month}</div>
                      </button>
                    );
                  })}
                </div>

                <h3 className="h-4 mb-3">Créneaux {selectedDay ? `— ${selectedDay.full}` : ''}</h3>
                {!day && <p className="note">Choisissez d’abord un jour pour voir les créneaux.</p>}
                {day && (
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 12 }}>
                    {SLOTS.map((s) => {
                      const active = slot === s.t;
                      return (
                        <button
                          key={s.t}
                          type="button"
                          disabled={s.off}
                          onClick={() => setSlot(s.t)}
                          className="chip"
                          style={{
                            justifyContent: 'center', padding: '12px 0', borderRadius: 14,
                            cursor: s.off ? 'not-allowed' : 'pointer',
                            opacity: s.off ? 0.4 : 1,
                            textDecoration: s.off ? 'line-through' : 'none',
                            border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                            background: active ? 'var(--violet-2)' : 'var(--card)',
                            color: active ? '#fff' : 'var(--ink)',
                          }}
                        >
                          {s.t}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="row gap-3 mt-6">
                  <button type="button" className="btn btn-primary btn-lg" disabled={!step1Ready} onClick={next}>
                    Continuer <Icon name="arrowRight" size={16} color="#fff" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="reveal">
                <span className="eyebrow">Étape 2</span>
                <h1 className="h-2" style={{ margin: '6px 0 4px' }}>
                  Comment souhaitez-vous <span className="serif-accent">vivre la séance</span> ?
                </h1>
                <p className="body mb-4">{p.name} propose : {p.mode}.</p>

                <div className="grid grid-2" style={{ gap: 16 }}>
                  {[
                    { key: 'présentiel', icon: 'pin', title: 'En présentiel', desc: `Au cabinet de ${p.name.split(' ')[0]}, à ${p.city}.`, avail: canPresentiel },
                    { key: 'visio', icon: 'video', title: 'En visio', desc: 'Depuis chez vous, lien sécurisé envoyé avant la séance.', avail: canVisio },
                  ].map((m) => {
                    const active = mode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        disabled={!m.avail}
                        onClick={() => setMode(m.key)}
                        className="card card-pad card-hover"
                        style={{
                          textAlign: 'left', cursor: m.avail ? 'pointer' : 'not-allowed',
                          opacity: m.avail ? 1 : 0.45,
                          border: `1.5px solid ${active ? 'var(--violet-2)' : 'var(--line)'}`,
                          background: active ? 'rgba(164,139,216,0.08)' : 'var(--card)',
                        }}
                      >
                        <span className="tile-icon tint-violet" style={{ marginBottom: 12 }}>
                          <Icon name={m.icon} size={20} color="var(--violet-2)" />
                        </span>
                        <div className="between">
                          <h3 className="h-3">{m.title}</h3>
                          {active && <Icon name="checkCircle" size={20} color="var(--violet-2)" />}
                        </div>
                        <p className="body" style={{ marginTop: 4 }}>{m.desc}</p>
                        {!m.avail && <Badge variant="neutral">Non proposé</Badge>}
                      </button>
                    );
                  })}
                </div>

                <div className="row gap-3 mt-6 between">
                  <button type="button" className="btn btn-ghost btn-lg" onClick={back}>
                    <Icon name="arrowLeft" size={16} /> Retour
                  </button>
                  <button type="button" className="btn btn-primary btn-lg" disabled={!step2Ready} onClick={next}>
                    Continuer <Icon name="arrowRight" size={16} color="#fff" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="reveal">
                <span className="eyebrow">Étape 3</span>
                <h1 className="h-2" style={{ margin: '6px 0 4px' }}>
                  Récapitulatif &amp; <span className="serif-accent">paiement</span>
                </h1>
                <p className="body mb-4">Le montant n’est débité qu’après la séance. Annulation gratuite jusqu’à 24h avant.</p>

                <div className="card card-pad mb-4">
                  <h3 className="h-4 mb-3">Votre séance</h3>
                  <dl className="dl">
                    <dt>Praticien</dt><dd>{p.name}</dd>
                    <dt>Discipline</dt><dd>{p.specialties.join(' · ')}</dd>
                    <dt>Date</dt><dd>{selectedDay?.full} à {slot}</dd>
                    <dt>Modalité</dt><dd style={{ textTransform: 'capitalize' }}>{mode}</dd>
                    <dt>Durée</dt><dd>{p.duration} min</dd>
                  </dl>
                </div>

                <div className="card card-pad">
                  <h3 className="h-4 mb-3">Paiement sécurisé</h3>
                  <div className="field">
                    <label>Titulaire de la carte</label>
                    <input className="input" placeholder="Prénom Nom" defaultValue="" />
                  </div>
                  <div className="field">
                    <label>Numéro de carte</label>
                    <div className="row gap-2" style={{ position: 'relative' }}>
                      <input className="input" placeholder="4242 4242 4242 4242" inputMode="numeric" style={{ flex: 1 }} />
                      <Icon name="card" size={18} color="var(--muted)" />
                    </div>
                  </div>
                  <div className="grid grid-2" style={{ gap: 12 }}>
                    <div className="field"><label>Expiration</label><input className="input" placeholder="MM / AA" /></div>
                    <div className="field"><label>CVC</label><input className="input" placeholder="123" inputMode="numeric" /></div>
                  </div>
                  <div className="field">
                    <label>Code promo</label>
                    <div className="row gap-2">
                      <input className="input" placeholder="AURA10" value={promo} onChange={(e) => setPromo(e.target.value)} style={{ flex: 1 }} />
                      <ToastButton message="Code promo appliqué" tone="success" className="btn btn-soft">Appliquer</ToastButton>
                    </div>
                  </div>
                  <p className="tiny muted row gap-2" style={{ marginTop: 8 }}>
                    <Icon name="shield" size={14} color="var(--muted)" /> Paiement chiffré. Vos données ne sont jamais stockées en clair.
                  </p>
                </div>

                <div className="row gap-3 mt-6 between">
                  <button type="button" className="btn btn-ghost btn-lg" onClick={back}>
                    <Icon name="arrowLeft" size={16} /> Retour
                  </button>
                  <ToastButton
                    message={`Paiement confirmé — ${euro(total)}`}
                    tone="success"
                    className="btn btn-aurora btn-lg"
                  >
                    <span onClick={next} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      Payer {euro(total)}
                    </span>
                  </ToastButton>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="reveal center" style={{ padding: '24px 0' }}>
                <span style={{
                  width: 84, height: 84, borderRadius: 999, display: 'grid', placeItems: 'center',
                  margin: '0 auto 20px', background: 'rgba(122,178,140,0.15)',
                }}>
                  <Icon name="checkCircle" size={44} color="var(--sage-2, #6BA77C)" />
                </span>
                <span className="eyebrow">C’est confirmé</span>
                <h1 className="h-1" style={{ margin: '8px 0 10px' }}>
                  Votre séance est <span className="serif-accent">réservée</span>
                </h1>
                <p className="lead" style={{ maxWidth: 440, margin: '0 auto 24px' }}>
                  Un email de confirmation vient de vous être envoyé. {p.name.split(' ')[0]} a été prévenu(e).
                </p>

                <div className="card card-pad" style={{ maxWidth: 440, margin: '0 auto 26px', textAlign: 'left' }}>
                  <div className="row gap-3" style={{ marginBottom: 14 }}>
                    <Avatar src={p.photo} name={p.name} tone={p.tone} size={52} rounded />
                    <div>
                      <div className="serif" style={{ fontSize: 18 }}>{p.name}</div>
                      <Rating value={p.rating} count={p.reviews} size={13} showCount />
                    </div>
                  </div>
                  <div className="divider" />
                  <dl className="dl">
                    <dt>Date</dt><dd>{selectedDay?.full} à {slot}</dd>
                    <dt>Modalité</dt><dd style={{ textTransform: 'capitalize' }}>{mode}</dd>
                    <dt>Total payé</dt><dd>{euro(total)}</dd>
                  </dl>
                </div>

                <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/compte/reservations" className="btn btn-primary btn-lg">Voir mes réservations</Link>
                  <Link href="/" className="btn btn-ghost btn-lg">Retour à l’accueil</Link>
                </div>
              </div>
            )}
          </div>

          {/* Sticky summary rail */}
          {step < 4 && (
            <aside className="card card-pad" style={{ position: 'sticky', top: 96 }}>
              <div className="row gap-3" style={{ marginBottom: 14 }}>
                <Avatar src={p.photo} name={p.name} tone={p.tone} size={52} rounded />
                <div>
                  <div className="serif" style={{ fontSize: 18, lineHeight: 1.15 }}>{p.name}</div>
                  <div className="tiny muted">{p.specialties.join(' · ')}</div>
                  {p.verified && <Badge variant="verified" dot>Vérifiée</Badge>}
                </div>
              </div>
              <div className="divider" />
              <dl className="dl" style={{ margin: '4px 0' }}>
                <dt>Jour</dt><dd>{selectedDay ? selectedDay.full : <span className="muted">—</span>}</dd>
                <dt>Créneau</dt><dd>{slot || <span className="muted">—</span>}</dd>
                <dt>Modalité</dt><dd style={{ textTransform: 'capitalize' }}>{mode || <span className="muted">—</span>}</dd>
              </dl>
              <div className="divider" />
              <div className="between" style={{ marginTop: 6 }}>
                <span className="small muted">Séance ({p.duration} min)</span>
                <span className="small">{euro(p.price)}</span>
              </div>
              <div className="between" style={{ marginTop: 4 }}>
                <span className="small muted">Frais de service</span>
                <span className="small">{euro(fee)}</span>
              </div>
              <div className="between" style={{ marginTop: 10 }}>
                <span className="serif" style={{ fontSize: 17 }}>Total</span>
                <span className="price" style={{ fontSize: 22 }}>{euro(total)}</span>
              </div>
              <p className="tiny muted row gap-2" style={{ marginTop: 14 }}>
                <Icon name="shield" size={14} color="var(--muted)" /> Débité après la séance
              </p>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
