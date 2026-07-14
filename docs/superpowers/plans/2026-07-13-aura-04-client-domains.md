# Aura Plan 04 — Client-Authenticated Domains (Paiements, Échanges, Remboursements) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the three client-authenticated (logged-in customer) domains — payments history, échanges (barter) CRUD, and remboursements (refund) request/cancel — on `web/` and `mobile/` to the already-complete NestJS backend, and build the two mobile screens (payment history, refund request) that don't exist yet.

**Architecture:** Every endpoint used here already exists, is `ClientGuard`-protected, and is e2e-tested — this plan is pure frontend wiring plus two new mobile screens. Web pages become thin Server Component wrappers (`export const metadata`) delegating to new `'use client'` `*Body.jsx` components that fetch via `@tanstack/react-query` + `web/lib/api.js` (established in Plan 01), mirroring the existing `ReservationsBody.jsx` split. Mobile screens read through `src/data/repos/index.ts`, extended with real `paiementRepo`/`remboursementRepo` and an `exchangeRepo` that now calls the backend instead of an in-memory mock. Two small, targeted fixes are required before any of this can work correctly: (1) `FormModal`/`ConfirmModal` currently fire-and-forget `onSubmit`/`onConfirm` without awaiting it, so a real async handler would show a false "success" toast and silently swallow backend validation errors — both are fixed to `await` and only close+toast on success; (2) neither api client (`web/lib/api.js`, `mobile/src/data/api/client.ts`) can send a file, since both unconditionally `JSON.stringify` the body — both gain minimal `FormData` passthrough support, needed for the optional refund-evidence upload and exercised by the échange/remboursement multipart endpoints. The mobile `Exchange` type is redefined from its current invented mock shape (`give/want/tag/who/role`) to the real backend `Echange` entity's field names, which forces small, contained rewrites of `ExchangeCard`, `exchange/[id].tsx`, and `exchange/create.tsx` (create.tsx becomes dual-purpose create/edit, matching web's existing "same form, different payload" pattern).

**Tech Stack:** Next.js 15 (React 19, plain JSX) + `@tanstack/react-query` + Vitest (web, all from Plan 01); Expo 54 / React Native 0.81 (TS) + Expo Router + `@tanstack/react-query` + jest-expo (mobile, all already in use). No backend changes — NestJS 11 + TypeORM stay untouched.

**Reference:** [master roadmap](2026-07-13-aura-master-roadmap.md) · [Plan 01 — Foundation](2026-07-13-aura-01-foundation.md) · [checklist](../../frontend-functionality-checklist.md)

**Run each `npm` command from the relevant package dir** (`web/`, `mobile/`), not the repo root. This plan assumes Plan 03 (client auth) is already merged: a logged-in client's JWT is already pushed into `setAuthToken()` on both platforms — `mobile/src/store/session.ts`'s `token` field + `setToken()` action already exist and already call `setAuthToken()` (built in Plan 01 Task 5, confirmed present in the current codebase); `web/lib/auth-store.js` with an equivalent `token` field wired to `web/lib/api.js`'s `setAuthToken()` is what Plan 03 adds on the web side (it does not exist yet at plan-writing time). Either way, by the time this plan executes, every `api.get/post/put/del` call in the tasks below carries the bearer token automatically — no auth code is written here.

---

## File structure

| File | Responsibility |
|---|---|
| `web/components/modals/FormModal.jsx` (modify) | Await async `onSubmit`; only close+toast on success; error toast + stay open on throw; add `type:'file'` field support |
| `web/components/modals/ConfirmModal.jsx` (modify) | Same await/error-toast fix for `onConfirm` |
| `web/lib/api.js` (modify) | Add `FormData` body passthrough (skip JSON.stringify + Content-Type when body is FormData) |
| `web/lib/api.test.js` (modify) | Vitest case for the FormData path |
| `web/lib/refund.js` (create) | Pure `canRequestRefund(paiement, remboursements)` eligibility helper, mirrors backend rule |
| `web/lib/refund.test.js` (create) | Vitest coverage for the eligibility helper |
| `web/lib/echange.js` (create) | Pure `buildEchangeSujet(propose, recherche)` — synthesizes the required `sujet` from the form's actual fields |
| `web/lib/echange.test.js` (create) | Vitest coverage for the sujet builder |
| `web/app/(site)/compte/paiements/page.jsx` (modify) | Server wrapper, keeps `metadata`, renders `PaiementsBody` |
| `web/app/(site)/compte/paiements/PaiementsBody.jsx` (create) | Client component: real transaction history + refund-request action; fake `CARDS` section removed |
| `web/app/(site)/compte/echanges/page.jsx` (modify) | Server wrapper, keeps `metadata`, renders `EchangesBody` |
| `web/app/(site)/compte/echanges/EchangesBody.jsx` (create) | Client component: real list + create/edit/delete wired to the backend |
| `web/app/(site)/compte/remboursements/page.jsx` (create) | New route, Server wrapper |
| `web/app/(site)/compte/remboursements/RemboursementsBody.jsx` (create) | Client component: refund-request history + cancel |
| `web/components/layout/AccountNav.jsx` (modify) | Add "Remboursements" nav entry |
| `mobile/src/data/api/client.ts` (modify) | Add `FormData` body passthrough (mirrors `web/lib/api.js`) |
| `mobile/src/data/api/client.test.ts` (modify) | jest-expo case for the FormData path |
| `mobile/src/data/types.ts` (modify) | Redefine `Exchange` to match the real `Echange` entity; add `EchangeInput`, `PaymentRecord`, `Remboursement` |
| `mobile/src/data/mock/exchanges.ts` (delete) | Stale mock in the old invented shape; only consumer was `exchangeRepo`, being switched to the real backend |
| `mobile/src/data/repos/index.ts` (modify) | `exchangeRepo` now calls the backend (full CRUD); add `paiementRepo`, `remboursementRepo` |
| `mobile/src/utils/format.ts` (create) | `dateFr()` — mirrors `web/lib/format.js`'s formatter (no shared code between platforms in this repo) |
| `mobile/src/utils/echange.ts` (create) | `buildEchangeSujet()` — mirrors `web/lib/echange.js` |
| `mobile/src/utils/echange.test.ts` (create) | jest-expo coverage |
| `mobile/src/utils/refund.ts` (create) | `canRequestRefund()` — mirrors `web/lib/refund.js` |
| `mobile/src/utils/refund.test.ts` (create) | jest-expo coverage |
| `mobile/src/components/ExchangeCard.tsx` (modify) | Consume the real `Echange` fields instead of `give/want/tag/who/role` |
| `mobile/app/exchange/[id].tsx` (modify) | Real fields; add Modifier/Supprimer actions when `statut` is cancellable |
| `mobile/app/exchange/create.tsx` (modify) | Real fields; dual create/edit mode via optional `?id=` param |
| `mobile/app/exchange/index.tsx` | **No changes** — confirmed: only touches `x.id` and passes `x` through to `ExchangeCard`, both shape-agnostic |
| `mobile/app/payment-history.tsx` (create) | New screen: payment history + per-row refund action |
| `mobile/app/refund-request.tsx` (create) | New screen: refund request form (when opened with a `paiementId`) + refund history/cancel (always) |
| `mobile/app/(tabs)/profil.tsx` (modify) | Wire the dead "Moyens de paiement" `MenuRow` to `/payment-history` |
| `mobile/app/_layout.tsx` (modify) | Register `payment-history` (plain) and `refund-request` (modal) screens |

---

## Task 1: Web — make FormModal/ConfirmModal safe for real async handlers

**Files:**
- Modify: `web/components/modals/FormModal.jsx`
- Modify: `web/components/modals/ConfirmModal.jsx`

**Why this is first:** both currently call `onSubmit?.(values)` / `onConfirm?.(reason)` **without awaiting**, then unconditionally close the modal and fire the success toast on the next line. Every task in this plan needs to pass a real `async` handler that calls the backend — as written today, the modal would close and claim success *before* the request even resolves, and a 422 validation error would become a silent unhandled rejection with no user-visible feedback. This is exactly the "genuinely cannot support a real async handler" case the brief allows fixing.

- [ ] **Step 1: Rewrite `FormModal.jsx`**

Replace the full contents of `web/components/modals/FormModal.jsx`:

```jsx
'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';

/**
 * Generic form modal. Drives ~all data-entry modals (contact, report, review,
 * add note, invite, promo, send notification, edit field, payout…).
 * Props: title, subtitle, fields, submitLabel, successToast, intro, size, onSubmit(values)
 * field = { name, label, type: text|textarea|select|email|number|rating|checkbox|file, options?, placeholder?, required?, value? }
 *
 * onSubmit may be async. It is awaited: the modal only closes and shows the
 * success toast once it resolves; if it throws (e.g. a backend validation
 * error), the modal stays open and the error message is shown as a toast so
 * the user can fix the input and retry.
 */
export function FormModal({ id, title = 'Formulaire', subtitle, intro, fields = [], submitLabel = 'Envoyer', successToast = 'Enregistré', size = '', onSubmit }) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.value ?? (f.type === 'checkbox' ? false : f.type === 'rating' ? 5 : f.type === 'file' ? null : '')])));
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit?.(values);
      close(id);
      if (successToast) toast(successToast, 'success');
    } catch (err) {
      toast(err?.message || 'Une erreur est survenue', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal id={id} title={title} subtitle={subtitle} size={size}>
      {intro && <p className="body" style={{ marginBottom: 16 }}>{intro}</p>}
      <form onSubmit={submit}>
        {fields.map((f) => (
          <div className="field" key={f.name}>
            {f.type !== 'checkbox' && <label>{f.label}{f.required && ' *'}</label>}
            {f.type === 'textarea' ? (
              <textarea className="input" placeholder={f.placeholder} required={f.required} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            ) : f.type === 'select' ? (
              <select className="input" required={f.required} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">{f.placeholder || 'Choisir…'}</option>
                {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
              </select>
            ) : f.type === 'rating' ? (
              <div className="row gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => set(f.name, n)} style={{ fontSize: 26, lineHeight: 1, color: n <= values[f.name] ? 'var(--violet-2)' : 'var(--line-2)' }}>❀</button>
                ))}
              </div>
            ) : f.type === 'checkbox' ? (
              <label className="row gap-3" style={{ cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
                <span className={`checkbox ${values[f.name] ? 'checked' : ''}`} onClick={() => set(f.name, !values[f.name])}>{values[f.name] && '✓'}</span>
                {f.label}
              </label>
            ) : f.type === 'file' ? (
              <input className="input" type="file" accept={f.accept} required={f.required && !values[f.name]} onChange={(e) => set(f.name, e.target.files?.[0] ?? null)} />
            ) : (
              <input className="input" type={f.type || 'text'} placeholder={f.placeholder} required={f.required} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} />
            )}
          </div>
        ))}
        <div className="modal-foot" style={{ padding: '8px 0 0' }}>
          <button type="button" className="btn btn-soft" onClick={() => close(id)} disabled={submitting}>Annuler</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Envoi…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

export default FormModal;
```

