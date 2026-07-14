'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Rating } from '@/components/ui/Rating';
import { Lotus } from '@/components/ui/Lotus';
import { euro } from '@/lib/format';
import { computeDiscountedTarif } from '@/lib/pricing';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/store';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

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

// DAYS/SLOTS above are UI-only mock content (R3: no calendar/availability engine in this
// plan) — French month name, no year. This maps what's already selected into a real ISO
// datetime for the backend, without changing the picker itself.
const FRENCH_MONTHS = {
  janvier: '01', février: '02', mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', août: '08', septembre: '09', octobre: '10', novembre: '11', décembre: '12',
};

function buildDateHeureIso(day, slotTime) {
  const year = new Date().getFullYear();
  const month = FRENCH_MONTHS[day.month] ?? '01';
  return `${year}-${month}-${day.dom}T${slotTime}:00`;
}

function PaymentForm({ booking, total, onBack, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [goingBack, setGoingBack] = useState(false);
  const [error, setError] = useState('');

  async function back() {
    setGoingBack(true);
    try {
      await onBack();
    } finally {
      setGoingBack(false);
    }
  }

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setPaying(false);
      return;
    }
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret: booking.clientSecret,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (confirmError) {
      setError(confirmError.message);
      toast(confirmError.message, 'error');
      setPaying(false);
      return;
    }
    toast('Paiement confirmé', 'success');
    onSuccess();
  }

  return (
    <div className="card card-pad">
      <h3 className="h-4 mb-3">Paiement sécurisé</h3>
      <PaymentElement />
      {error && (
        <p className="tiny" style={{ color: 'var(--danger, #C0524A)', marginTop: 8 }}>{error}</p>
      )}
      <p className="tiny muted row gap-2" style={{ marginTop: 8 }}>
        <Icon name="shield" size={14} color="var(--muted)" /> Paiement chiffré. Vos données ne sont jamais stockées en clair.
      </p>
      <div className="row gap-3 mt-6 between">
        <button type="button" className="btn btn-ghost btn-lg" onClick={back} disabled={paying || goingBack}>
          <Icon name="arrowLeft" size={16} /> {goingBack ? 'Annulation…' : 'Retour'}
        </button>
        <button type="button" className="btn btn-aurora btn-lg" onClick={pay} disabled={paying || goingBack || !stripe || !elements}>
          {paying ? 'Paiement en cours…' : `Payer ${euro(total)}`}
        </button>
      </div>
    </div>
  );
}