Note the `type === 'file'` branch deliberately has **no `value` prop** on the `<input>` — browsers reject a controlled non-empty `value` on file inputs, and `onChange` reads `e.target.files[0]` (the real `File`) instead of `e.target.value` (a useless fake path string). This is why file fields default to `null`, not `''`, in the initial-state line above.

This change is backward compatible: every *existing* registry entry passes no `onSubmit` at all, so `await onSubmit?.(values)` evaluates to `await undefined`, which resolves immediately — identical behavior to before (immediate close + success toast).

- [ ] **Step 2: Rewrite `ConfirmModal.jsx`**

Replace the full contents of `web/components/modals/ConfirmModal.jsx`:

```jsx
'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { useUI } from '@/lib/store';

/**
 * Confirm / action modal. Props (via openModal('confirm', props)):
 *  title, message, confirmLabel, cancelLabel, danger, icon,
 *  withReason (shows a textarea), reasonLabel, successToast, onConfirm(reason)
 *
 * onConfirm may be async and is awaited — see FormModal's onSubmit doc for
 * why (closes + success-toasts only after it resolves; shows an error toast
 * and stays open if it throws).
 */
export function ConfirmModal({ id, title = 'Confirmer', message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false, withReason = false, reasonLabel = 'Motif', successToast, onConfirm }) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm?.(reason);
      close(id);
      if (successToast) toast(successToast, danger ? 'danger' : 'success');
    } catch (err) {
      toast(err?.message || 'Une erreur est survenue', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal id={id} title={title} size="modal-sm"
      footer={<>
        <button className="btn btn-soft" onClick={() => close(id)} disabled={submitting}>{cancelLabel}</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={submitting}>{submitting ? 'Veuillez patienter…' : confirmLabel}</button>
      </>}>
      {message && <p className="body">{message}</p>}
      {withReason && (
        <div className="field" style={{ marginTop: 14 }}>
          <label>{reasonLabel}</label>
          <textarea className="input" placeholder="Précisez…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}

export default ConfirmModal;
```

- [ ] **Step 3: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds — no other call site passes `onSubmit`/`onConfirm` yet, so this is a pure refactor of two files with no consumers to break.

- [ ] **Step 4: Commit**

```bash
git add web/components/modals/FormModal.jsx web/components/modals/ConfirmModal.jsx
git commit -m "fix(web): await async onSubmit/onConfirm in FormModal/ConfirmModal, add file field support"
```

---

## Task 2: Web — FormData support in the api client

**Files:**
- Modify: `web/lib/api.js`
- Modify: `web/lib/api.test.js`

- [ ] **Step 1: Write the failing test**

Append this test to the `describe('web api client', ...)` block in `web/lib/api.test.js` (after the existing three tests, before the closing `});`):

```javascript
  it('sends FormData bodies as-is, without a JSON content-type header', async () => {
    global.fetch = mockFetch(201, { status: 'success', data: { id: 1 } });
    const fd = new FormData();
    fd.append('motif', 'Test');
    await api.post('/remboursements/client', fd);
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.body).toBe(fd);
    expect(opts.headers['Content-Type']).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — current `apiFetch` always does `JSON.stringify(body)` and always sets `Content-Type: application/json`, so `opts.body` is a JSON string (not `fd`) and `Content-Type` is defined.

- [ ] **Step 3: Add FormData passthrough**

In `web/lib/api.js`, replace the `apiFetch` function:

```javascript
export async function apiFetch(path, { method = 'GET', body, token, headers = {} } = {}) {
  const t = token ?? authToken;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let payload = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }

  if (!res.ok || (payload && payload.status === 'error')) {
    throw new ApiError(payload?.message || `Request failed (${res.status})`, res.status, payload);
  }
  return payload;
}
```

(Only `apiFetch` changes — `ApiError`, `setAuthToken`, and the `api` object stay exactly as they are.)

- [ ] **Step 4: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS (4 tests in `api.test.js`).

- [ ] **Step 5: Commit**

```bash
git add web/lib/api.js web/lib/api.test.js
git commit -m "feat(web): support FormData bodies in the api client"
```

---

## Task 3: Web — paiements history wiring + refund-request action

**Files:**
- Create: `web/lib/refund.js`, `web/lib/refund.test.js`
- Create: `web/app/(site)/compte/paiements/PaiementsBody.jsx`
- Modify: `web/app/(site)/compte/paiements/page.jsx`

**Ground truth used:** `GET /api/paiements/clients` (`ClientGuard`, `?per_page`, response `data[]` with fields `reference, montant_brut, commission, montant_net_praticien, moyen_paiement, statut, date_paiement, praticien{firstname,lastname}`) and `GET /api/remboursements/client` (for eligibility) from `server/src/paiements/paiements.controller.ts` / `server/src/remboursements/remboursements.service.ts`. Refund eligibility mirrors `remboursements.service.ts`'s `store()`: a paiement is refundable only if `statut === 'paid'` and no existing remboursement for it has a non-terminal `statut` (terminal = `refuse` or `completed`).

**Scope note:** no pagination/search/filter UI is added — the backend's own query params (`search`, `statut`, `date_debut`…) exist but wiring a filter UI isn't in this plan's ask; a single `per_page=50` fetch replaces the old `transactions.slice(0, 8)`. The fake `CARDS` (saved payment methods) section is removed per fixed decision 4 — no backend exists for it.

- [ ] **Step 1: Write the failing test for the refund eligibility helper**

Create `web/lib/refund.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { canRequestRefund } from './refund';

describe('canRequestRefund', () => {
  it('is false when the paiement is not paid', () => {
    expect(canRequestRefund({ id: 1, statut: 'en_attente' }, [])).toBe(false);
  });
  it('is true for a paid paiement with no remboursement rows', () => {
    expect(canRequestRefund({ id: 1, statut: 'paid' }, [])).toBe(true);
  });
  it('is false when a non-terminal remboursement already exists for it', () => {
    const rembs = [{ id: 9, paiement_id: 1, statut: 'en_attente' }];
    expect(canRequestRefund({ id: 1, statut: 'paid' }, rembs)).toBe(false);
  });
  it('is true when the only remboursement for it is terminal (refuse/completed)', () => {
    const rembs = [{ id: 9, paiement_id: 1, statut: 'refuse' }];
    expect(canRequestRefund({ id: 1, statut: 'paid' }, rembs)).toBe(true);
  });
  it('ignores remboursements tied to a different paiement', () => {
    const rembs = [{ id: 9, paiement_id: 2, statut: 'en_attente' }];
    expect(canRequestRefund({ id: 1, statut: 'paid' }, rembs)).toBe(true);
  });
  it('handles a missing paiement gracefully', () => {
    expect(canRequestRefund(null, [])).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — `./refund` does not exist.

- [ ] **Step 3: Write the helper**

Create `web/lib/refund.js`:

```javascript
// Pure eligibility check for the "Demander un remboursement" action —
// mirrors the backend's own rule in server/src/remboursements/remboursements.service.ts
// (store(): paiement must be 'paid', and no existing non-terminal remboursement
// for that paiement — terminal statuses are 'refuse' and 'completed').

const TERMINAL_REMBOURSEMENT_STATUSES = ['refuse', 'completed'];

export function canRequestRefund(paiement, remboursements = []) {
  if (!paiement || paiement.statut !== 'paid') return false;
  return !remboursements.some(
    (r) => r.paiement_id === paiement.id && !TERMINAL_REMBOURSEMENT_STATUSES.includes(r.statut),
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS (6 new tests in `refund.test.js`, 4 unchanged in `api.test.js`).

- [ ] **Step 5: Write `PaiementsBody.jsx`**

Create `web/app/(site)/compte/paiements/PaiementsBody.jsx`:

```jsx
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { ToastButton } from '@/components/ui/ToastButton';
import { api } from '@/lib/api';
import { dateFr, euro, tone } from '@/lib/format';
import { canRequestRefund } from '@/lib/refund';

const STATUS_FR = { paid: 'Payé', en_attente: 'En attente', rembourse: 'Remboursé' };

export default function PaiementsBody() {
  const queryClient = useQueryClient();
  const { data: paiementsRes, isLoading } = useQuery({
    queryKey: ['paiements'],
    queryFn: () => api.get('/paiements/clients?per_page=50'),
  });
  const { data: remboursementsRes } = useQuery({
    queryKey: ['remboursements'],
    queryFn: () => api.get('/remboursements/client?per_page=50'),
  });
  const history = paiementsRes?.data ?? [];
  const remboursements = remboursementsRes?.data ?? [];

  return (
    <div className="stack gap-6">
      <header className="reveal r-1">
        <h1 className="h-1">Paiements</h1>
        <p className="lead" style={{ marginTop: 4 }}>Votre <span className="serif italic accent">historique</span> de transactions.</p>
      </header>

      <section className="reveal r-3">
        <div className="section-head"><h2 className="h-3">Historique des transactions</h2><ToastButton message="Export CSV téléchargé" className="btn btn-soft btn-sm"><Icon name="download" size={14} /> Exporter</ToastButton></div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Référence</th><th>Date</th><th>Praticien</th><th>Montant</th><th>Moyen</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7}><div className="empty">Chargement…</div></td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan={7}><div className="empty">Aucune transaction pour le moment.</div></td></tr>
              ) : history.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.reference}</td>
                  <td>{dateFr(t.date_paiement)}</td>
                  <td>{t.praticien ? `${t.praticien.firstname} ${t.praticien.lastname}` : 'N/A'}</td>
                  <td className="price" style={{ fontSize: 15 }}>{euro(t.montant_brut)}</td>
                  <td>{t.moyen_paiement}</td>
                  <td><Badge variant={tone(t.statut)}>{STATUS_FR[t.statut] || t.statut}</Badge></td>
                  <td>
                    {canRequestRefund(t, remboursements) && (
                      <ModalButton
                        modal="form"
                        payload={{
                          title: 'Demander un remboursement',
                          subtitle: `Transaction ${t.reference} · ${euro(t.montant_brut)}`,
                          fields: [
                            { name: 'motif', label: 'Motif', type: 'text', required: true },
                            { name: 'description', label: 'Description (optionnel)', type: 'textarea' },
                            { name: 'documents', label: 'Justificatif (optionnel)', type: 'file' },
                          ],
                          submitLabel: 'Envoyer la demande',
                          successToast: 'Demande de remboursement envoyée',
                          onSubmit: async (values) => {
                            const fd = new FormData();
                            fd.append('paiement_id', String(t.id));
                            fd.append('motif', values.motif);
                            if (values.description) fd.append('description', values.description);
                            if (values.documents) fd.append('documents', values.documents);
                            await api.post('/remboursements/client', fd);
                            await queryClient.invalidateQueries({ queryKey: ['paiements'] });
                            await queryClient.invalidateQueries({ queryKey: ['remboursements'] });
                          },
                        }}
                        className="btn btn-icon btn-ghost"
                        title="Demander un remboursement"
                      ><Icon name="euro" size={15} /></ModalButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="note"><Icon name="shield" size={15} color="var(--violet-2)" /> Vos paiements sont sécurisés et chiffrés. AURA ne conserve jamais vos données bancaires complètes.</div>
    </div>
  );
}
```

Note the `documents` field's `type: 'file'` relies on Task 1's `FormModal` fix, and the `onSubmit` sending `FormData` relies on Task 2's `api.js` fix — both already merged by this point.

- [ ] **Step 6: Shrink `page.jsx` to a Server Component wrapper**

Replace the full contents of `web/app/(site)/compte/paiements/page.jsx`:

```jsx
import PaiementsBody from './PaiementsBody';

export const metadata = { title: 'Paiements — AURA' };

export default function PaiementsPage() {
  return <PaiementsBody />;
}
```

This mirrors the existing `compte/reservations/page.jsx` + `ReservationsBody.jsx` split (a Server Component can't export both `metadata` and use `useQuery`, since the latter requires `'use client'`).

- [ ] **Step 7: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds; `/compte/paiements` renders as a Client Component tree under a Server Component route wrapper.

- [ ] **Step 8: Commit**

```bash
git add web/lib/refund.js web/lib/refund.test.js "web/app/(site)/compte/paiements/page.jsx" "web/app/(site)/compte/paiements/PaiementsBody.jsx"
git commit -m "feat(web): wire payment history to the real API, add refund-request action"
```

---

## Task 4: Web — échanges CRUD wiring

**Files:**
- Create: `web/lib/echange.js`, `web/lib/echange.test.js`
- Create: `web/app/(site)/compte/echanges/EchangesBody.jsx`
- Modify: `web/app/(site)/compte/echanges/page.jsx`

**Ground truth used:** `server/src/echanges/echanges.controller.ts`/`.service.ts`, `server/src/echanges/dto/create-echange.dto.ts` (`sujet` required max 255, `type` required enum `proposition|demande|information|autre`, `message` required min 10, `ce_que_je_propose`/`ce_que_je_recherche`/`format` optional max 500/500/255, `delai_souhaite` optional ISO date strictly after today) and `dto/update-echange.dto.ts` (same minus `type`, which is **not** editable after creation). Client routes: list/create `GET`/`POST /api/echanges/client/echanges`, show/update/delete `GET`/`PUT`/`DELETE /api/echanges/client/echanges/:id` — update/delete only while `statut` is `en_attente` or `lu` (404 otherwise, per `echanges.service.ts`'s `update()`/`destroy()`).

**Design decision — the existing form's field list doesn't cover two required backend fields:** the current `PROPOSE_FIELDS` (`give/want/mode(select)/delay/message`) has no `sujet` or `type` input. Per fixed decision 1 ("don't add scope the task didn't ask for"), rather than adding two new form fields, `type` is hardcoded to `'proposition'` (the page's own heading is literally "Proposer un échange"), and `sujet` is synthesized from the propose/recherche fields the user actually fills in via a small pure helper — tested below, since it's genuine logic, not just wiring.

- [ ] **Step 1: Write the failing test for the sujet builder**

Create `web/lib/echange.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { buildEchangeSujet } from './echange';

describe('buildEchangeSujet', () => {
  it('combines propose and recherche when both are given', () => {
    expect(buildEchangeSujet('1 soin Reiki', 'Cours de yoga')).toBe('Échange : 1 soin Reiki contre Cours de yoga');
  });
  it('falls back to propose only', () => {
    expect(buildEchangeSujet('1 soin Reiki', '')).toBe('Je propose : 1 soin Reiki');
  });
  it('falls back to recherche only', () => {
    expect(buildEchangeSujet('', 'Cours de yoga')).toBe('Je recherche : Cours de yoga');
  });
  it('falls back to a generic subject when both are empty', () => {
    expect(buildEchangeSujet('', '')).toBe('Échange');
    expect(buildEchangeSujet(undefined, undefined)).toBe('Échange');
  });
  it('trims whitespace and truncates to 255 characters', () => {
    expect(buildEchangeSujet('  a  ', '  b  ')).toBe('Échange : a contre b');
    const long = 'x'.repeat(300);
    expect(buildEchangeSujet(long, '').length).toBe(255);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — `./echange` does not exist.

- [ ] **Step 3: Write the helper**

Create `web/lib/echange.js`:

```javascript
// Pure helpers for the échanges (barter) domain — no backend calls here.

/**
 * The client-facing "Proposer un échange" form only collects give/want/format/
 * delay/message (see compte/echanges), but the backend's CreateEchangeDto
 * requires a `sujet` (subject line). Rather than adding a field the product
 * spec doesn't ask for, synthesize a readable one from what the user gave us.
 */
export function buildEchangeSujet(propose, recherche) {
  const p = (propose || '').trim();
  const r = (recherche || '').trim();
  if (p && r) return `Échange : ${p} contre ${r}`.slice(0, 255);
  if (p) return `Je propose : ${p}`.slice(0, 255);
  if (r) return `Je recherche : ${r}`.slice(0, 255);
  return 'Échange';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS (5 new tests in `echange.test.js`; 6 in `refund.test.js`; 4 in `api.test.js` — 15 total).

- [ ] **Step 5: Write `EchangesBody.jsx`**

Create `web/app/(site)/compte/echanges/EchangesBody.jsx`:

```jsx
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';
import { buildEchangeSujet } from '@/lib/echange';

const TYPE_FR = { proposition: 'Proposition', demande: 'Demande', information: 'Information', autre: 'Autre' };
const STATUT_FR = { en_attente: 'En attente', lu: 'Lu', en_cours: 'En cours', traite: 'Traité', signale: 'Signalé', archive: 'Archivé' };
const STATUT_TONE = { en_attente: 'warning', lu: 'info', en_cours: 'info', traite: 'success', signale: 'danger', archive: 'neutral' };
const FORMAT_OPTIONS = ['Présentiel', 'Visio', 'Peu importe'];

const echangeFields = (e) => [
  { name: 'ce_que_je_propose', label: 'Ce que je propose', type: 'text', value: e?.ce_que_je_propose ?? '' },
  { name: 'ce_que_je_recherche', label: 'Ce que je recherche', type: 'text', value: e?.ce_que_je_recherche ?? '' },
  { name: 'format', label: 'Format', type: 'select', options: FORMAT_OPTIONS, value: e?.format ?? '' },
  { name: 'delai_souhaite', label: 'Délai souhaité (AAAA-MM-JJ, optionnel)', type: 'text', value: e?.delai_souhaite ?? '' },
  { name: 'message', label: 'Message (10 caractères minimum)', type: 'textarea', required: true, value: e?.message ?? '' },
];

export default function EchangesBody() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['echanges'],
    queryFn: () => api.get('/echanges/client/echanges?per_page=50'),
  });
  const list = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['echanges'] });

  const createPayload = {
    title: 'Proposer un échange',
    fields: echangeFields(),
    submitLabel: 'Publier',
    successToast: 'Échange publié',
    onSubmit: async (values) => {
      await api.post('/echanges/client/echanges', {
        sujet: buildEchangeSujet(values.ce_que_je_propose, values.ce_que_je_recherche),
        type: 'proposition',
        message: values.message,
        ce_que_je_propose: values.ce_que_je_propose || undefined,
        ce_que_je_recherche: values.ce_que_je_recherche || undefined,
        format: values.format || undefined,
        delai_souhaite: values.delai_souhaite || undefined,
      });
      await invalidate();
    },
  };

  return (
    <div className="stack gap-5">
      <header className="reveal r-1 row between wrap gap-3">
        <div>
          <h1 className="h-1">Mes échanges</h1>
          <p className="lead" style={{ marginTop: 4 }}>Le <span className="serif italic accent">troc de soins</span> entre membres de la communauté.</p>
        </div>
        <ModalButton modal="form" payload={createPayload} className="btn btn-primary"><Icon name="plus" size={15} /> Proposer un échange</ModalButton>
      </header>

      <div className="stack gap-3">
        {isLoading ? (
          <div className="empty">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="empty">Vous n'avez pas encore publié d'échange.</div>
        ) : list.map((e) => {
          const editable = e.statut === 'en_attente' || e.statut === 'lu';
          return (
            <div key={e.id} className="card card-pad">
              <div className="row gap-3 between" style={{ alignItems: 'flex-start' }}>
                <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                  <span className="tile-icon tint-violet"><Icon name="share" size={18} /></span>
                  <div>
                    <div className="row gap-2"><span className="h-4" style={{ fontWeight: 500 }}>{e.sujet}</span></div>
                    <div className="small mt-1">{TYPE_FR[e.type] || e.type}{e.ce_que_je_propose ? ` · ${e.ce_que_je_propose}` : ''}{e.ce_que_je_recherche ? ` → ${e.ce_que_je_recherche}` : ''}</div>
                  </div>
                </div>
                <Badge variant={STATUT_TONE[e.statut] || 'neutral'}>{STATUT_FR[e.statut] || e.statut}</Badge>
              </div>
              <p className="small mt-2" style={{ fontStyle: 'italic' }}>« {e.message} »</p>
              <div className="divider" />
              <div className="row gap-2 between">
                <span className="tiny muted">Publié {dateFr(e.created_at)}{e.delai_souhaite ? ` · délai souhaité ${dateFr(e.delai_souhaite)}` : ''}</span>
                {editable && (
                  <div className="row gap-2">
                    <ModalButton
                      modal="form"
                      payload={{
                        title: "Modifier l'échange",
                        fields: echangeFields(e),
                        submitLabel: 'Enregistrer',
                        successToast: 'Échange mis à jour',
                        onSubmit: async (values) => {
                          await api.put(`/echanges/client/echanges/${e.id}`, {
                            sujet: buildEchangeSujet(values.ce_que_je_propose, values.ce_que_je_recherche),
                            message: values.message,
                            ce_que_je_propose: values.ce_que_je_propose || undefined,
                            ce_que_je_recherche: values.ce_que_je_recherche || undefined,
                            format: values.format || undefined,
                            delai_souhaite: values.delai_souhaite || undefined,
                          });
                          await invalidate();
                        },
                      }}
                      className="btn btn-ghost btn-sm"
                    ><Icon name="edit" size={14} /> Modifier</ModalButton>
                    <ModalButton
                      modal="confirm"
                      payload={{
                        title: "Retirer l'échange",
                        message: 'Cet échange sera définitivement retiré.',
                        danger: true,
                        confirmLabel: 'Retirer',
                        successToast: 'Échange retiré',
                        onConfirm: async () => {
                          await api.del(`/echanges/client/echanges/${e.id}`);
                          await invalidate();
                        },
                      }}
                      className="btn btn-danger-soft btn-sm"
                    ><Icon name="trash" size={14} /> Retirer</ModalButton>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="note"><Icon name="sparkle" size={15} color="var(--violet-2)" /> Les échanges reposent sur la confiance et le respect mutuel. Convenez ensemble des modalités avant de vous rencontrer.</div>
    </div>
  );
}
```

`echangeFields(e)` is called with no argument for create (all values default to `''`) and with the existing row for edit (pre-fills `value` on each field — `FormModal`'s initial state reads `f.value ?? ...` per field, exactly this mechanism). Note the edit `onSubmit` never sends `type` — matching `UpdateEchangeDto`, which doesn't accept it.

- [ ] **Step 6: Shrink `page.jsx` to a Server Component wrapper**

Replace the full contents of `web/app/(site)/compte/echanges/page.jsx`:

```jsx
import EchangesBody from './EchangesBody';

export const metadata = { title: 'Mes échanges — AURA' };

export default function EchangesPage() {
  return <EchangesBody />;
}
```

- [ ] **Step 7: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add web/lib/echange.js web/lib/echange.test.js "web/app/(site)/compte/echanges/page.jsx" "web/app/(site)/compte/echanges/EchangesBody.jsx"
git commit -m "feat(web): wire échanges list/create/edit/delete to the real API"
```

---

## Task 5: Web — new `compte/remboursements` page (history + cancel)

**Files:**
- Create: `web/app/(site)/compte/remboursements/page.jsx`
- Create: `web/app/(site)/compte/remboursements/RemboursementsBody.jsx`
- Modify: `web/components/layout/AccountNav.jsx`

**Ground truth used:** `GET /api/remboursements/client` (`ClientGuard`, response fields `reference, montant, motif, description, statut, commentaire_admin, date_traitement, date_remboursement, paiement{reference}, created_at`) and `POST /api/remboursements/client/:id/cancel` (`ClientGuard`, only while `statut` is `en_attente` or `en_cours`, sets it to `refuse`) from `server/src/remboursements/remboursements.controller.ts`/`.service.ts`.

- [ ] **Step 1: Write `RemboursementsBody.jsx`**

Create `web/app/(site)/compte/remboursements/RemboursementsBody.jsx`:

```jsx
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';
import { dateFr, euro } from '@/lib/format';

const STATUT_FR = { en_attente: 'En attente', en_cours: 'En cours', approuve: 'Approuvé', refuse: 'Refusé', completed: 'Complété' };
const STATUT_TONE = { en_attente: 'warning', en_cours: 'info', approuve: 'success', refuse: 'danger', completed: 'neutral' };

export default function RemboursementsBody() {
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ['remboursements'],
    queryFn: () => api.get('/remboursements/client?per_page=50'),
  });
  const list = res?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['remboursements'] });

  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Remboursements</h1>
        <p className="lead" style={{ marginTop: 4 }}>Vos demandes de <span className="serif italic accent">remboursement</span> et leur statut.</p>
      </header>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Référence</th><th>Transaction</th><th>Motif</th><th>Montant</th><th>Statut</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7}><div className="empty">Chargement…</div></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7}><div className="empty">Aucune demande de remboursement.</div></td></tr>
            ) : list.map((r) => {
              const cancellable = r.statut === 'en_attente' || r.statut === 'en_cours';
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.reference}</td>
                  <td>{r.paiement?.reference ?? 'N/A'}</td>
                  <td>{r.motif}</td>
                  <td className="price" style={{ fontSize: 15 }}>{euro(r.montant)}</td>
                  <td><Badge variant={STATUT_TONE[r.statut] || 'neutral'}>{STATUT_FR[r.statut] || r.statut}</Badge></td>
                  <td>{dateFr(r.date_traitement || r.created_at)}</td>
                  <td>
                    {cancellable && (
                      <ModalButton
                        modal="confirm"
                        payload={{
                          title: 'Annuler la demande',
                          message: `Annuler la demande de remboursement ${r.reference} ?`,
                          danger: true,
                          confirmLabel: 'Annuler la demande',
                          cancelLabel: 'Garder',
                          successToast: 'Demande annulée',
                          onConfirm: async () => {
                            await api.post(`/remboursements/client/${r.id}/cancel`);
                            await invalidate();
                          },
                        }}
                        className="btn btn-danger-soft btn-sm"
                      >Annuler</ModalButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the Server Component wrapper**

Create `web/app/(site)/compte/remboursements/page.jsx`:

```jsx
import RemboursementsBody from './RemboursementsBody';

export const metadata = { title: 'Remboursements — AURA' };

export default function RemboursementsPage() {
  return <RemboursementsBody />;
}
```

- [ ] **Step 3: Add the nav entry**

In `web/components/layout/AccountNav.jsx`, add a new item to the `ITEMS` array, right after the paiements entry:

```jsx
const ITEMS = [
  { href: '/compte', label: 'Aperçu', icon: 'home', exact: true },
  { href: '/compte/reservations', label: 'Réservations', icon: 'calendar' },
  { href: '/compte/messages', label: 'Messages', icon: 'message' },
  { href: '/compte/favoris', label: 'Favoris', icon: 'heart' },
  { href: '/compte/avis', label: 'Mes avis', icon: 'star' },
  { href: '/compte/echanges', label: 'Échanges', icon: 'share' },
  { href: '/compte/paiements', label: 'Paiements', icon: 'card' },
  { href: '/compte/remboursements', label: 'Remboursements', icon: 'euro' },
  { href: '/compte/parametres', label: 'Paramètres', icon: 'settings' },
];
```

(`euro` is an existing icon key in `web/components/ui/Icon.jsx` — no new icon needed.)

- [ ] **Step 4: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: build succeeds; `/compte/remboursements` is a new route.

- [ ] **Step 5: Run the full web test suite**

Run (in `web/`): `npm test`
Expected: PASS, 15 tests (`api.test.js` 4, `refund.test.js` 6, `echange.test.js` 5).

- [ ] **Step 6: Commit**

```bash
git add "web/app/(site)/compte/remboursements" web/components/layout/AccountNav.jsx
git commit -m "feat(web): add compte/remboursements history + cancel page"
```

---

## Task 6: Mobile — FormData support in the api client

**Files:**
- Modify: `mobile/src/data/api/client.ts`
- Modify: `mobile/src/data/api/client.test.ts`

Mirrors Task 2 exactly, on the mobile TS client — needed by `remboursementRepo.create` (Task 7), which must send an optional file.

- [ ] **Step 1: Write the failing test**

Append this test to the `describe('mobile api client', ...)` block in `mobile/src/data/api/client.test.ts` (after the existing three tests, before the closing `});`):

```typescript
  it('sends FormData bodies as-is, without a JSON content-type header', async () => {
    (global as any).fetch = mockFetch(201, { status: 'success', data: { id: 1 } });
    const fd = new FormData();
    fd.append('motif', 'Test');
    await api.post('/remboursements/client', fd);
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.body).toBe(fd);
    expect(opts.headers['Content-Type']).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- client`
Expected: FAIL — current `apiFetch` always JSON-stringifies the body and always sets `Content-Type: application/json`.

- [ ] **Step 3: Add FormData passthrough**

In `mobile/src/data/api/client.ts`, replace the `apiFetch` function:

```typescript
export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers = {} } = opts;
  const t = token ?? authToken;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(body !== undefined ? { body: (isFormData ? body : JSON.stringify(body)) as BodyInit } : {}),
  });

  const text = await res.text();
  let payload: any = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }

  if (!res.ok || payload?.status === 'error') {
    throw new ApiError(payload?.message ?? `Request failed (${res.status})`, res.status, payload);
  }
  return payload as T;
}
```

(Only `apiFetch` changes — `ApiError`, `ApiOptions`, `setAuthToken`, and the `api` object stay exactly as they are.)

- [ ] **Step 4: Run the test to verify it passes**

Run (in `mobile/`): `npm test -- client`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/data/api/client.ts mobile/src/data/api/client.test.ts
git commit -m "feat(mobile): support FormData bodies in the api client"
```

---

## Task 7: Mobile — types + repo layer (paiementRepo, remboursementRepo, real exchangeRepo)

**Files:**
- Modify: `mobile/src/data/types.ts`
- Delete: `mobile/src/data/mock/exchanges.ts`
- Modify: `mobile/src/data/repos/index.ts`

**Important finding from research:** the current mobile `Exchange` type (`who, role, give, want, tag, avatar, message, mode, delay, publishedAgo`) was invented for the mock and shares **no field names** with the real backend `Echange` entity (`sujet, type, statut, priorite, message, ce_que_je_propose, ce_que_je_recherche, format, delai_souhaite, pieces_jointes, created_at`) — `tag` (5 barter categories) and `type` (4 message-classification values) aren't even the same axis. Per the ground-truth instruction to keep raw backend field names (no mapping layer), `Exchange` is redefined in place to match the entity. Its only consumers are `mobile/src/data/mock/exchanges.ts`, `mobile/src/data/repos/index.ts`, `mobile/src/components/ExchangeCard.tsx`, and the three `mobile/app/exchange/*.tsx` screens (confirmed via project-wide search) — all four are updated in this task and Task 8. The mock file is deleted rather than updated: it would fail to typecheck against the new shape, and it becomes dead code the instant `exchangeRepo` stops reading from it.

- [ ] **Step 1: Redefine `Exchange`, add `EchangeInput`/`PaymentRecord`/`Remboursement`**

In `mobile/src/data/types.ts`, replace the existing `Exchange` interface with:

```typescript
export interface PieceJointe {
  nom: string;
  chemin: string;
  taille: number;
  type: string;
}

export interface Exchange {
  id: number;
  client_id: number;
  sujet: string;
  type: 'proposition' | 'demande' | 'information' | 'autre';
  statut: string;
  priorite: string;
  message: string;
  format: string | null;
  ce_que_je_propose: string | null;
  ce_que_je_recherche: string | null;
  delai_souhaite: string | null;
  pieces_jointes: PieceJointe[] | null;
  created_at: string;
  updated_at: string;
}

/** Body shape for exchangeRepo.create/update — matches CreateEchangeDto/UpdateEchangeDto. */
export interface EchangeInput {
  sujet: string;
  type: 'proposition' | 'demande' | 'information' | 'autre';
  message: string;
  ce_que_je_propose?: string;
  ce_que_je_recherche?: string;
  format?: string;
  delai_souhaite?: string;
}

export interface PaymentRecord {
  id: number;
  reference: string;
  client_id: number;
  praticien_id: number | null;
  montant_brut: number;
  commission: number;
  montant_net_praticien: number;
  moyen_paiement: string;
  statut: string | null;
  date_paiement: string | null;
  created_at: string;
  praticien: { id: number; firstname: string; lastname: string } | null;
}

export interface Remboursement {
  id: number;
  reference: string;
  client_id: number;
  paiement_id: number;
  praticien_id: number | null;
  montant: number;
  motif: string;
  description: string | null;
  statut: string;
  commentaire_admin: string | null;
  date_traitement: string | null;
  date_remboursement: string | null;
  documents: unknown[] | null;
  created_at: string;
  paiement?: { id: number; reference: string } | null;
  praticien?: { id: number; firstname: string; lastname: string } | null;
}
```

Every other interface in the file (`Practitioner`, `Discipline`, `Event`, `Conversation`, `ChatMessage`, `Review`, `BookingDraft`) is untouched.

- [ ] **Step 2: Delete the stale mock**

Delete `mobile/src/data/mock/exchanges.ts` (its only consumer, `repos/index.ts`, is rewritten in the next step to stop importing it).

- [ ] **Step 3: Rewrite the repo layer**

Replace the full contents of `mobile/src/data/repos/index.ts`:

```typescript
/**
 * Repository layer — every screen reads through these functions.
 * practitionerRepo / disciplineRepo / eventRepo / messageRepo / bookingRepo
 * still serve from the in-memory mock data in `src/data/mock/*` (unwired in
 * this plan). paiementRepo / remboursementRepo / exchangeRepo call the real
 * NestJS backend via `src/data/api/client` — the auth token is already
 * attached globally by `src/store/session.ts`'s `setToken`.
 */
import { practitionersMock, reviewsMock } from '../mock/practitioners';
import { disciplinesMock } from '../mock/disciplines';
import { eventsMock } from '../mock/events';
import { conversationsMock, sampleChat } from '../mock/messages';
import {
  practitionerImages,
  disciplineImageSource,
} from '../images';
import { api } from '../api/client';
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  EchangeInput,
  PaymentRecord,
  Remboursement,
  Conversation,
  ChatMessage,
} from '../types';

const delay = <T>(value: T, ms = 60): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

// Attach registry images onto the plain mock objects.
const withImages = (p: Practitioner): Practitioner => {
  const imgs = practitionerImages[p.id];
  if (!imgs) return p;
  return { ...p, photo: imgs.avatar, hero: imgs.hero, gallery: imgs.gallery };
};

const decoratedPractitioners = practitionersMock.map(withImages);

const withDisciplineImage = (d: Discipline): Discipline => ({
  ...d,
  heroImage: disciplineImageSource(d.slug),
});

const decoratedDisciplines = disciplinesMock.map(withDisciplineImage);

// ---------- Practitioners ----------
export const practitionerRepo = {
  list: (): Promise<Practitioner[]> => delay(decoratedPractitioners),
  byId: (id: string): Promise<Practitioner | undefined> =>
    delay(decoratedPractitioners.find((p) => p.id === id)),
  byDiscipline: (disciplineName: string): Promise<Practitioner[]> =>
    delay(
      decoratedPractitioners.filter((p) =>
        p.specialties.includes(disciplineName)
      )
    ),
  recommended: (): Promise<Practitioner[]> =>
    delay(decoratedPractitioners.slice(0, 4)),
  reviewsFor: (practitionerId: string) =>
    delay(reviewsMock.filter((r) => r.practitionerId === practitionerId)),
};

// ---------- Disciplines ----------
export const disciplineRepo = {
  list: (): Promise<Discipline[]> => delay(decoratedDisciplines),
  bySlug: (slug: string): Promise<Discipline | undefined> =>
    delay(decoratedDisciplines.find((d) => d.slug === slug)),
};

// ---------- Events ----------
export const eventRepo = {
  list: (): Promise<Event[]> => delay(eventsMock),
  byId: (id: string): Promise<Event | undefined> =>
    delay(eventsMock.find((e) => e.id === id)),
  featured: (): Promise<Event[]> => delay(eventsMock.slice(0, 2)),
};

// ---------- Exchanges (échanges) — real backend ----------
export const exchangeRepo = {
  list: (): Promise<Exchange[]> =>
    api.get<{ data: Exchange[] }>('/echanges/client/echanges?per_page=50').then((r) => r.data),
  byId: (id: number): Promise<Exchange> =>
    api.get<{ data: Exchange }>(`/echanges/client/echanges/${id}`).then((r) => r.data),
  create: (payload: EchangeInput): Promise<Exchange> =>
    api.post<{ data: Exchange }>('/echanges/client/echanges', payload).then((r) => r.data),
  update: (id: number, payload: Partial<Omit<EchangeInput, 'type'>>): Promise<Exchange> =>
    api.put<{ data: Exchange }>(`/echanges/client/echanges/${id}`, payload).then((r) => r.data),
  remove: (id: number): Promise<void> =>
    api.del(`/echanges/client/echanges/${id}`).then(() => undefined),
};

// ---------- Paiements (payment history) — real backend ----------
export const paiementRepo = {
  list: (): Promise<PaymentRecord[]> =>
    api.get<{ data: PaymentRecord[] }>('/paiements/clients?per_page=50').then((r) => r.data),
  byId: (id: number): Promise<PaymentRecord> =>
    api.get<{ data: PaymentRecord }>(`/paiements/${id}`).then((r) => r.data),
};

// ---------- Remboursements (refunds) — real backend ----------
export const remboursementRepo = {
  list: (): Promise<Remboursement[]> =>
    api.get<{ data: Remboursement[] }>('/remboursements/client?per_page=50').then((r) => r.data),
  create: (payload: { paiement_id: number; motif: string; description?: string }): Promise<Remboursement> => {
    const fd = new FormData();
    fd.append('paiement_id', String(payload.paiement_id));
    fd.append('motif', payload.motif);
    if (payload.description) fd.append('description', payload.description);
    return api.post<{ data: Remboursement }>('/remboursements/client', fd).then((r) => r.data);
  },
  byId: (id: number): Promise<Remboursement> =>
    api.get<{ data: Remboursement }>(`/remboursements/client/${id}`).then((r) => r.data),
  cancel: (id: number): Promise<Remboursement> =>
    api.post<{ data: Remboursement }>(`/remboursements/client/${id}/cancel`).then((r) => r.data),
};

// ---------- Messaging ----------
export const messageRepo = {
  conversations: (): Promise<Conversation[]> => delay(conversationsMock),
  conversation: (id: string): Promise<Conversation | undefined> =>
    delay(conversationsMock.find((c) => c.id === id)),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    delay(sampleChat(conversationId)),
};

// ---------- Bookings ----------
/**
 * Frontend stub: pretends to "hold" the funds and returns a fake reference.
 * Replace with a real call (e.g. /api/bookings/hold) when a backend exists.
 */
export const bookingRepo = {
  hold: async (params: {
    practitionerId: string;
    when: string;
    mode: 'présentiel' | 'visio';
    total: number;
  }) =>
    delay({
      id: `AURA-${Date.now()}-${params.practitionerId.toUpperCase()}`,
      status: 'held' as const,
      ...params,
    }),
  release: async (bookingId: string) =>
    delay({ bookingId, status: 'released' as const }),
  refund: async (bookingId: string) =>
    delay({ bookingId, status: 'refunded' as const }),
};
```

`paiementRepo`/`remboursementRepo`/`exchangeRepo` are deliberately thin `api.*` wrappers with no branching logic beyond the FormData construction in `remboursementRepo.create` (already exercised indirectly by Task 6's client test) — per the fixed decision on test scope, these don't warrant their own unit test.

- [ ] **Step 4: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: FAIL at this point — `ExchangeCard.tsx` and the three `exchange/*.tsx` screens still reference the old field names (`.give`, `.want`, `.who`, `.tag`, `.avatar`, `.role`). This is expected; they're fixed in Task 8. Confirm the *only* errors reported are in those four files (i.e. `repos/index.ts` and `types.ts` themselves compile cleanly).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/data/repos/index.ts
git rm mobile/src/data/mock/exchanges.ts
git commit -m "feat(mobile): add paiement/remboursement repos, wire echange repo to the real API"
```

(Type errors in the exchange screens are expected to persist across this commit — Task 8 fixes them next. This is an intentional two-commit split of one coherent change, not a broken intermediate state left unresolved.)

---

## Task 8: Mobile — rewrite exchange screens against the real Echange shape, add edit/delete

**Files:**
- Create: `mobile/src/utils/echange.ts`, `mobile/src/utils/echange.test.ts`
- Create: `mobile/src/utils/format.ts`
- Modify: `mobile/src/components/ExchangeCard.tsx`
- Modify: `mobile/app/exchange/[id].tsx`
- Modify: `mobile/app/exchange/create.tsx`
- **No change:** `mobile/app/exchange/index.tsx` — it only reads `x.id` (works for any object shape) and passes `x` straight through to `ExchangeCard` (shape-agnostic); confirmed by direct read, no edits needed.

**Design decisions carried over from web (Task 4), for cross-platform consistency:** `type` is hardcoded to `'proposition'` on create (this screen's own title is "Publier un échange"); `sujet` is synthesized via the same `buildEchangeSujet` logic (re-implemented in TS since this codebase has no shared code between `web/` and `mobile/`); `UpdateEchangeDto` doesn't accept `type`, so edit mode never sends it. **`create.tsx` becomes dual-purpose** create/edit via an optional `?id=` param — mirrors web's identical "same form, different payload" pattern (`modal="form"` reused for both "Proposer un échange" and "Modifier l'échange") and is a small, contained addition consistent with the existing screen. No file-picker dependency exists in `mobile/package.json` (no `expo-image-picker`/`expo-document-picker`) and none is added here — the backend's `pieces_jointes` upload is optional, so mobile échange create/edit stays text-only; this is a deliberate, documented scope cut, not an oversight.

- [ ] **Step 1: Write the failing test for the mobile sujet builder**

Create `mobile/src/utils/echange.test.ts`:

```typescript
import { buildEchangeSujet } from './echange';

describe('buildEchangeSujet', () => {
  it('combines propose and recherche when both are given', () => {
    expect(buildEchangeSujet('1 soin Reiki', 'Cours de yoga')).toBe('Échange : 1 soin Reiki contre Cours de yoga');
  });
  it('falls back to propose only', () => {
    expect(buildEchangeSujet('1 soin Reiki', '')).toBe('Je propose : 1 soin Reiki');
  });
  it('falls back to recherche only', () => {
    expect(buildEchangeSujet('', 'Cours de yoga')).toBe('Je recherche : Cours de yoga');
  });
  it('falls back to a generic subject when both are empty', () => {
    expect(buildEchangeSujet('', '')).toBe('Échange');
    expect(buildEchangeSujet()).toBe('Échange');
  });
  it('trims whitespace and truncates to 255 characters', () => {
    expect(buildEchangeSujet('  a  ', '  b  ')).toBe('Échange : a contre b');
    expect(buildEchangeSujet('x'.repeat(300), '').length).toBe(255);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- echange`
Expected: FAIL — `./echange` does not exist.

- [ ] **Step 3: Write the helper**

Create `mobile/src/utils/echange.ts`:

```typescript
/**
 * The mobile "Publier un échange" form only collects propose/recherche/format/
 * délai/message — the backend's CreateEchangeDto also requires a `sujet`
 * (subject line). Rather than adding a field the product spec doesn't ask
 * for, synthesize a readable one from what the user gave us. Mirrors
 * web/lib/echange.js exactly (kept separate — this codebase does not share
 * code between web/ and mobile/).
 */
export function buildEchangeSujet(propose?: string, recherche?: string): string {
  const p = (propose ?? '').trim();
  const r = (recherche ?? '').trim();
  if (p && r) return `Échange : ${p} contre ${r}`.slice(0, 255);
  if (p) return `Je propose : ${p}`.slice(0, 255);
  if (r) return `Je recherche : ${r}`.slice(0, 255);
  return 'Échange';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `mobile/`): `npm test -- echange`
Expected: PASS (5 tests).

- [ ] **Step 5: Add the shared date formatter**

Create `mobile/src/utils/format.ts` (needed by `[id].tsx` in this task, and by `payment-history.tsx`/`refund-request.tsx` in Tasks 9–10):

```typescript
/** Mirrors web/lib/format.js's dateFr — kept separate per this codebase's no-shared-code convention. */
export function dateFr(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
```

(No test file — this mirrors `web/lib/format.js`, which also has no test in this codebase; pure formatting glue isn't covered by the test-scope decision.)

- [ ] **Step 6: Rewrite `ExchangeCard.tsx`**

Replace the full contents of `mobile/src/components/ExchangeCard.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { radii } from '@theme/spacing';
import { shadows } from '@theme/shadows';
import type { Exchange } from '@data/types';

const STATUT_FR: Record<string, string> = {
  en_attente: 'En attente', lu: 'Lu', en_cours: 'En cours',
  traite: 'Traité', signale: 'Signalé', archive: 'Archivé',
};
const STATUT_VARIANT: Record<string, 'verified' | 'online' | 'novice' | 'soft'> = {
  en_attente: 'novice', lu: 'online', en_cours: 'online',
  traite: 'verified', signale: 'soft', archive: 'soft',
};

export function ExchangeCard({ exchange }: { exchange: Exchange }) {
  const router = useRouter();
  const hasFlow = Boolean(exchange.ce_que_je_propose || exchange.ce_que_je_recherche);
  return (
    <Pressable
      onPress={() => router.push(`/exchange/${exchange.id}` as any)}
      style={[styles.card, shadows.card]}
    >
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{exchange.sujet}</Text>
          <Text style={styles.role} numberOfLines={2}>{exchange.message}</Text>
        </View>
        <Badge
          label={STATUT_FR[exchange.statut] ?? exchange.statut}
          variant={STATUT_VARIANT[exchange.statut] ?? 'soft'}
        />
      </View>
      {hasFlow && (
        <View style={styles.flow}>
          <View style={styles.side}>
            <Text style={styles.flowLabel}>Propose</Text>
            <Text style={styles.flowValue}>{exchange.ce_que_je_propose || '—'}</Text>
          </View>
          <View style={styles.arrow}>
            <Icon name="chevron" size={16} color="#fff" />
          </View>
          <View style={styles.side}>
            <Text style={styles.flowLabel}>Cherche</Text>
            <Text style={styles.flowValue}>{exchange.ce_que_je_recherche || '—'}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 18,
    backgroundColor: colors.white,
    borderRadius: 22,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  name: { ...typography.bodyMedium, fontSize: 15 },
  role: { ...typography.tiny, marginTop: 3 },
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  side: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.mist,
    borderRadius: radii.md,
  },
  flowLabel: {
    ...typography.tiny,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  flowValue: {
    ...typography.serif,
    fontSize: 15,
    fontFamily: 'CormorantGaramond_500Medium',
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 7: Rewrite `exchange/create.tsx` as dual create/edit**

Replace the full contents of `mobile/app/exchange/create.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { EscrowNotice } from '@components/EscrowNotice';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { exchangeRepo } from '@data/repos';
import { buildEchangeSujet } from '@utils/echange';

const formats = ['Présentiel', 'Visio', 'Peu importe'] as const;
type Format = typeof formats[number];

export default function ExchangeCreate() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { data: existing } = useQuery({
    queryKey: ['exchange', id],
    queryFn: () => exchangeRepo.byId(Number(id)),
    enabled: isEditing,
  });

  const [seeded, setSeeded] = useState(false);
  const [propose, setPropose] = useState('1 soin énergétique · 75 min');
  const [recherche, setRecherche] = useState('Cours de yoga (1h)');
  const [format, setFormat] = useState<Format>('Présentiel');
  const [delaiSouhaite, setDelaiSouhaite] = useState('');
  const [message, setMessage] = useState(
    "J'aimerais offrir un soin à quelqu'un qui en a besoin, en échange d'un peu d'aide pour me remettre au yoga doucement."
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (existing && !seeded) {
      setPropose(existing.ce_que_je_propose ?? '');
      setRecherche(existing.ce_que_je_recherche ?? '');
      if (existing.format && (formats as readonly string[]).includes(existing.format)) {
        setFormat(existing.format as Format);
      }
      setDelaiSouhaite(existing.delai_souhaite ?? '');
      setMessage(existing.message);
      setSeeded(true);
    }
  }, [existing, seeded]);

  const publish = async () => {
    if (message.trim().length < 10) {
      Alert.alert('Message trop court', 'Le message doit contenir au moins 10 caractères.');
      return;
    }
    setSubmitting(true);
    try {
      const shared = {
        sujet: buildEchangeSujet(propose, recherche),
        message,
        ce_que_je_propose: propose || undefined,
        ce_que_je_recherche: recherche || undefined,
        format,
        delai_souhaite: delaiSouhaite || undefined,
      };
      if (isEditing) {
        await exchangeRepo.update(Number(id), shared);
        await queryClient.invalidateQueries({ queryKey: ['exchange', id] });
      } else {
        await exchangeRepo.create({ ...shared, type: 'proposition' });
      }
      await queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      router.back();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title={isEditing ? "Modifier l'échange" : 'Publier un échange'} backIcon="close" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingHorizontal: 24 }}>
          <Input label="Je propose (optionnel)" value={propose} onChangeText={setPropose} />
          <Input
            label="Je cherche (optionnel)"
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Ex. cours de yoga, design web…"
          />

          <Text style={styles.fieldLabel}>FORMAT</Text>
          <View style={styles.modeRow}>
            {formats.map((f) => (
              <Chip
                key={f}
                label={f}
                active={format === f}
                onPress={() => setFormat(f)}
                size="lg"
                style={{ flex: 1, justifyContent: 'center' }}
              />
            ))}
          </View>

          <Input
            label="Message (10 caractères minimum)"
            value={message}
            onChangeText={setMessage}
            multiline
            placeholder="Quelques mots pour que la personne se sente accueillie…"
          />

          <Input
            label="Délai souhaité (AAAA-MM-JJ, optionnel)"
            value={delaiSouhaite}
            onChangeText={setDelaiSouhaite}
            placeholder="2026-08-01"
          />

          <EscrowNotice
            tone="violet"
            title="Pas d'argent dans les échanges directs."
            body="Aura n'intervient pas dans la transaction. Faites confiance à votre intuition, et signalez tout abus."
          />
        </View>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Button
          label={isEditing ? 'Enregistrer' : 'Publier mon échange'}
          onPress={publish}
          disabled={submitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    ...typography.tiny,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
```

- [ ] **Step 8: Rewrite `exchange/[id].tsx` with real fields + Modifier/Supprimer**

Replace the full contents of `mobile/app/exchange/[id].tsx`:

```tsx
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@components/Badge';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Icon } from '@components/Icon';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { exchangeRepo } from '@data/repos';
import { dateFr } from '@utils/format';

const STATUT_FR: Record<string, string> = {
  en_attente: 'En attente', lu: 'Lu', en_cours: 'En cours',
  traite: 'Traité', signale: 'Signalé', archive: 'Archivé',
};

export default function ExchangeDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: x } = useQuery({
    queryKey: ['exchange', id],
    queryFn: () => exchangeRepo.byId(Number(id)),
  });
  const [deleting, setDeleting] = useState(false);

  if (!x) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const editable = x.statut === 'en_attente' || x.statut === 'lu';

  const remove = () => {
    Alert.alert(
      "Retirer l'échange",
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await exchangeRepo.remove(Number(id));
              await queryClient.invalidateQueries({ queryKey: ['exchanges'] });
              router.back();
            } catch (err: any) {
              Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Échange" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: editable ? 140 : 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 24 }}>
          <View style={styles.head}>
            <Text style={styles.name}>{x.sujet}</Text>
            <Badge label={STATUT_FR[x.statut] ?? x.statut} variant="soft" />
          </View>

          {(x.ce_que_je_propose || x.ce_que_je_recherche) && (
            <View style={styles.flow}>
              <View style={styles.side}>
                <Text style={styles.flowL}>JE PROPOSE</Text>
                <Text style={styles.flowV}>{x.ce_que_je_propose || '—'}</Text>
              </View>
              <View style={styles.arrow}>
                <Icon name="chevron" size={14} color="#fff" />
              </View>
              <View style={styles.side}>
                <Text style={styles.flowL}>JE CHERCHE</Text>
                <Text style={styles.flowV}>{x.ce_que_je_recherche || '—'}</Text>
              </View>
            </View>
          )}

          <Text style={[typography.eyebrow, { marginVertical: 12 }]}>MON MESSAGE</Text>
          <Card style={{ padding: 16 }}>
            <Text style={[typography.body, { fontSize: 14.5 }]}>{x.message}</Text>
          </Card>

          <Text style={[typography.eyebrow, { marginTop: 24, marginBottom: 12 }]}>CONDITIONS</Text>
          <View style={styles.condGrid}>
            <CondCell label="Format" value={x.format ?? '—'} />
            <CondCell label="Délai souhaité" value={x.delai_souhaite ? dateFr(x.delai_souhaite) : '—'} />
            <CondCell label="Statut" value={STATUT_FR[x.statut] ?? x.statut} />
            <CondCell label="Publié" value={dateFr(x.created_at)} />
          </View>
        </View>
      </ScrollView>

      {editable && (
        <View style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
          <Button
            label="Modifier"
            variant="soft"
            style={{ flex: 1 }}
            onPress={() => router.push(`/exchange/create?id=${id}` as any)}
          />
          <Button
            label="Supprimer"
            variant="ghost"
            style={{ flex: 1 }}
            onPress={remove}
            disabled={deleting}
          />
        </View>
      )}
    </View>
  );
}

function CondCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.condCell, shadows.card]}>
      <Text style={styles.condL}>{label}</Text>
      <Text style={styles.condV}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 18 },
  name: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 22, flex: 1 },

  flow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  side: { flex: 1, padding: 18, backgroundColor: colors.mist, borderRadius: 14 },
  flowL: { ...typography.tiny, fontSize: 10, letterSpacing: 1.6, marginBottom: 4 },
  flowV: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 16, lineHeight: 20 },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condCell: {
    width: '48%',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  condL: { ...typography.small, fontSize: 12 },
  condV: { ...typography.bodyMedium, fontSize: 14 },

  dock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    gap: 10,
  },
});
```

- [ ] **Step 9: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS — no errors anywhere (this clears the intentional Task 7 failures).

- [ ] **Step 10: Run the full mobile test suite**

Run (in `mobile/`): `npm test`
Expected: PASS (`client.test.ts` 4 tests, `echange.test.ts` 5 tests — 9 total).

- [ ] **Step 11: Commit**

```bash
git add mobile/src/utils/echange.ts mobile/src/utils/echange.test.ts mobile/src/utils/format.ts mobile/src/components/ExchangeCard.tsx mobile/app/exchange/create.tsx "mobile/app/exchange/[id].tsx"
git commit -m "feat(mobile): rewrite exchange screens against the real Echange shape, add edit/delete"
```

---

## Task 9: Mobile — new `payment-history.tsx` screen

**Files:**
- Create: `mobile/src/utils/refund.ts`, `mobile/src/utils/refund.test.ts`
- Create: `mobile/app/payment-history.tsx`
- Modify: `mobile/app/_layout.tsx`
- Modify: `mobile/app/(tabs)/profil.tsx`

**Ground truth used:** `mobile/app/(tabs)/profil.tsx` has a dead `MenuRow` (`label="Moyens de paiement"`, no `onPress`) that this task wires to the new screen. `mobile/app/booking/payment.tsx`'s `submitting` state + try/finally pattern isn't needed here (this screen is read-only plus navigation, no mutation) — it's used in Task 10 instead. List style follows `mobile/app/(tabs)/evenements.tsx`'s list-of-`Card`s pattern.

- [ ] **Step 1: Write the failing test for the mobile refund eligibility helper**

Create `mobile/src/utils/refund.test.ts`:

```typescript
import { canRequestRefund } from './refund';
import type { PaymentRecord, Remboursement } from '@data/types';