export function BookingFlow({ p }) {
  const [step, setStep] = useState(1);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const [mode, setMode] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoState, setPromoState] = useState({ status: 'idle' }); // idle | checking | valid | invalid
  const [booking, setBooking] = useState(null); // { rendezVous, clientSecret }
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const toast = useToast();
  const creatingRef = useRef(false);

  const canPresentiel = !/visio uniquement/i.test(p.mode || '');
  const canVisio = /visio/i.test(p.mode || '');

  const selectedDay = DAYS.find((d) => d.key === day);

  const discountedPrice = computeDiscountedTarif(
    p.price,
    promoState.status === 'valid' ? promoState.promo : null,
  );
  const total = booking ? booking.rendezVous.tarif : discountedPrice;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const pct = (step / STEPS.length) * 100;

  const step1Ready = day && slot;
  const step2Ready = !!mode;

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoState({ status: 'checking' });
    try {
      const res = await api.post('/promotions/validate', { code: promoCode.trim() });
      setPromoState({ status: 'valid', promo: res.data });
      toast('Code promo appliqué', 'success');
    } catch (err) {
      const message = errorMessage(err, 'Code promo invalide');
      setPromoState({ status: 'invalid', message });
      toast(message, 'error');
    }
  }

  async function createBooking() {
    // Guards against a double-tap firing two POSTs before `creating` state commits — the
    // real per-booking dedup is server-side, this just avoids an easily-avoidable duplicate.
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post('/rendez-vous', {
        praticien_id: Number(p.id),
        date_heure: buildDateHeureIso(selectedDay, slot),
        mode,
        ...(promoState.status === 'valid' ? { promotion_code: promoState.promo.code } : {}),
      });
      setBooking({ rendezVous: res.data.rendez_vous, clientSecret: res.data.client_secret });
    } catch (err) {
      setCreateError(errorMessage(err, 'Impossible de créer la réservation'));
    } finally {
      setCreating(false);
      creatingRef.current = false;
    }
  }

  // Undoes createBooking(): cancels the just-created en_attente row server-side before
  // clearing local state, so tapping "Continuer" again doesn't leave the first booking + its
  // PaymentIntent orphaned while creating a second one. Best-effort — if the cancel call fails
  // (e.g. a fast webhook already confirmed it), we still let the user go back; the booking's
  // real status is always what the server says it is, not what this screen assumes.
  async function backFromPayment() {
    if (booking) {
      try {
        await api.post(`/rendez-vous/client/${booking.rendezVous.id}/cancel`);
      } catch {
        // best-effort, see comment above
      }
    }
    setBooking(null);
  }

  return (
    <section className="section">
      <div className="container">
        {/* Top bar */}
        <div className="between wrap gap-3" style={{ marginBottom: 24 }}>
          <Link href={`/praticien/${p.id}`} className="btn btn-ghost btn-sm">
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
                <p className="body mb-4">Le montant est débité à la confirmation du paiement. Annulation gratuite jusqu’à 24h avant.</p>

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

                {!booking && (
                  <div className="card card-pad">
                    <h3 className="h-4 mb-3">Code promo</h3>
                    <div className="field">
                      <div className="row gap-2">
                        <input
                          className="input"
                          placeholder="AURA10"
                          value={promoCode}
                          onChange={(e) => { setPromoCode(e.target.value); setPromoState({ status: 'idle' }); }}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-soft"
                          onClick={applyPromo}
                          disabled={promoState.status === 'checking' || !promoCode.trim()}
                        >
                          {promoState.status === 'checking' ? 'Vérification…' : 'Appliquer'}
                        </button>
                      </div>
                      {promoState.status === 'valid' && (
                        <p className="tiny" style={{ color: 'var(--sage-2, #6BA77C)', marginTop: 6 }}>
                          Code {promoState.promo.code} appliqué — nouveau total {euro(discountedPrice)}
                        </p>
                      )}
                      {promoState.status === 'invalid' && (
                        <p className="tiny" style={{ color: 'var(--danger, #C0524A)', marginTop: 6 }}>{promoState.message}</p>
                      )}
                    </div>
                    {createError && (
                      <p className="tiny" style={{ color: 'var(--danger, #C0524A)', marginTop: 8 }}>{createError}</p>
                    )}
                    <div className="row gap-3 mt-6 between">
                      <button type="button" className="btn btn-ghost btn-lg" onClick={back}>
                        <Icon name="arrowLeft" size={16} /> Retour
                      </button>
                      <button type="button" className="btn btn-aurora btn-lg" onClick={createBooking} disabled={creating}>
                        {creating ? 'Préparation du paiement…' : `Continuer vers le paiement · ${euro(discountedPrice)}`}
                      </button>
                    </div>
                  </div>
                )}

                {booking && (
                  <Elements stripe={stripePromise} options={{ clientSecret: booking.clientSecret }}>
                    <PaymentForm
                      booking={booking}
                      total={booking.rendezVous.tarif}
                      onBack={backFromPayment}
                      onSuccess={() => setStep(4)}
                    />
                  </Elements>
                )}
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
                    <dt>Modalité</dt><dd style={{ textTransform: 'capitalize' }}>{booking?.rendezVous.mode}</dd>
                    <dt>Total payé</dt><dd>{euro(booking?.rendezVous.tarif ?? 0)}</dd>
                    <dt>Référence</dt><dd>RDV-{booking?.rendezVous.id}</dd>
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
              {promoState.status === 'valid' && (
                <div className="between" style={{ marginTop: 4 }}>
                  <span className="small muted">Réduction ({promoState.promo.code})</span>
                  <span className="small">−{euro(p.price - discountedPrice)}</span>
                </div>
              )}
              <div className="between" style={{ marginTop: 10 }}>
                <span className="serif" style={{ fontSize: 17 }}>Total</span>
                <span className="price" style={{ fontSize: 22 }}>{euro(total)}</span>
              </div>
              <p className="tiny muted row gap-2" style={{ marginTop: 14 }}>
                <Icon name="shield" size={14} color="var(--muted)" /> Débité à la confirmation du paiement
              </p>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