const paiement = (over: Partial<PaymentRecord> = {}): PaymentRecord => ({
  id: 1, reference: 'TX-1', client_id: 1, praticien_id: null,
  montant_brut: 100, commission: 10, montant_net_praticien: 90,
  moyen_paiement: 'Carte', statut: 'paid', date_paiement: null,
  created_at: '2026-07-01T00:00:00Z', praticien: null,
  ...over,
});
const remb = (over: Partial<Remboursement> = {}): Remboursement => ({
  id: 9, reference: 'RMB-1', client_id: 1, paiement_id: 1, praticien_id: null,
  montant: 100, motif: 'x', description: null, statut: 'en_attente',
  commentaire_admin: null, date_traitement: null, date_remboursement: null,
  documents: null, created_at: '2026-07-01T00:00:00Z',
  ...over,
});

describe('canRequestRefund', () => {
  it('is false when the paiement is not paid', () => {
    expect(canRequestRefund(paiement({ statut: 'en_attente' }), [])).toBe(false);
  });
  it('is true for a paid paiement with no remboursement rows', () => {
    expect(canRequestRefund(paiement(), [])).toBe(true);
  });
  it('is false when a non-terminal remboursement already exists for it', () => {
    expect(canRequestRefund(paiement(), [remb({ statut: 'en_attente' })])).toBe(false);
  });
  it('is true when the only remboursement for it is terminal (refuse/completed)', () => {
    expect(canRequestRefund(paiement(), [remb({ statut: 'refuse' })])).toBe(true);
  });
  it('ignores remboursements tied to a different paiement', () => {
    expect(canRequestRefund(paiement(), [remb({ paiement_id: 2, statut: 'en_attente' })])).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- refund`
Expected: FAIL — `./refund` does not exist.

- [ ] **Step 3: Write the helper**

Create `mobile/src/utils/refund.ts`:

```typescript
import type { PaymentRecord, Remboursement } from '@data/types';

/**
 * Mirrors the backend's own rule in server/src/remboursements/remboursements.service.ts
 * (store(): paiement must be 'paid', and no existing non-terminal remboursement
 * for that paiement — terminal statuses are 'refuse' and 'completed'). Also
 * mirrors web/lib/refund.js — kept separate per this codebase's no-shared-code
 * convention.
 */
const TERMINAL_REMBOURSEMENT_STATUSES = ['refuse', 'completed'];

export function canRequestRefund(paiement: PaymentRecord, remboursements: Remboursement[]): boolean {
  if (!paiement || paiement.statut !== 'paid') return false;
  return !remboursements.some(
    (r) => r.paiement_id === paiement.id && !TERMINAL_REMBOURSEMENT_STATUSES.includes(r.statut),
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `mobile/`): `npm test -- refund`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the screen**

Create `mobile/app/payment-history.tsx`:

```tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@components/Badge';
import { Card } from '@components/Card';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { paiementRepo, remboursementRepo } from '@data/repos';
import { dateFr } from '@utils/format';
import { canRequestRefund } from '@utils/refund';

const STATUT_FR: Record<string, string> = { paid: 'Payé', en_attente: 'En attente', rembourse: 'Remboursé' };
const STATUT_VARIANT: Record<string, 'verified' | 'online' | 'novice' | 'soft'> = {
  paid: 'verified', en_attente: 'novice', rembourse: 'soft',
};

export default function PaymentHistory() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: paiements = [], isLoading } = useQuery({
    queryKey: ['paiements'],
    queryFn: paiementRepo.list,
  });
  const { data: remboursements = [] } = useQuery({
    queryKey: ['remboursements'],
    queryFn: remboursementRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Historique des paiements" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <Text style={[typography.small, { padding: 20 }]}>Chargement…</Text>
        ) : paiements.length === 0 ? (
          <Text style={[typography.small, { padding: 20 }]}>Aucun paiement pour le moment.</Text>
        ) : (
          paiements.map((p) => (
            <Card key={p.id} style={styles.row}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ref}>{p.reference}</Text>
                  <Text style={styles.sub}>
                    {p.praticien ? `${p.praticien.firstname} ${p.praticien.lastname}` : 'N/A'} · {dateFr(p.date_paiement)}
                  </Text>
                </View>
                <Badge
                  label={STATUT_FR[p.statut ?? ''] ?? p.statut ?? '—'}
                  variant={STATUT_VARIANT[p.statut ?? ''] ?? 'soft'}
                />
              </View>
              <View style={styles.foot}>
                <Text style={styles.amount}>{p.montant_brut.toFixed(2)} €</Text>
                <Text style={styles.method}>{p.moyen_paiement}</Text>
              </View>
              {canRequestRefund(p, remboursements) && (
                <Pressable
                  style={styles.refundBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/refund-request',
                      params: {
                        paiementId: String(p.id),
                        reference: p.reference,
                        montant: p.montant_brut.toFixed(2),
                      },
                    } as any)
                  }
                >
                  <Text style={styles.refundLabel}>Demander un remboursement</Text>
                </Pressable>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  ref: { ...typography.bodyMedium, fontSize: 14.5 },
  sub: { ...typography.tiny, marginTop: 3 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  amount: { ...typography.price, fontSize: 18 },
  method: { ...typography.small, fontSize: 12 },
  refundBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.inkAlpha06,
    alignItems: 'center',
  },
  refundLabel: { ...typography.bodyMedium, fontSize: 13, color: colors.violet2 },
});
```

- [ ] **Step 6: Register the screen in the root Stack**

In `mobile/app/_layout.tsx`, add a new `Stack.Screen` entry right after `exchange/create`:

```tsx
            <Stack.Screen name="exchange/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="payment-history" />
            <Stack.Screen name="review" options={{ presentation: 'modal' }} />
```

(`refund-request` is added in Task 10, right after `payment-history`.)

- [ ] **Step 7: Wire the dead "Moyens de paiement" row**

In `mobile/app/(tabs)/profil.tsx`, change:

```tsx
          <MenuRow icon={<Icon name="card" size={18} color={colors.ink} />} label="Moyens de paiement" />
```

to:

```tsx
          <MenuRow
            icon={<Icon name="card" size={18} color={colors.ink} />}
            label="Moyens de paiement"
            onPress={() => router.push('/payment-history' as any)}
          />
```

(`router` is already destructured at the top of this file via `const router = useRouter();` — no new import needed.)

- [ ] **Step 8: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Run the full mobile test suite**

Run (in `mobile/`): `npm test`
Expected: PASS (`client.test.ts` 4, `echange.test.ts` 5, `refund.test.ts` 5 — 14 total).

- [ ] **Step 10: Commit**

```bash
git add mobile/src/utils/refund.ts mobile/src/utils/refund.test.ts mobile/app/payment-history.tsx mobile/app/_layout.tsx "mobile/app/(tabs)/profil.tsx"
git commit -m "feat(mobile): add payment-history screen"
```

---

## Task 10: Mobile — new `refund-request.tsx` screen

**Files:**
- Create: `mobile/app/refund-request.tsx`
- Modify: `mobile/app/_layout.tsx`

**Design decision — one screen, two concerns:** per fixed decision 2 ("reuse the existing refund-request screen... for the client's own refund history + cancel action"), this single screen does double duty rather than splitting into two files (matching the task's file list, which names only one new refund screen): it **always** shows the client's refund-request history with cancel actions (`GET /api/remboursements/client`, cancel via `POST /api/remboursements/client/:id/cancel` while `statut` is `en_attente`/`en_cours`), and **additionally** shows a "Nouvelle demande" form at the top when opened with a `paiementId` param (the only real entry point, from `payment-history.tsx`'s per-row button built in Task 9). Uses `booking/payment.tsx`'s established `submitting` + try/finally pattern for both mutations (submit, cancel). No file-picker dependency — same documented scope cut as Task 8's échange forms (backend's `documents` upload is optional).

- [ ] **Step 1: Write the screen**

Create `mobile/app/refund-request.tsx`:

```tsx
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@components/Badge';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { remboursementRepo } from '@data/repos';

const STATUT_FR: Record<string, string> = {
  en_attente: 'En attente', en_cours: 'En cours', approuve: 'Approuvé', refuse: 'Refusé', completed: 'Complété',
};
const STATUT_VARIANT: Record<string, 'verified' | 'online' | 'novice' | 'soft'> = {
  en_attente: 'novice', en_cours: 'online', approuve: 'verified', refuse: 'soft', completed: 'verified',
};

export default function RefundRequest() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { paiementId, reference, montant } = useLocalSearchParams<{
    paiementId?: string; reference?: string; montant?: string;
  }>();

  const [motif, setMotif] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: remboursements = [], isLoading } = useQuery({
    queryKey: ['remboursements'],
    queryFn: remboursementRepo.list,
  });

  const submit = async () => {
    if (!paiementId) return;
    if (!motif.trim()) {
      Alert.alert('Motif requis', 'Merci de préciser le motif de la demande.');
      return;
    }
    setSubmitting(true);
    try {
      await remboursementRepo.create({
        paiement_id: Number(paiementId),
        motif: motif.trim(),
        description: description.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['remboursements'] });
      await queryClient.invalidateQueries({ queryKey: ['paiements'] });
      Alert.alert('Demande envoyée', 'Votre demande de remboursement a été transmise.');
      router.back();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = (id: number) => {
    Alert.alert('Annuler la demande', "Confirmer l'annulation de cette demande de remboursement ?", [
      { text: 'Garder', style: 'cancel' },
      {
        text: 'Annuler la demande',
        style: 'destructive',
        onPress: async () => {
          try {
            await remboursementRepo.cancel(id);
            await queryClient.invalidateQueries({ queryKey: ['remboursements'] });
          } catch (err: any) {
            Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Remboursement" backIcon="close" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {paiementId && (
          <>
            <Text style={styles.h}>Nouvelle demande</Text>
            {reference && (
              <Text style={styles.sub}>Transaction {reference} · {montant} €</Text>
            )}
            <View style={{ marginTop: 14 }}>
              <Input label="Motif" value={motif} onChangeText={setMotif} placeholder="Ex. Annulation du rendez-vous" />
              <Input
                label="Description (optionnel)"
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Détails complémentaires…"
              />
            </View>
            <Button label="Envoyer la demande" onPress={submit} disabled={submitting} />
          </>
        )}

        <Text style={[styles.h, { marginTop: 28 }]}>Mes demandes</Text>
        {isLoading ? (
          <Text style={typography.small}>Chargement…</Text>
        ) : remboursements.length === 0 ? (
          <Text style={typography.small}>Aucune demande de remboursement.</Text>
        ) : (
          remboursements.map((r) => (
            <Card key={r.id} style={{ marginBottom: 10 }}>
              <View style={styles.rRow}>
                <Text style={styles.ref}>{r.reference}</Text>
                <Badge label={STATUT_FR[r.statut] ?? r.statut} variant={STATUT_VARIANT[r.statut] ?? 'soft'} />
              </View>
              <Text style={styles.sub}>{r.motif} · {r.montant.toFixed(2)} €</Text>
              {(r.statut === 'en_attente' || r.statut === 'en_cours') && (
                <Pressable style={styles.cancelBtn} onPress={() => cancel(r.id)}>
                  <Text style={styles.cancelLabel}>Annuler la demande</Text>
                </Pressable>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 20, color: colors.ink },
  sub: { ...typography.small, marginTop: 4 },
  rRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { ...typography.bodyMedium, fontSize: 14.5 },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },
  cancelLabel: { ...typography.small, fontSize: 13, color: colors.danger },
});
```

- [ ] **Step 2: Register the screen in the root Stack as a modal**

In `mobile/app/_layout.tsx`, add the entry right after `payment-history` (added in Task 9):

```tsx
            <Stack.Screen name="payment-history" />
            <Stack.Screen name="refund-request" options={{ presentation: 'modal' }} />
            <Stack.Screen name="review" options={{ presentation: 'modal' }} />
```

- [ ] **Step 3: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Run the full mobile test suite**

Run (in `mobile/`): `npm test`
Expected: PASS (`client.test.ts` 4, `echange.test.ts` 5, `refund.test.ts` 5 — 14 total).

- [ ] **Step 5: Commit**

```bash
git add mobile/app/refund-request.tsx mobile/app/_layout.tsx
git commit -m "feat(mobile): add refund-request screen"
```

---

## Task 11: Full cross-codebase verification

**Files:** none (verification only — no commit).

- [ ] **Step 1: Backend regression check**

Run (in `server/`): `npm run test:e2e`
Expected: PASS, unchanged — no backend files were touched by this plan. This confirms `paiements.e2e-spec.ts` / `echanges.e2e-spec.ts` / `remboursements.e2e-spec.ts` (the exact contracts this plan wired against) are still green.

- [ ] **Step 2: Web full check**

Run (in `web/`): `npm test`
Expected: PASS, 15 tests (`api.test.js` 4, `refund.test.js` 6, `echange.test.js` 5).

Run (in `web/`): `npm run build`
Expected: build succeeds — `/compte/paiements`, `/compte/echanges`, `/compte/remboursements` all compile; no page exports both `metadata` and client hooks.

- [ ] **Step 3: Mobile full check**

Run (in `mobile/`): `npm test`
Expected: PASS, 14 tests (`client.test.ts` 4, `echange.test.ts` 5, `refund.test.ts` 5).

Run (in `mobile/`): `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 4: Manual smoke check (documented, not automated — no component-rendering test harness exists on web per Plan 01's scope, and RN screens aren't unit-rendered in this codebase either)**

With `server/` running on `:8000` and a seeded client (per `server/test/utils/create-test-app.ts`'s `seedClientUser` pattern, or a real Plan 03 signup) logged in on both frontends:
1. Web: `/compte/paiements` lists real transactions, no fake card section; "Demander un remboursement" opens the form, submits, and the row's action disappears afterward (re-fetch shows the new non-terminal remboursement blocking re-request).
2. Web: `/compte/echanges` lists real échanges; "Proposer un échange" creates one; "Modifier"/"Retirer" work while `statut` is `en_attente`/`lu` and disappear once an admin marks it `traite` (or any other non-editable status).
3. Web: `/compte/remboursements` lists the same requests created above; "Annuler" works while cancellable.
4. Mobile: Profil → "Moyens de paiement" opens `payment-history`; a paid transaction's "Demander un remboursement" opens `refund-request` pre-filled with the transaction reference, submits, and the request appears in "Mes demandes" with a working "Annuler la demande".
5. Mobile: `/exchange` list, create (+), detail, Modifier (pre-filled), Supprimer all round-trip against the real backend.

This step has no pass/fail command output to paste — it's a checklist the executing engineer ticks off by hand before considering the plan done.

---

## Self-review

**1. Spec coverage** — walked every numbered/bulleted requirement in the brief against the tasks above:
- Payments history (web + mobile): Tasks 3, 9.
- Échanges CRUD (web + mobile, including the modal-wiring precedent): Tasks 1, 4, 8.
- Remboursements request/cancel (web + mobile): Tasks 3, 5, 10.
- Fixed decision 1 (no backend changes): honored — every task calls an existing endpoint; none adds a controller/service/DTO.
- Fixed decision 2 (refund entry point + dedicated pages): Task 3 (per-row action on paiements), Task 5 (`compte/remboursements`), Task 9 (mobile payment-history action), Task 10 (mobile refund-request, doubling as history+cancel).
- Fixed decision 3 (real `onSubmit`/`onConfirm` into `FormModal`/`ConfirmModal`): Task 1 fixes the components to actually support it; Tasks 3–5 are the first real call sites.
- Fixed decision 4 (payment methods out of scope): Task 3 removes the fake `CARDS` section outright rather than leaving it fake.
- Fixed decision 5 (test approach): pure logic (`canRequestRefund`, `buildEchangeSujet`, FormData branching) is TDD'd on both platforms; wiring is verified via `build`/`typecheck`; repo functions that are thin `api.*` wrappers are explicitly *not* given dedicated tests, with the reasoning stated inline in Task 7.
- Mobile-specific asks: `paiementRepo`/`remboursementRepo` (Task 7), `exchangeRepo` full CRUD (Task 7), dead "Moyens de paiement" row (Task 9), `_layout.tsx` registration (Tasks 9–10), échange edit/delete affordance decided and built (Task 8), `payment-history.tsx`/`refund-request.tsx` built from scratch (Tasks 9–10).
- `exchange/index.tsx` explicitly called out as needing no change, with the reasoning (shape-agnostic) rather than silently skipped.

**2. Placeholder scan** — searched the draft for "TBD", "TODO", "handle appropriately", "similar to Task N", and code fences without real content. None found; every step that touches code shows the complete resulting file or the complete new function, not a description of it. The one deliberate scope cut (no mobile file-picker dependency) is stated as a decision with a reason, not left as an unstated gap.

**3. Type/signature consistency** — cross-checked names across tasks:
- `Exchange`/`EchangeInput`/`PaymentRecord`/`Remboursement` (Task 7) are the exact shapes consumed in Tasks 8–10 (`x.sujet`, `x.ce_que_je_propose`, `p.montant_brut`, `r.paiement_id`, etc. all trace back to the Task 7 interfaces; `EchangeInput`'s omission of `type` in `update()`'s signature matches every call site never passing `type` on edit).
- `exchangeRepo.{list,byId,create,update,remove}`, `paiementRepo.{list,byId}`, `remboursementRepo.{list,create,byId,cancel}` (Task 7) are called with matching names and argument shapes in Tasks 8–10 — no call site uses a method not defined in Task 7 (e.g. no stray `.delete(` vs `.remove(`).
- `canRequestRefund(paiement, remboursements)` has the identical parameter order and terminal-status list (`['refuse', 'completed']`) in both `web/lib/refund.js` (Task 3) and `mobile/src/utils/refund.ts` (Task 9) — deliberately kept in sync since both mirror the same backend rule.
- `buildEchangeSujet(propose, recherche)` has identical behavior (same four branches, same 255-char truncation) in `web/lib/echange.js` (Task 4) and `mobile/src/utils/echange.ts` (Task 8).
- Query keys are consistent within each platform: web uses `['paiements']`, `['remboursements']`, `['echanges']` everywhere they're fetched or invalidated (Tasks 3–5); mobile uses the same string keys (Tasks 7–10) — a refund submitted from `payment-history.tsx` invalidates the same `['remboursements']`/`['paiements']` keys that `refund-request.tsx` and the échange screens read.
- Backend field names are used verbatim on both frontends (`montant_brut`, `date_paiement`, `motif`, `statut`, `ce_que_je_propose`, `delai_souhaite`, …) — no camelCase mapping layer was introduced, per the ground-truth constraint.

No gaps found; nothing required fixing after this pass.

## Exit criteria → unblocks Plan 07

A logged-in client can, on both web and mobile: view their real payment history, request and cancel refunds against real paid transactions, and create/edit/delete their own échanges — all backed live by the existing NestJS endpoints, with no mock data left in any of the three touched domains. `FormModal`/`ConfirmModal` on web now correctly support real async mutations, and both api clients support file uploads — reusable by every later plan that needs a confirm/form modal or a multipart request. The `compte/*` and mobile account-area screen-splitting pattern (Server wrapper + Client body on web; repo-layer + `useQuery`/`useQueryClient` on mobile) is now proven twice over (payments, échanges, remboursements), which is exactly the pattern **Plan 07** (avis/favorites) reuses for its own account-area screens (`compte/avis`, `compte/favoris`, mobile `review.tsx`).

