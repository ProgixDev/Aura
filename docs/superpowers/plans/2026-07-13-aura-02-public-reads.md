# Aura Plan 02 — Public Reads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static mock-data imports with real backend calls for the 5 already-supported public read domains — disciplines, praticiens, events, articles, cercles — on both `web/` and `mobile/`, and build the two mobile screen pairs (cercles, blog) that don't exist yet.

**Architecture:** Two small, justified backend additions (an articles `?slug=` filter and an events `?status=` filter, both mirroring an existing filter pattern already in each service). On `web/`, the 5 domains' pages become Client Components using `@tanstack/react-query`'s `useQuery` (the app-wide `<Providers>` from Plan 01 already supports this everywhere), reading through the existing `web/lib/api.js` client; this means each converted page loses its `generateStaticParams`/`generateMetadata`/static `metadata` export (a Client Component cannot export them — Next.js errors at build time otherwise), which is an accepted trade-off for this plan. On `mobile/`, only `src/data/repos/index.ts`'s function *bodies* change (per its own header comment, screens never need to change) to call the existing `src/data/api/client.ts`, plus two new repos (`cercleRepo`, `articleRepo`) and two new screen pairs.

Both platforms hit the same structural problem: the existing UI (built against rich mock data) expects fields the real backend entities don't have (photos, ratings, review counts, decorative accent colors, fake feed posts, a barter "exchange" offer, etc.). The rule applied consistently everywhere in this plan: **real backend fields map straight through; fields with no backend source are never invented** — they're either a single fixed neutral default (for purely decorative, non-factual choices like a card's accent gradient), an honest empty/zero state (for factual-but-not-yet-tracked things like ratings, until Plan 07's `avis` module exists), or the UI section is removed outright when there's nothing real to show (matching the explicit precedent set for cercles' fake feed/members below). Where this requires a small pure mapping function, it's extracted and unit-tested; pure JSX rewiring is verified by `npm run build` (web) / `npm run typecheck` (mobile) instead, per the project's established testing policy.

**Tech Stack:** NestJS 11 + TypeORM + better-sqlite3 (e2e) — unchanged from Plan 01; Next.js 15 (React 19) + `@tanstack/react-query` v5 + Vitest — unchanged from Plan 01; Expo 54 / React Native 0.81 (TS) + `@tanstack/react-query` v5 + jest-expo — unchanged from Plan 01.

**Reference:** [master roadmap](2026-07-13-aura-master-roadmap.md) · [Plan 01 — Foundation](2026-07-13-aura-01-foundation.md) · [checklist](../../frontend-functionality-checklist.md)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/articles/articles.service.ts` (modify) | Add optional `?slug=` filter to `index()` |
| `server/test/articles.e2e-spec.ts` (modify) | e2e test for the slug filter |
| `server/src/events/events.service.ts` (modify) | Add optional `?status=` filter to `index()` |
| `server/test/events.e2e-spec.ts` (modify) | e2e test for the status filter |
| `web/lib/data/find-by-slug.js` (create) | Generic "find item by slug in a fetched list" helper |
| `web/lib/data/find-by-slug.test.js` (create) | Vitest tests for the helper |
| `web/app/(site)/disciplines/page.jsx` (modify) | Disciplines list — real fetch |
| `web/app/(site)/discipline/[slug]/page.jsx` (modify) | Discipline detail — real fetch + slug resolution |
| `web/app/(site)/cercles/page.jsx` (modify) | Cercles list — real fetch, drop fake status/metrics |
| `web/app/(site)/cercle/[id]/page.jsx` (modify) | Cercle detail — real fetch, drop fake feed/members |
| `web/lib/data/event-adapter.js` (create) | Maps backend `Event` rows to the shape `EventCard`/pages already render |
| `web/lib/data/event-adapter.test.js` (create) | Vitest tests for the adapter |
| `web/app/(site)/evenements/page.jsx` (modify) | Events list — real fetch, published only |
| `web/app/(site)/evenement/[id]/page.jsx` (modify) | Event detail — real fetch, real `animateurs[]` as hosts |
| `web/app/(site)/blog/page.jsx` (modify) | Blog list — real fetch, published only |
| `web/app/(site)/blog/[slug]/page.jsx` (modify) | Blog detail — real fetch via slug filter |
| `web/lib/data/praticien-adapter.js` (create) | Maps backend `Praticien` rows to the shape `PractitionerCard`/`ProfileBody` already render |
| `web/lib/data/praticien-adapter.test.js` (create) | Vitest tests for the adapter |
| `web/app/(site)/praticiens/page.jsx` (modify) | Praticiens list — real fetch, same client-side filter/sort |
| `web/app/(site)/praticien/[id]/page.jsx` (modify) | Praticien detail — real fetch |
| `web/app/(site)/praticien/[id]/ProfileBody.jsx` (modify) | Guard the two sections with no real backend data (exchange offer, "démarche") |
| `mobile/src/data/repos/index.ts` (modify) | `mapPraticien`/`mapDiscipline`/`mapEvent` adapters; `practitionerRepo`, `disciplineRepo`, `eventRepo` bodies now call the API; adds `cercleRepo`, `articleRepo` |
| `mobile/src/data/repos/index.test.ts` (create) | jest-expo tests for the adapter functions |
| `mobile/src/data/types.ts` (modify) | Add `Circle` and `Article` types |
| `mobile/src/components/CircleCard.tsx` (create) | Forked from `EventCard.tsx` — cercle list card |
| `mobile/app/cercles/index.tsx` (create) | Cercles list screen |
| `mobile/app/cercles/[id].tsx` (create) | Cercle detail screen |
| `mobile/app/blog/index.tsx` (create) | Blog list screen |
| `mobile/app/blog/[slug].tsx` (create) | Blog detail screen |
| `mobile/app/_layout.tsx` (modify) | Register the 4 new routes |

---

## Task 1: Backend — `GET /api/articles` slug filter

**Files:**
- Modify: `server/src/articles/articles.service.ts`
- Test: `server/test/articles.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**

In `server/test/articles.e2e-spec.ts`, add a new test inside the existing `describe('articles', ...)` block, after the `'index filters by status and categorie'` test:

```typescript
  it('index filters by slug', async () => {
    const first = await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Cible Slug' }).expect(201);
    const targetSlug = first.body.data.slug;
    await http().post('/api/articles/create-article')
      .send({ ...base, titre: 'Un Autre Article Plus Recent' }).expect(201);

    const res = await http().get(`/api/articles?slug=${targetSlug}&per_page=1`).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe(targetSlug);
  });
```

This must go **after** the second article is created, so the assertion actually exercises the filter: without it, `index()` ignores the unknown `slug` query param and just returns the newest article (`created_at DESC`) — which by then is `'Un Autre Article Plus Recent'`, not the target.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- articles.e2e-spec.ts`
Expected: FAIL — `res.body.data[0].slug` is `'un-autre-article-plus-recent'`, not `targetSlug`.

- [ ] **Step 3: Add the filter**

In `server/src/articles/articles.service.ts`, in `index()`, add one line mirroring the existing `status`/`categorie` filters:

```typescript
  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.articles.createQueryBuilder('a');
    if (query.status !== undefined) qb.andWhere('a.status = :status', { status: query.status });
    if (query.categorie !== undefined) qb.andWhere('a.categorie = :cat', { cat: query.categorie });
    if (query.slug !== undefined) qb.andWhere('a.slug = :slug', { slug: query.slug });
    qb.orderBy('a.created_at', 'DESC');
    const { data, pagination, lastPage } = await paginateQb(qb, page, perPage);
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:e2e -- articles.e2e-spec.ts`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 5: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/articles/articles.service.ts server/test/articles.e2e-spec.ts
git commit -m "feat(server): add slug filter to GET /api/articles"
```

---

## Task 2: Backend — `GET /api/events` status filter

**Files:**
- Modify: `server/src/events/events.service.ts`
- Test: `server/test/events.e2e-spec.ts`

- [ ] **Step 1: Write the failing test**

In `server/test/events.e2e-spec.ts`, add a new test inside the existing `describe('events', ...)` block, after the `'GET / paginates'` test:

```typescript
  it('index filters by status', async () => {
    const created = await http().post('/api/events/create-event').send(payload()).expect(201);
    // newly created events default to status 'brouillon' (Event entity default)

    const published = await http().get('/api/events?status=publié').expect(200);
    expect(published.body.data.find((e: any) => e.id === created.body.data.id)).toBeUndefined();

    const drafts = await http().get('/api/events?status=brouillon').expect(200);
    expect(drafts.body.data.some((e: any) => e.id === created.body.data.id)).toBe(true);
  });
```

Before the fix, `?status=publié` ignores the filter and returns every event including the just-created draft, so `.find(...)` finds it and the first assertion fails.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:e2e -- events.e2e-spec.ts`
Expected: FAIL — the draft event is found in the `status=publié` results.

- [ ] **Step 3: Add the filter**

In `server/src/events/events.service.ts`, replace the `index()` method:

```typescript
  async index(query: Record<string, any>, req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.events.createQueryBuilder('e');
    if (query.status !== undefined) qb.andWhere('e.status = :status', { status: query.status });
    const { data, pagination, lastPage } = await paginateQb(qb, page, perPage);
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:e2e -- events.e2e-spec.ts`
Expected: PASS.

- [ ] **Step 5: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/events/events.service.ts server/test/events.e2e-spec.ts
git commit -m "feat(server): add status filter to GET /api/events"
```

**Note for the next tasks:** no admin action currently transitions an event's `status` away from its `'brouillon'` default — `CreateEventDto`/`UpdateEventDto` don't expose a `status` field and, unlike articles, events has no `publish()`/`archive()` endpoint. This means the public event list (Task 5) will legitimately show zero events against real HTTP-created data until a status-transition path exists (tracked separately, likely Plan 06 admin work). The filter itself is still correct, tested, and forward-compatible — this is a content/seed-data gap, not a bug in the filter.

---

## Task 3: Web — disciplines list + detail wiring

**Files:**
- Create: `web/lib/data/find-by-slug.js`
- Test: `web/lib/data/find-by-slug.test.js`
- Modify: `web/app/(site)/disciplines/page.jsx`, `web/app/(site)/discipline/[slug]/page.jsx`

Ground truth: `GET /api/disciplines` returns the **full unpaginated list** as a plain array in `data` (`DisciplinesService.index()` calls `this.disciplines.find()` directly). The `Discipline` entity has real `nom`, `slug`, `tonalite`, `glyphe`, `accroche` columns — no `count` (praticiens per discipline), no long-form `intro`, no `pullQuote`, no structured `expectations[]`. Those four fields have zero backend source and are removed from the pages below rather than fabricated; `accroche` (a real short tagline) is reused as the detail page's intro line since that's genuine content, not an invention.

- [ ] **Step 1: Write the failing test**

Create `web/lib/data/find-by-slug.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { findBySlug } from './find-by-slug';

describe('findBySlug', () => {
  const list = [{ slug: 'reiki', nom: 'Reiki' }, { slug: 'hypnose', nom: 'Hypnose' }];

  it('returns the item whose slug matches', () => {
    expect(findBySlug(list, 'hypnose')).toEqual({ slug: 'hypnose', nom: 'Hypnose' });
  });

  it('returns undefined when no item matches', () => {
    expect(findBySlug(list, 'inconnu')).toBeUndefined();
  });

  it('returns undefined for an empty or missing list', () => {
    expect(findBySlug([], 'reiki')).toBeUndefined();
    expect(findBySlug(undefined, 'reiki')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — `./find-by-slug` does not exist.

- [ ] **Step 3: Write the helper**

Create `web/lib/data/find-by-slug.js`:

```javascript
// Generic client-side lookup used when a route's slug must be resolved
// against a small, already-fetched list (e.g. the full disciplines list).
export function findBySlug(list, slug) {
  return (list || []).find((item) => item.slug === slug);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS.

- [ ] **Step 5: Rewrite the disciplines list page**

Replace the full contents of `web/app/(site)/disciplines/page.jsx`:

```jsx
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

export default function DisciplinesPage() {
  const { data } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const disciplines = data?.data ?? [];

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '70%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}
      >
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Explorer</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Toutes les <span className="italic" style={{ color: 'var(--violet)' }}>disciplines</span> du soin.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto' }}>
            Du magnétisme à l’hypnose, chaque pratique a sa porte d’entrée. Trouvez celle qui vous appelle, et le praticien qui l’incarne.
          </p>
          <div className="row gap-6" style={{ justifyContent: 'center', marginTop: 40, color: 'rgba(255,255,255,0.75)', flexWrap: 'wrap' }}>
            <div className="center">
              <div className="serif" style={{ fontSize: 30, color: '#fff' }}>{disciplines.length}</div>
              <div className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>disciplines</div>
            </div>
            <div className="center">
              <div className="serif" style={{ fontSize: 30, color: '#fff' }}>4,9 / 5</div>
              <div className="tiny" style={{ color: 'rgba(255,255,255,0.6)' }}>satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Le catalogue</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>Choisissez votre pratique</h2>
            </div>
            <Link href="/praticiens" className="more">Tous les praticiens →</Link>
          </div>
          <div className="grid grid-3">
            {disciplines.map((d) => (
              <Link key={d.slug} href={`/discipline/${d.slug}`} className="card card-pad card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 14 }}>
                  <span className={`tile-icon glyph-${d.tonalite}`} style={{ fontSize: 22 }}>{d.glyphe}</span>
                </div>
                <h3 className="h-3" style={{ marginBottom: 6 }}>{d.nom}</h3>
                <p className="body flex-1" style={{ marginBottom: 14 }}>{d.accroche}</p>
                <span className="row gap-1 small accent" style={{ fontWeight: 500 }}>
                  Découvrir <Icon name="arrowRight" size={14} color="var(--violet-2)" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '25%', '--orb-y': '35%', '--orb-1': '#B8D4C2', '--orb-2': '#7B5FCF', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Vous hésitez encore ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>
              Décrivez-nous ce que vous traversez — nous vous orientons vers la discipline et le praticien adaptés.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton modal="contact" payload={{ name: 'Aura' }} className="btn btn-aurora btn-lg">Être guidé·e</ModalButton>
              <Link href="/praticiens" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Parcourir les praticiens</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

Note: `export const metadata` is removed — a Client Component cannot export it (Next.js build error). The "4,9 / 5 satisfaction" tile was already hardcoded marketing copy in the original mock-era file (not derived from `disciplines`), so it's left as-is; the per-card praticien count and the "praticiens vérifiés" hero stat are removed since neither has a backend source.

- [ ] **Step 6: Rewrite the discipline detail page**

Replace the full contents of `web/app/(site)/discipline/[slug]/page.jsx`:

```jsx
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
```

Note: `generateStaticParams`/`generateMetadata` are removed (Client Component restriction). The "La pratique" pull-quote figure and the "Une séance type" expectations grid are removed — no backend source. The practitioner match switches from the old fragile `p.specialties.some(s => s.includes(d.name) || d.name.includes(s))` substring match to an exact `p.specialite === d.nom` match — still a heuristic (no FK between disciplines and praticiens in the schema), but no longer fuzzy. Matched praticiens render with only real fields (`Avatar` falls back to initials when no `src` is given, so no photo is needed).

- [ ] **Step 7: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add web/lib/data/find-by-slug.js web/lib/data/find-by-slug.test.js web/app/\(site\)/disciplines/page.jsx web/app/\(site\)/discipline/\[slug\]/page.jsx
git commit -m "feat(web): wire disciplines list and detail to the backend"
```

---

## Task 4: Web — cercles list + detail wiring

**Files:**
- Modify: `web/app/(site)/cercles/page.jsx`, `web/app/(site)/cercle/[id]/page.jsx`

Ground truth: the `Cercle` entity has only `id, nom, description, color, animateur, created_at, updated_at` — no `status`, no `slug`, no membership/feed/posts concept anywhere in the schema. This task drops the `status === 'active'` filter entirely (nothing to filter against), drops the fake member/post counts, drops the fuzzy `practitioners.find(p => p.name === c.lead)` animator lookup, and removes the entire fake `FEED` array and member-preview sidebar — there is nothing real behind any of them. `color` (a real hex column) is used directly as the card/hero accent.

- [ ] **Step 1: Rewrite the cercles list page**

Replace the full contents of `web/app/(site)/cercles/page.jsx`:

```jsx
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';

const WHY = [
  { i: 'users', t: 'Un groupe choisi', d: 'Des cercles à taille humaine, modérés, où chacun a sa place.' },
  { i: 'message', t: 'Le partage continu', d: 'Au-delà des événements ponctuels, la conversation se prolonge.' },
  { i: 'heart', t: 'Sans jugement', d: 'Un espace doux pour cheminer, poser des questions, témoigner.' },
];

export default function CerclesPage() {
  const { data } = useQuery({
    queryKey: ['cercles'],
    queryFn: () => api.get('/cercles'),
  });
  const cercles = data?.data ?? [];

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '66%', '--orb-y': '18%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}
      >
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Communauté</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Les <span className="italic" style={{ color: 'var(--violet)' }}>cercles</span> Aura.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 580, margin: '0 auto' }}>
            Cheminer seul·e, c’est bien. Ensemble, c’est plus doux. Les cercles Aura réunissent celles et ceux qui partagent une pratique, une ville, une intention — pour échanger toute l’année.
          </p>
        </div>
      </section>

      {/* WHY */}
      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {WHY.map((w) => (
              <div key={w.t} className="card card-pad">
                <span className="tile-icon tint-violet" style={{ marginBottom: 14 }}><Icon name={w.i} size={20} color="var(--violet-2)" /></span>
                <h3 className="h-3" style={{ marginBottom: 6 }}>{w.t}</h3>
                <p className="body">{w.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CERCLES GRID */}
      <section className="section-sm" style={{ background: 'var(--mist)' }}>
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Rejoindre</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>Les cercles ouverts</h2>
            </div>
          </div>
          <div className="grid grid-3">
            {cercles.map((c) => (
              <div key={c.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Link
                  href={`/cercle/${c.id}`}
                  className="aurora-dark grain"
                  style={{ height: 120, padding: 18, display: 'flex', alignItems: 'flex-end', '--orb-1': c.color || '#C4B0E8', '--orb-2': '#7B5FCF' }}
                >
                  <span className="serif" style={{ color: '#fff', fontSize: 21, fontWeight: 500, lineHeight: 1.15 }}>{c.nom}</span>
                </Link>
                <div className="card-pad flex-1" style={{ display: 'flex', flexDirection: 'column' }}>
                  {c.animateur && (
                    <p className="small" style={{ marginBottom: 10 }}>Animé par <strong>{c.animateur}</strong>.</p>
                  )}
                  {c.description && (
                    <p className="small muted flex-1" style={{ marginBottom: 14 }}>{c.description}</p>
                  )}
                  <div className="row gap-2">
                    <Link href={`/cercle/${c.id}`} className="btn btn-soft btn-sm flex-1">Découvrir</Link>
                    <ToastButton
                      message={`Vous avez rejoint « ${c.nom} » 🌿`}
                      tone="success"
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Rejoindre
                    </ToastButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '24%', '--orb-y': '32%', '--orb-1': '#B8D4C2', '--orb-2': '#7B5FCF', padding: 'clamp(40px,6vw,68px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Envie de créer votre cercle ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 28px' }}>
              Praticiens et membres engagés : ouvrez un espace autour de votre pratique ou de votre région.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ToastButton message="Demande envoyée — l’équipe Aura vous recontacte sous 48h." tone="success" className="btn btn-aurora btn-lg">
                Proposer un cercle
              </ToastButton>
              <Link href="/evenements" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Voir l’agenda</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Rewrite the cercle detail page**

Replace the full contents of `web/app/(site)/cercle/[id]/page.jsx`:

```jsx
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
        style={{ '--orb-x': '70%', '--orb-y': '20%', '--orb-1': c.color || '#C4B0E8', '--orb-2': '#7B5FCF', padding: '96px 0 100px' }}
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
```

Note: `generateStaticParams`/`generateMetadata` are removed (Client Component restriction). The entire two-column feed+sidebar layout, the `FEED` array, the fuzzy animator lookup, and the fake member-preview avatars are gone — nothing behind any of them was real.

- [ ] **Step 3: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/app/\(site\)/cercles/page.jsx web/app/\(site\)/cercle/\[id\]/page.jsx
git commit -m "feat(web): wire cercles list and detail to the backend"
```

---

## Task 5: Web — events list + detail wiring

**Files:**
- Create: `web/lib/data/event-adapter.js`
- Test: `web/lib/data/event-adapter.test.js`
- Modify: `web/app/(site)/evenements/page.jsx`, `web/app/(site)/evenement/[id]/page.jsx`

Ground truth: backend `Event` fields are `id, titre, type, dates: string[], lieu, prix, nombre_places, description, status`. `GET /api/events/:id` (only `:id`, not the list) also returns `animateurs[]` — each a full real `Praticien` row plus a `pivot: {role, ...}`. `EventCard.jsx` (shared with the home page, out of scope — not modified here) expects `{id, tone, kind, title, when, where, price, seatsLeft}`. `mapEvent` bridges that gap: `tone` (decorative only) gets one fixed default; `kind` comes from the real `type` field; `when`/`meta.dates` are formatted from the real `dates[]`; there is no bookings/registrations table yet (that's Plan 05's `rendez_vous`), so `seatsLeft` has no real source — it's set to `Infinity` so the "places restantes" warning badge (a `<= 5` check) never fires on data that doesn't exist, rather than inventing a number.

- [ ] **Step 1: Write the failing test**

Create `web/lib/data/event-adapter.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { formatEventDates, mapEvent } from './event-adapter';

describe('formatEventDates', () => {
  it('formats a single date', () => {
    expect(formatEventDates(['2026-08-01'])).toBe('1 août');
  });

  it('formats a date range', () => {
    expect(formatEventDates(['2026-08-01', '2026-08-03'])).toBe('1 août – 3 août');
  });

  it('returns an empty string for no dates', () => {
    expect(formatEventDates([])).toBe('');
    expect(formatEventDates(undefined)).toBe('');
  });
});

describe('mapEvent', () => {
  const row = {
    id: 4, titre: 'Retraite équinoxe', type: 'retraite', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: '120.00', nombre_places: 20, description: 'desc', status: 'publié',
  };

  it('maps real backend fields directly', () => {
    const e = mapEvent(row);
    expect(e.id).toBe(4);
    expect(e.title).toBe('Retraite équinoxe');
    expect(e.kind).toBe('RETRAITE');
    expect(e.where).toBe('Lyon');
    expect(e.price).toBe('120 €');
    expect(e.priceFrom).toBe(120);
    expect(e.seats).toBe(20);
  });

  it('never triggers the low-availability badge (no bookings backend yet)', () => {
    expect(mapEvent(row).seatsLeft <= 5).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — `./event-adapter` does not exist.

- [ ] **Step 3: Write the adapter**

Create `web/lib/data/event-adapter.js`:

```javascript
// Adapter: backend Event rows -> the shape EventCard / event pages already
// render. Fields with no backend source (tone, program, seatsLeft) get an
// honest neutral value instead of invented data — see plan Architecture notes.
const DEFAULT_TONE = 'violet';

export function formatEventDates(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return '';
  const fmt = (iso) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
  if (dates.length === 1) return fmt(dates[0]);
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

export function mapEvent(row) {
  const when = formatEventDates(row.dates);
  return {
    id: row.id,
    tone: DEFAULT_TONE,
    kind: (row.type || '').toUpperCase(),
    title: row.titre,
    when,
    where: row.lieu,
    price: `${Math.round(Number(row.prix))} €`,
    priceFrom: Number(row.prix),
    seats: row.nombre_places,
    // No bookings/registrations backend yet (Plan 05) — Infinity keeps the
    // "places restantes" warning from ever firing on data we don't have.
    seatsLeft: Number.POSITIVE_INFINITY,
    description: row.description,
    meta: { dates: when, place: row.lieu, seats: row.nombre_places },
    program: null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS.

- [ ] **Step 5: Rewrite the events list page**

Replace the full contents of `web/app/(site)/evenements/page.jsx`:

```jsx
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapEvent } from '@/lib/data/event-adapter';
import { EventCard } from '@/components/cards/EventCard';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

const KINDS = ['Tous', 'Retraites', 'Ateliers', 'Cercles', 'Formations', 'Sorties'];

export default function EvenementsPage() {
  const { data } = useQuery({
    queryKey: ['events', 'public'],
    queryFn: () => api.get('/events?status=publié&per_page=50'),
  });
  const events = (data?.data ?? []).map(mapEvent);

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '64%', '--orb-y': '16%', '--orb-1': '#A8C8E8', '--orb-2': '#7B5FCF', padding: '110px 0 120px', textAlign: 'center' }}
      >
        <div className="container-narrow reveal">
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Agenda</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '20px 0 22px' }}>
            Retraites & <span className="italic" style={{ color: 'var(--violet)' }}>événements</span>.
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 560, margin: '0 auto' }}>
            Des parenthèses pour reposer le système nerveux : retraites en nature, bains sonores, cercles de parole, ateliers. Encadrés par des praticiens vérifiés.
          </p>
        </div>
      </section>

      {/* FILTER CHIPS */}
      <section className="section-sm" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div className="row wrap gap-2">
            {KINDS.map((k, i) => (
              <span key={k} className={`chip ${i === 0 ? 'active' : ''}`}>{k}</span>
            ))}
            <Link href="/cercles" className="chip tone-violet" style={{ marginLeft: 'auto' }}>
              <Icon name="users" size={13} color="var(--violet-2)" /> Rejoindre un cercle
            </Link>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Prochainement</span>
              <h2 className="h-2" style={{ marginTop: 8 }}>{events.length} rendez-vous à venir</h2>
            </div>
          </div>
          <div className="grid grid-3">
            {events.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </div>
      </section>

      {/* CERCLES TEASER */}
      <section className="section-sm">
        <div className="container">
          <div className="card card-pad row between wrap gap-4" style={{ alignItems: 'center' }}>
            <div className="flex-1" style={{ minWidth: 280 }}>
              <span className="eyebrow">Communauté</span>
              <h2 className="h-3" style={{ margin: '8px 0 6px' }}>Les cercles Aura</h2>
              <p className="body">Au-delà des événements ponctuels, prolongez la rencontre dans nos cercles : des espaces de partage continus, en ligne et en présentiel.</p>
            </div>
            <Link href="/cercles" className="btn btn-primary">Découvrir les cercles</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="aurora-dark grain card" style={{ '--orb-x': '24%', '--orb-y': '32%', '--orb-1': '#E4C896', '--orb-2': '#7B5FCF', padding: 'clamp(40px,6vw,68px)', textAlign: 'center', borderRadius: 'var(--r-sheet)' }}>
            <h2 className="h-1" style={{ color: '#fff', marginBottom: 14 }}>Vous organisez un événement ?</h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 500, margin: '0 auto 28px' }}>
              Praticiens vérifiés : proposez vos retraites, ateliers et cercles à toute la communauté Aura.
            </p>
            <div className="row gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <ModalButton
                modal="form"
                payload={{ title: 'Proposer un événement', fields: [{ name: 'title', label: 'Titre de l’événement', type: 'text', required: true }, { name: 'kind', label: 'Type', type: 'select', options: ['Retraite', 'Atelier', 'Cercle', 'Formation', 'Sortie'], required: true }, { name: 'place', label: 'Lieu', type: 'text', required: true }, { name: 'date', label: 'Date', type: 'text' }, { name: 'desc', label: 'Description', type: 'textarea' }], submitLabel: 'Soumettre', successToast: 'Événement soumis — nous revenons vers vous sous 48h.' }}
                className="btn btn-aurora btn-lg"
              >
                Proposer un événement
              </ModalButton>
              <Link href="/devenir-praticien" className="btn btn-soft btn-lg" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>Devenir praticien</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

Note: `KINDS` chips stay pure decoration (no `onClick`) — that was already true before this plan and is explicitly Plan 09 polish, not touched here. `export const metadata` is removed (Client Component restriction).

- [ ] **Step 6: Rewrite the event detail page**

Replace the full contents of `web/app/(site)/evenement/[id]/page.jsx`:

```jsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapEvent } from '@/lib/data/event-adapter';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

const ORB = {
  sky: ['#A8C8E8', '#5B7FB8'],
  violet: ['#C4B0E8', '#7B5FCF'],
  sage: ['#B8D4C2', '#6FA383'],
  gold: ['#E4C896', '#C49A4A'],
};

export default function EvenementPage({ params }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.get(`/events/${id}`),
  });

  if (!isLoading && !data?.data) {
    return (
      <section className="section">
        <div className="container-narrow center">
          <h1 className="h-1">Événement introuvable</h1>
          <p className="lead muted" style={{ marginBottom: 20 }}>Cet événement n’existe pas ou a été déplacé.</p>
          <Link href="/evenements" className="btn btn-primary">Retour à l’agenda</Link>
        </div>
      </section>
    );
  }
  if (!data?.data) return null;

  const e = mapEvent(data.data);
  const hosts = (data.data.animateurs || []).map((a) => ({
    id: a.id,
    name: `${a.firstname} ${a.lastname}`.trim(),
    verified: a.statut_verification === 'valide',
    specialties: a.specialite ? [a.specialite] : [],
  }));
  const [orb1, orb2] = ORB[e.tone] || ORB.violet;
  const paras = (e.description || '').split('\n').filter((p) => p.trim());
  const shareUrl = `https://aura.fr/evenement/${e.id}`;

  return (
    <>
      {/* HERO */}
      <section
        className="aurora-dark grain"
        style={{ '--orb-x': '70%', '--orb-y': '18%', '--orb-1': orb1, '--orb-2': orb2, padding: '100px 0 110px' }}
      >
        <div className="container reveal">
          <div className="row gap-2 small" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 22 }}>
            <Link href="/evenements" style={{ color: 'rgba(255,255,255,0.7)' }}>Agenda</Link>
            <Icon name="chevronRight" size={13} color="rgba(255,255,255,0.5)" />
            <span>{e.title}</span>
          </div>
          <span className="badge featured" style={{ marginBottom: 18 }}>{e.kind}</span>
          <h1 className="h-display" style={{ color: '#fff', margin: '0 0 20px', maxWidth: 720 }}>{e.title}</h1>
          <div className="row gap-6 wrap" style={{ color: 'rgba(255,255,255,0.82)' }}>
            <span className="row gap-2"><Icon name="calendar" size={16} color="rgba(255,255,255,0.7)" />{e.meta.dates}</span>
            <span className="row gap-2"><Icon name="pin" size={16} color="rgba(255,255,255,0.7)" />{e.meta.place}</span>
            <span className="row gap-2"><Icon name="ticket" size={16} color="rgba(255,255,255,0.7)" />{e.price}</span>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="section">
        <div className="container">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 40, alignItems: 'flex-start' }}>
            {/* LEFT */}
            <div className="stack" style={{ gap: 40 }}>
              {/* Description */}
              <div>
                <span className="eyebrow">Présentation</span>
                {paras.map((p, i) => (
                  <p key={i} className={i === 0 ? 'lead' : 'body'} style={{ marginTop: i === 0 ? 14 : 16 }}>{p}</p>
                ))}
              </div>

              {/* Hosts */}
              {hosts.length > 0 && (
                <div>
                  <span className="eyebrow">Encadré par</span>
                  <h2 className="h-3" style={{ margin: '8px 0 20px' }}>{hosts.length > 1 ? 'Vos praticiens' : 'Votre praticien'}</h2>
                  <div className="grid grid-2">
                    {hosts.map((h) => (
                      <Link key={h.id} href={`/praticien/${h.id}`} className="card card-pad card-hover row gap-3" style={{ alignItems: 'center' }}>
                        <Avatar name={h.name} size={52} />
                        <div className="flex-1">
                          <div className="row gap-1" style={{ fontWeight: 500 }}>
                            {h.name}
                            {h.verified && <Icon name="checkCircle" size={14} color="var(--violet-2)" />}
                          </div>
                          <div className="small">{h.specialties.join(' · ')}</div>
                        </div>
                        <Icon name="chevronRight" size={16} color="var(--muted)" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Location + share */}
              <div className="card card-pad">
                <div className="row between wrap gap-3">
                  <div className="row gap-3" style={{ alignItems: 'center' }}>
                    <span className="tile-icon tint-sky"><Icon name="pin" size={18} color="var(--sky-2, #5B7FB8)" /></span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{e.meta.place}</div>
                      <div className="small muted">Lieu communiqué après réservation</div>
                    </div>
                  </div>
                  <ModalButton modal="share" payload={{ label: e.title, url: shareUrl }} className="btn btn-soft" as="button">
                    <Icon name="share" size={15} color="var(--ink)" /> Partager
                  </ModalButton>
                </div>
              </div>
            </div>

            {/* RIGHT — booking card */}
            <aside style={{ position: 'sticky', top: 96 }}>
              <div className="card card-pad">
                <div className="row between" style={{ alignItems: 'baseline', marginBottom: 16 }}>
                  <span className="price" style={{ fontSize: 26 }}>{e.price}</span>
                </div>
                <dl className="dl" style={{ marginBottom: 18 }}>
                  <dt>Dates</dt><dd>{e.meta.dates}</dd>
                  <dt>Lieu</dt><dd>{e.meta.place}</dd>
                  <dt>Capacité</dt><dd>{e.seats} participants</dd>
                </dl>
                <ModalButton
                  modal="form"
                  payload={{
                    title: `Réserver — ${e.title}`,
                    fields: [
                      { name: 'name', label: 'Votre nom', type: 'text', required: true },
                      { name: 'email', label: 'Email', type: 'email', required: true },
                      { name: 'places', label: 'Nombre de places', type: 'number', required: true },
                      { name: 'note', label: 'Un mot pour l’organisateur', type: 'textarea' },
                    ],
                    submitLabel: 'Confirmer ma réservation',
                    successToast: 'Réservation envoyée — vous recevrez une confirmation par email.',
                  }}
                  className="btn btn-primary btn-block btn-lg"
                >
                  Réserver
                </ModalButton>
                <ModalButton modal="contact" payload={{ name: hosts[0]?.name || e.title }} className="btn btn-ghost btn-block" style={{ marginTop: 10 }}>
                  Une question ?
                </ModalButton>
                <p className="tiny muted center" style={{ marginTop: 14 }}>
                  <Icon name="shield" size={12} color="var(--muted)" /> Paiement protégé · Annulation jusqu’à 7 jours avant
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
```

Note: `generateStaticParams`/`generateMetadata` are removed. The "Au programme" step-by-step section and the "Disponibilité"/places-restantes row are removed — no backend source for either. `hosts` now comes straight from the real `animateurs[]` the backend already joins in on `show()`, replacing the old `e.hostIds[] → getPractitioner(hid)` mock cross-reference.

- [ ] **Step 7: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add web/lib/data/event-adapter.js web/lib/data/event-adapter.test.js web/app/\(site\)/evenements/page.jsx web/app/\(site\)/evenement/\[id\]/page.jsx
git commit -m "feat(web): wire events list and detail to the backend"
```

---

## Task 6: Web — blog list + detail wiring

**Files:**
- Modify: `web/app/(site)/blog/page.jsx`, `web/app/(site)/blog/[slug]/page.jsx`

Ground truth: backend `Article` fields are `id, titre, slug, categorie, tonalite, extrait, corps, status, auteur, temps_lecture, image_couverture, meta_description, mot_clef, date_publication`. Field renames are mostly direct (`titre→title`, `categorie→category`, `extrait→excerpt`, `auteur→author`, `corps→body`) so this task rewrites the JSX to reference the real names directly — no adapter file needed (unlike events/praticiens, nothing here is consumed by an out-of-scope shared component). `tonalite` (freeform text) is used exactly where `tone` was: `ORBS[post.tonalite] || ORBS.violet` already falls back safely for any value that isn't one of the four known keys. Both pages fetch with `?status=publié` so drafts don't leak to the public site (mirrors the events decision; articles already supports this filter). The detail page uses the new `?slug=` filter from Task 1.

- [ ] **Step 1: Rewrite the blog list page**

Replace the full contents of `web/app/(site)/blog/page.jsx`:

```jsx
'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ModalButton } from '@/components/ui/ModalButton';
import { dateFr } from '@/lib/format';

const ORBS = {
  violet: { '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF' },
  sky: { '--orb-1': '#A9CDEB', '--orb-2': '#5A86C4' },
  sage: { '--orb-1': '#BBD6BA', '--orb-2': '#5E9A6B' },
  gold: { '--orb-1': '#E8D2A0', '--orb-2': '#C49A4F' },
};

export default function BlogIndexPage() {
  const { data } = useQuery({
    queryKey: ['articles', 'public'],
    queryFn: () => api.get('/articles?status=publié&per_page=50'),
  });
  const posts = data?.data ?? [];
  const [featured, ...rest] = posts;

  if (!featured) return null;

  const orb = ORBS[featured.tonalite] || ORBS.violet;

  return (
    <>
      {/* HERO */}
      <section className="section-sm">
        <div className="container">
          <div className="center reveal">
            <span className="eyebrow">Journal</span>
            <h1 className="h-display" style={{ margin: '14px 0 14px' }}>
              Lire, comprendre, <span className="italic accent">ralentir</span>.
            </h1>
            <p className="lead muted" style={{ maxWidth: 560, margin: '0 auto' }}>
              Guides, regards de praticiens et conseils pour cheminer en confiance dans le bien-être énergétique.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section-sm">
        <div className="container">
          <Link href={`/blog/${featured.slug}`} className="card card-hover reveal r-1" style={{ overflow: 'hidden', display: 'block' }}>
            <div className="grid grid-2" style={{ gap: 0, alignItems: 'stretch' }}>
              <div className="aurora-dark grain" style={{ '--orb-x': '70%', '--orb-y': '20%', ...orb, minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 36 }}>
                <Badge variant="featured">À la une</Badge>
                <div className="row gap-2" style={{ marginTop: 'auto', paddingTop: 24, color: 'rgba(255,255,255,0.7)' }}>
                  <Lotus size={16} color="rgba(255,255,255,0.9)" />
                  <span className="tiny">{featured.categorie} · {featured.temps_lecture} min</span>
                </div>
              </div>
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="eyebrow">{featured.categorie}</span>
                <h2 className="h-1" style={{ margin: '10px 0 12px' }}>{featured.titre}</h2>
                <p className="lead muted" style={{ marginBottom: 22 }}>{featured.extrait}</p>
                <div className="row gap-3" style={{ alignItems: 'center' }}>
                  <Avatar name={featured.auteur} size={44} rounded />
                  <div>
                    <div className="small" style={{ fontWeight: 600 }}>{featured.auteur}</div>
                    <div className="tiny muted">{dateFr(featured.date_publication)}</div>
                  </div>
                  <span className="row gap-1" style={{ marginLeft: 'auto', color: 'var(--violet-2)' }}>
                    <span className="small">Lire</span><Icon name="arrowRight" size={16} color="var(--violet-2)" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* GRID */}
      <section className="section-sm">
        <div className="container">
          <div className="section-head">
            <h2 className="h-2">Tous les articles</h2>
          </div>
          <div className="grid grid-3">
            {rest.map((post, i) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className={`card card-hover reveal r-${(i % 5) + 2}`} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="aurora-dark grain" style={{ '--orb-x': '65%', '--orb-y': '25%', ...(ORBS[post.tonalite] || ORBS.violet), height: 140, display: 'flex', alignItems: 'flex-end', padding: 18 }}>
                  <Badge variant="neutral" dot>{post.categorie}</Badge>
                </div>
                <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div className="tiny muted row gap-2">
                    <span>{dateFr(post.date_publication)}</span><span>·</span><span>{post.temps_lecture} min</span>
                  </div>
                  <h3 className="h-3" style={{ margin: '8px 0 8px' }}>{post.titre}</h3>
                  <p className="small muted" style={{ flex: 1 }}>{post.extrait}</p>
                  <div className="row gap-2" style={{ alignItems: 'center', marginTop: 16 }}>
                    <Avatar name={post.auteur} size={28} rounded />
                    <span className="tiny muted">{post.auteur}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER CTA */}
      <section className="section-sm">
        <div className="container">
          <div className="aurora-dark grain reveal" style={{ '--orb-x': '20%', '--orb-y': '20%', '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF', borderRadius: 20, padding: '52px 40px', textAlign: 'center' }}>
            <Lotus size={22} color="rgba(255,255,255,0.9)" />
            <h2 className="h-1" style={{ color: '#fff', margin: '14px 0 12px' }}>
              Recevez le <span className="italic" style={{ color: 'var(--violet)' }}>Journal</span> chaque mois
            </h2>
            <p className="lead" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: 480, margin: '0 auto 26px' }}>
              Nos meilleurs articles, des conseils et des sélections de praticiens. Une fois par mois, sans bruit.
            </p>
            <ModalButton modal="newsletter" className="btn btn-aurora btn-lg">S’inscrire à la newsletter</ModalButton>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Rewrite the blog detail page**

Replace the full contents of `web/app/(site)/blog/[slug]/page.jsx`:

```jsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Lotus } from '@/components/ui/Lotus';
import { ModalButton } from '@/components/ui/ModalButton';
import { dateFr } from '@/lib/format';

const ORBS = {
  violet: { '--orb-1': '#C4B0E8', '--orb-2': '#7B5FCF' },
  sky: { '--orb-1': '#A9CDEB', '--orb-2': '#5A86C4' },
  sage: { '--orb-1': '#BBD6BA', '--orb-2': '#5E9A6B' },
  gold: { '--orb-1': '#E8D2A0', '--orb-2': '#C49A4F' },
};

export default function BlogArticlePage({ params }) {
  const { slug } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => api.get(`/articles?slug=${encodeURIComponent(slug)}&per_page=1`),
  });
  const post = data?.data?.[0];

  const { data: allRes } = useQuery({
    queryKey: ['articles', 'public'],
    queryFn: () => api.get('/articles?status=publié&per_page=50'),
    enabled: !!post,
  });
  const related = (allRes?.data ?? []).filter((p) => p.slug !== slug).slice(0, 3);

  if (!isLoading && !post) {
    return (
      <section className="section">
        <div className="container-narrow center">
          <h1 className="h-1">Article introuvable</h1>
          <p className="lead muted" style={{ marginBottom: 20 }}>Cet article n’existe pas ou a été déplacé.</p>
          <Link href="/blog" className="btn btn-primary">Retour au Journal</Link>
        </div>
      </section>
    );
  }
  if (!post) return null;

  const orb = ORBS[post.tonalite] || ORBS.violet;
  const paragraphs = post.corps.split('\n\n');
  const pullIndex = paragraphs.length > 2 ? Math.floor(paragraphs.length / 2) : -1;
  const pullText = pullIndex > 0 ? paragraphs[pullIndex] : null;
  const shareUrl = `https://aura.fr/blog/${post.slug}`;

  return (
    <>
      {/* HEADER */}
      <section className="section-sm">
        <div className="container-narrow">
          <div className="crumbs" style={{ marginBottom: 18 }}>
            <Link href="/blog">Journal</Link>
            <span>/</span>
            <span>{post.categorie}</span>
          </div>
          <div className="reveal">
            <span className="eyebrow">{post.categorie}</span>
            <h1 className="h-display" style={{ margin: '14px 0 22px' }}>{post.titre}</h1>
            <div className="row gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name={post.auteur} size={44} rounded />
              <div>
                <div className="small" style={{ fontWeight: 600 }}>{post.auteur}</div>
                <div className="tiny muted row gap-2">
                  <span>{dateFr(post.date_publication)}</span><span>·</span><span>{post.temps_lecture} min de lecture</span>
                </div>
              </div>
              <div className="row gap-2" style={{ marginLeft: 'auto' }}>
                <ModalButton modal="share" payload={{ label: post.titre, url: shareUrl }} className="btn btn-soft btn-sm">
                  <Icon name="share" size={15} color="var(--violet-2)" /> Partager
                </ModalButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HERO BAND */}
      <section className="section-sm">
        <div className="container-narrow">
          <div className="aurora-dark grain reveal r-1" style={{ '--orb-x': '70%', '--orb-y': '25%', ...orb, borderRadius: 20, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 40 }}>
            <Lotus size={24} color="rgba(255,255,255,0.9)" />
            <p className="serif italic" style={{ color: '#fff', fontSize: 24, marginTop: 16, maxWidth: 520 }}>
              {post.extrait}
            </p>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="section-sm">
        <div className="container-narrow">
          {paragraphs.map((para, i) => (
            <div key={i}>
              {i === pullIndex && pullText ? (
                <blockquote className="pull serif" style={{ margin: '34px 0' }}>
                  {pullText}
                </blockquote>
              ) : (
                <p className={i === 0 ? 'lead' : 'body'} style={{ marginBottom: 22 }}>{para}</p>
              )}
            </div>
          ))}

          {/* SHARE ROW */}
          <div className="divider" style={{ margin: '36px 0 24px' }} />
          <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span className="small muted">Cet article vous a plu ? Partagez-le.</span>
            <div className="row gap-2">
              <ModalButton modal="share" payload={{ label: post.titre, url: shareUrl }} className="btn btn-soft btn-sm">
                <Icon name="share" size={15} color="var(--violet-2)" /> Partager
              </ModalButton>
              <Link href="/blog" className="btn btn-ghost btn-sm">
                <Icon name="arrowLeft" size={15} color="var(--ink)" /> Tous les articles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AUTHOR CARD */}
      <section className="section-sm">
        <div className="container-narrow">
          <div className="card card-pad reveal">
            <div className="row gap-4" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name={post.auteur} size={64} rounded />
              <div className="flex-1">
                <span className="eyebrow">Écrit par</span>
                <h3 className="h-3" style={{ margin: '4px 0 4px' }}>{post.auteur}</h3>
                <p className="small muted">
                  Une voix du Journal d’Aura, dédiée à un bien-être énergétique éthique, sourcé et accessible.
                </p>
              </div>
              <ModalButton modal="contact" payload={{ name: post.auteur }} className="btn btn-soft btn-sm">Contacter</ModalButton>
            </div>
          </div>
        </div>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="section-sm">
          <div className="container">
            <div className="section-head">
              <h2 className="h-2">À lire aussi</h2>
              <Link href="/blog" className="more">Tout le Journal</Link>
            </div>
            <div className="grid grid-3">
              {related.map((p, i) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className={`card card-hover reveal r-${i + 1}`} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div className="aurora-dark grain" style={{ '--orb-x': '65%', '--orb-y': '25%', ...(ORBS[p.tonalite] || ORBS.violet), height: 130, display: 'flex', alignItems: 'flex-end', padding: 18 }}>
                    <Badge variant="neutral" dot>{p.categorie}</Badge>
                  </div>
                  <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div className="tiny muted row gap-2">
                      <span>{dateFr(p.date_publication)}</span><span>·</span><span>{p.temps_lecture} min</span>
                    </div>
                    <h3 className="h-4" style={{ margin: '8px 0 6px' }}>{p.titre}</h3>
                    <p className="small muted" style={{ flex: 1 }}>{p.extrait}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
```

Note: `generateStaticParams` is removed. `related` reuses the same `['articles', 'public']` query the list page uses (react-query dedupes/shares this cache key, so navigating from `/blog` costs no extra request); it's `enabled: !!post` so a not-found article doesn't trigger a wasted fetch.

- [ ] **Step 3: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/app/\(site\)/blog/page.jsx web/app/\(site\)/blog/\[slug\]/page.jsx
git commit -m "feat(web): wire blog list and detail to the backend"
```

---

## Task 7: Web — praticiens list + detail wiring

**Files:**
- Create: `web/lib/data/praticien-adapter.js`
- Test: `web/lib/data/praticien-adapter.test.js`
- Modify: `web/app/(site)/praticiens/page.jsx`, `web/app/(site)/praticien/[id]/page.jsx`, `web/app/(site)/praticien/[id]/ProfileBody.jsx`

Ground truth: backend `Praticien` fields are `id, firstname, lastname, email, telephone, ville, niveau, specialite, mode, status, tarif, experience (a plain number of years), bio, statut_verification ('en_attente'|'en_cours'|'valide'|'rejete')`. The existing `PractitionerCard`/`ProfileBody`/`Rating`/`Avatar` components (shared with the home page and other out-of-scope pages — not modified here except `ProfileBody.jsx`, which belongs only to this page) expect a much richer shape: `name, specialties[], city, region, price, rating, reviews, level, verified, online, novice, duration, approach, experience:{years,sessions}, exchange:{gives,wants}, photo, hero, gallery`. `mapPraticien` bridges this: real fields map directly (`firstname+lastname→name`, `specialite→specialties[0]`, `tarif→price`, `niveau→level`, `bio→bio`, `experience→experience.years`); `verified` is honestly *derived* from the real `statut_verification` field (`=== 'valide'`), not invented; `rating`/`reviews` are `0` (an honest "no reviews yet" state — Plan 07 builds the `avis` module) rather than a fake score; `region`, `duration`, `approach`, `exchange`, `photo`, `hero`, `gallery`, `online`, `novice` have zero backend source and are left empty/null — `ProfileBody.jsx` is adjusted to hide the two sections that would otherwise break or dangle on empty data (the barter "exchange" panel, which today does `p.exchange.gives` with no guard at all — a real crash on `undefined` — and the "Sa démarche" paragraph).

- [ ] **Step 1: Write the failing test**

Create `web/lib/data/praticien-adapter.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { mapPraticien } from './praticien-adapter';

describe('mapPraticien', () => {
  const row = {
    id: 7, firstname: 'Elodie', lastname: 'Marceau', ville: 'Annecy',
    mode: 'présentiel', tarif: '75.00', niveau: 'expert', specialite: 'Magnétisme',
    bio: 'Bio réelle.', experience: 14, statut_verification: 'valide',
  };

  it('maps real fields directly', () => {
    const p = mapPraticien(row);
    expect(p.id).toBe(7);
    expect(p.name).toBe('Elodie Marceau');
    expect(p.city).toBe('Annecy');
    expect(p.price).toBe(75);
    expect(p.specialties).toEqual(['Magnétisme']);
    expect(p.bio).toBe('Bio réelle.');
    expect(p.experience.years).toBe(14);
  });

  it('derives verified from statut_verification, never fabricates a rating', () => {
    expect(mapPraticien(row).verified).toBe(true);
    expect(mapPraticien({ ...row, statut_verification: 'en_attente' }).verified).toBe(false);
    expect(mapPraticien(row).rating).toBe(0);
    expect(mapPraticien(row).reviews).toBe(0);
  });

  it('leaves fields with no backend source empty rather than fabricated', () => {
    const p = mapPraticien(row);
    expect(p.photo).toBeNull();
    expect(p.gallery).toEqual([]);
    expect(p.exchange).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — `./praticien-adapter` does not exist.

- [ ] **Step 3: Write the adapter**

Create `web/lib/data/praticien-adapter.js`:

```javascript
// Adapter: backend Praticien rows -> the shape PractitionerCard / ProfileBody
// already render. Real fields map directly; fields with no backend source
// (photo, rating, online, experience.sessions, exchange…) are left absent
// rather than invented — see plan Architecture notes.
const DEFAULT_TONE = 'violet';

export function mapPraticien(row) {
  return {
    id: row.id,
    name: `${row.firstname} ${row.lastname}`.trim(),
    specialties: row.specialite ? [row.specialite] : [],
    extraSpecialty: null,
    city: row.ville,
    region: null,
    mode: row.mode,
    price: Number(row.tarif),
    duration: null,
    rating: 0,
    reviews: 0,
    level: row.niveau,
    verified: row.statut_verification === 'valide',
    online: false,
    novice: false,
    tone: DEFAULT_TONE,
    responseTime: null,
    bio: row.bio,
    approach: null,
    experience: { years: row.experience, sessions: undefined },
    exchange: null,
    photo: null,
    hero: null,
    gallery: [],
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS.

- [ ] **Step 5: Rewrite the praticiens list page**

Replace the full contents of `web/app/(site)/praticiens/page.jsx`:

```jsx
'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mapPraticien } from '@/lib/data/praticien-adapter';
import { PractitionerCard } from '@/components/cards/PractitionerCard';
import { ModalButton } from '@/components/ui/ModalButton';
import { Icon } from '@/components/ui/Icon';

const MODES = [
  { key: 'all', label: 'Toutes modalités' },
  { key: 'présentiel', label: 'Présentiel' },
  { key: 'visio', label: 'Visio' },
];

const SORTS = [
  { key: 'pertinence', label: 'Pertinence' },
  { key: 'prix', label: 'Prix croissant' },
  { key: 'note', label: 'Mieux notés' },
];

export default function PraticiensPage() {
  const [query, setQuery] = useState('');
  const [discipline, setDiscipline] = useState('all');
  const [mode, setMode] = useState('all');
  const [sort, setSort] = useState('pertinence');

  const { data: praticiensRes } = useQuery({
    queryKey: ['praticiens'],
    queryFn: () => api.get('/praticiens'),
  });
  const practitioners = useMemo(
    () => (praticiensRes?.data ?? []).map(mapPraticien),
    [praticiensRes],
  );

  const { data: disciplinesRes } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => api.get('/disciplines'),
  });
  const chips = (disciplinesRes?.data ?? []).slice(0, 8);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = practitioners.filter((p) => {
      if (discipline !== 'all' && !p.specialties.includes(discipline) && p.extraSpecialty !== discipline) return false;
      if (mode !== 'all' && !p.mode.toLowerCase().includes(mode)) return false;
      if (q) {
        const hay = [p.name, p.city, ...p.specialties, p.extraSpecialty || ''].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (sort === 'prix') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'note') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [practitioners, query, discipline, mode, sort]);

  return (
    <>
      {/* INTRO HERO */}
      <section className="section-sm" style={{ paddingBottom: 0 }}>
        <div className="container reveal">
          <span className="eyebrow">L'annuaire AURA</span>
          <h1 className="h-1" style={{ margin: '12px 0 14px' }}>
            Trouver un <span className="italic accent">praticien</span>
          </h1>
          <p className="lead" style={{ maxWidth: 560 }}>
            {practitioners.length} praticiens vérifiés en France. Filtrez par discipline,
            modalité et ressenti — chaque profil est contrôlé un par un.
          </p>
        </div>
      </section>

      {/* STICKY SEARCH + FILTERS */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(251,249,246,0.86)', backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--line)', marginTop: 28,
        }}
      >
        <div className="container" style={{ padding: '16px 0' }}>
          <div className="row gap-2 wrap">
            <div className="row gap-2 flex-1" style={{ position: 'relative', minWidth: 240 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Icon name="search" size={16} color="var(--muted)" />
              </span>
              <input
                className="input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Discipline, ville, nom…"
                style={{ paddingLeft: 40, width: '100%' }}
              />
            </div>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: 180 }}>
              {MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 180 }}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <ModalButton modal="filters" className="btn btn-soft" as="button">
              <Icon name="filter" size={15} /> Filtres
            </ModalButton>
          </div>

          {/* DISCIPLINE CHIPS */}
          <div className="row gap-2 wrap" style={{ marginTop: 14 }}>
            <button
              type="button"
              className={`chip${discipline === 'all' ? ' active' : ''}`}
              onClick={() => setDiscipline('all')}
            >
              Toutes
            </button>
            {chips.map((d) => (
              <button
                key={d.slug}
                type="button"
                className={`chip tone-${d.tonalite}${discipline === d.nom ? ' active' : ''}`}
                onClick={() => setDiscipline(discipline === d.nom ? 'all' : d.nom)}
              >
                {d.nom}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <section className="section-sm">
        <div className="container">
          <div className="between" style={{ marginBottom: 18 }}>
            <p className="small muted">
              <strong style={{ color: 'var(--ink)' }}>{results.length}</strong>{' '}
              {results.length > 1 ? 'praticiens trouvés' : 'praticien trouvé'}
              {discipline !== 'all' && <> en <span className="italic accent">{discipline}</span></>}
            </p>
            {(discipline !== 'all' || mode !== 'all' || query) && (
              <button
                type="button"
                className="btn btn-link btn-sm"
                onClick={() => { setQuery(''); setDiscipline('all'); setMode('all'); }}
              >
                Réinitialiser
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="empty card card-pad center">
              <span className="tile-icon tint-violet" style={{ margin: '0 auto 14px' }}>
                <Icon name="search" size={20} color="var(--violet-2)" />
              </span>
              <h3 className="h-3" style={{ marginBottom: 6 }}>Aucun praticien ne correspond</h3>
              <p className="body">Essayez d'élargir vos critères ou de réinitialiser les filtres.</p>
            </div>
          ) : (
            <div className="stack gap-4">
              {results.map((p) => <PractitionerCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
```

Note: the client-side filter/sort `useMemo` logic is unchanged — it now runs over the adapted array instead of the mock array. `p.region` is dropped from the search haystack (always `null` now). The discipline chips fetch `['disciplines']` — same query key Task 3 already established — so react-query serves it from cache on repeat visits.

- [ ] **Step 6: Rewrite the praticien detail page**

Replace the full contents of `web/app/(site)/praticien/[id]/page.jsx`:

```jsx
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
import { ToastButton } from '@/components/ui/ToastButton';
import { ProfileBody } from './ProfileBody';

export default function PractitionerProfilePage({ params }) {
  const { id } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['praticien', id],
    queryFn: () => api.get(`/praticiens/${id}`),
  });

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
  // No reviews backend yet (Plan 07 builds the `avis` module) — real empty
  // state, not a fake call to a nonexistent endpoint.
  const reviews = [];
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
              <ToastButton
                toggle
                message="Retiré des favoris"
                activeMessage="Ajouté aux favoris"
                className="btn btn-icon"
                style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)' }}
                activeChildren={<Icon name="heart" size={18} color="var(--violet-2)" />}
              >
                <Icon name="heart" size={18} />
              </ToastButton>
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
            <Rating value={p.rating} count={p.reviews} showCount size={16} />
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
              <ProfileBody p={p} reviews={reviews} />
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
```

Note: `generateStaticParams` is removed. Dropped `p.online`/`p.novice` badges, `p.responseTime`, the `, {p.region}` suffix, and `p.duration` references — all always empty now. The hero falls back to the same `aurora-dark grain` gradient band used elsewhere in the codebase when there's no photo, exactly like `ProfileBody`'s existing gallery fallback already does.

- [ ] **Step 7: Guard the two data-less sections in ProfileBody**

Replace the full contents of `web/app/(site)/praticien/[id]/ProfileBody.jsx`:

```jsx
'use client';

import { Tabs } from '@/components/ui/Tabs';
import { Avatar } from '@/components/ui/Avatar';
import { Rating } from '@/components/ui/Rating';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';

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

export function ProfileBody({ p, reviews }) {
  const tabs = [
    { key: 'about', label: 'À propos' },
    { key: 'reviews', label: `Avis (${p.reviews})` },
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
                  <span className="serif" style={{ fontSize: 30, color: 'var(--violet-2)' }}>{p.rating}</span>
                  <Rating value={p.rating} count={p.reviews} showCount />
                </div>
                <ModalButton modal="review" payload={{ name: p.name }} className="btn btn-soft btn-sm" as="button">
                  <Icon name="edit" size={14} /> Laisser un avis
                </ModalButton>
              </div>

              {reviews.length === 0 ? (
                <div className="note">Aucun avis publié pour l'instant.</div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="card card-pad">
                    <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
                      <Avatar name={r.author} size={44} />
                      <div className="flex-1">
                        <div className="between">
                          <div className="h-4">{r.author}</div>
                          <span className="tiny muted">{r.when}</span>
                        </div>
                        <div className="row gap-2" style={{ margin: '4px 0 10px' }}>
                          <Rating value={r.rating} size={13} showCount={false} />
                          <span className="tiny muted">· {r.mode}</span>
                        </div>
                        <p className="body">{r.text}</p>
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
```

Note: `reviews.length === 0 ? <div className="note">Aucun avis publié pour l'instant.</div>` already existed in the original file — it now doubles as exactly the "no backend yet" empty state the reviews tab needs, since the parent page passes `reviews = []`. Both `{p.exchange && <ExchangePanel p={p} />}` guards prevent what was previously an unconditional `p.exchange.gives` access (a real `TypeError` on `undefined` once `exchange` stopped being mock data).

- [ ] **Step 8: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add web/lib/data/praticien-adapter.js web/lib/data/praticien-adapter.test.js web/app/\(site\)/praticiens/page.jsx web/app/\(site\)/praticien/\[id\]/page.jsx web/app/\(site\)/praticien/\[id\]/ProfileBody.jsx
git commit -m "feat(web): wire praticiens list and detail to the backend"
```

---

## Task 8: Mobile — discipline + practitioner repo wiring

**Files:**
- Modify: `mobile/src/data/repos/index.ts`
- Test: `mobile/src/data/repos/index.test.ts` (create)

Ground truth: `mobile/src/data/repos/index.ts`'s own header comment says screens never need to change when the repo bodies change — this task only touches that one file. `practitionerRepo`/`disciplineRepo` currently wrap mock arrays with `withImages`/`withDisciplineImage`, which attach local `require()`d assets keyed by mock ids (`'p1'`, `'reiki'`, …). Real backend praticien ids are numeric and don't correspond to any stock photo — attaching a stock photo of a fictional person to a real practitioner row would be actively misleading, so `practitionerImages` wrapping is dropped entirely (`photo`/`hero`/`gallery` stay empty; `Avatar`/`PractitionerCard` already fall back to a gradient glyph when `source` is absent). `disciplineImageSource(slug)` is **kept** — it's generic category stock photography (e.g. "what a Reiki session looks like"), not a specific person, and disciplines keep a real `slug` column the registry can still key off.

Two crash risks found by reading the home tab (`app/(tabs)/index.tsx`, not otherwise touched by this plan but fed by the same repos): `paletteForTone()` has no default case and would throw if `tone` were an arbitrary string, and `Discipline.count`/`Practitioner.rating` etc. are declared as required (non-optional) `number` fields in `src/data/types.ts`. `mapDiscipline` therefore uses one fixed valid `tone` (never the freeform backend `tonalite`), and both adapters supply `0` for count-like fields with no backend source — an honest "not tracked yet" sentinel, not a fabricated number.

- [ ] **Step 1: Write the failing tests**

Create `mobile/src/data/repos/index.test.ts`:

```typescript
import { mapDiscipline, mapPraticien } from './index';

describe('mapPraticien', () => {
  const row = {
    id: 7, firstname: 'Elodie', lastname: 'Marceau', ville: 'Annecy',
    mode: 'présentiel', tarif: '75.00', niveau: 'expert', specialite: 'Magnétisme',
    bio: 'Bio réelle.', experience: 14, statut_verification: 'valide',
  };

  it('maps real fields directly and stringifies the numeric id', () => {
    const p = mapPraticien(row);
    expect(p.id).toBe('7');
    expect(p.name).toBe('Elodie Marceau');
    expect(p.city).toBe('Annecy');
    expect(p.price).toBe(75);
    expect(p.specialties).toEqual(['Magnétisme']);
    expect(p.experience?.years).toBe(14);
  });

  it('derives verified from statut_verification, never fabricates a rating', () => {
    expect(mapPraticien(row).verified).toBe(true);
    expect(mapPraticien({ ...row, statut_verification: 'en_attente' }).verified).toBe(false);
    expect(mapPraticien(row).rating).toBe(0);
    expect(mapPraticien(row).reviews).toBe(0);
  });

  it('leaves photo/hero/gallery empty rather than borrowing a stock photo', () => {
    const p = mapPraticien(row);
    expect(p.photo).toBeUndefined();
    expect(p.gallery).toEqual([]);
  });
});

describe('mapDiscipline', () => {
  const row = { id: 2, nom: 'Reiki', slug: 'reiki', tonalite: 'une-valeur-libre', glyphe: '❍', accroche: 'Accroche réelle' };

  it('maps real fields directly', () => {
    const d = mapDiscipline(row);
    expect(d.slug).toBe('reiki');
    expect(d.name).toBe('Reiki');
    expect(d.glyph).toBe('❍');
    expect(d.intro).toBe('Accroche réelle');
  });

  it('always uses a valid tone key, never the freeform backend value', () => {
    const validTones = ['sky', 'violet', 'sage', 'gold'];
    expect(validTones).toContain(mapDiscipline(row).tone);
  });

  it('never fabricates a praticien count', () => {
    expect(mapDiscipline(row).count).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `mobile/`): `npm test -- index`
Expected: FAIL — `mapDiscipline`/`mapPraticien` are not exported from `./index`.

- [ ] **Step 3: Replace the repo file**

Replace the full contents of `mobile/src/data/repos/index.ts`:

```typescript
/**
 * Repository layer — every screen reads through these functions.
 * disciplineRepo and practitionerRepo now call the real backend via the api
 * client; screens never need to change. exchangeRepo and messageRepo still
 * read from in-memory mocks (out of scope for this plan). eventRepo is
 * wired in a later task of this same plan.
 */
import { eventsMock } from '../mock/events';
import { exchangesMock } from '../mock/exchanges';
import { conversationsMock, sampleChat } from '../mock/messages';
import { disciplineImageSource } from '../images';
import { api } from '../api/client';
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  Conversation,
  ChatMessage,
  Review,
} from '../types';

const delay = <T>(value: T, ms = 60): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

// ---------- Adapters: raw backend rows -> existing UI shapes ----------
// Real fields map directly; fields with no backend source (photo, rating,
// online status, per-item accent colour…) get an honest neutral default
// instead of invented data. See the plan's Architecture notes.
const DEFAULT_GRADIENT = ['#C4B0E8', '#A8C8E8'] as const;
const DEFAULT_TONE: Discipline['tone'] = 'violet';

export function mapPraticien(row: any): Practitioner {
  return {
    id: String(row.id),
    name: `${row.firstname} ${row.lastname}`.trim(),
    specialties: row.specialite ? [row.specialite] : [],
    city: row.ville,
    mode: row.mode,
    price: Number(row.tarif),
    rating: 0,
    reviews: 0,
    level: row.niveau,
    verified: row.statut_verification === 'valide',
    online: false,
    novice: false,
    bio: row.bio,
    gradient: DEFAULT_GRADIENT,
    // `sessions` has no backend source; the one consumer (praticien/[id].tsx)
    // already reads it as `p.experience?.sessions ?? 600`, so omitting it
    // here (rather than inventing a count) is safe.
    experience: { years: row.experience } as Practitioner['experience'],
    photo: undefined,
    hero: undefined,
    gallery: [],
  };
}

export function mapDiscipline(row: any): Discipline {
  return {
    slug: row.slug,
    name: row.nom,
    tone: DEFAULT_TONE,
    glyph: row.glyphe,
    count: 0,
    intro: row.accroche,
    pullQuote: undefined,
    heroImage: disciplineImageSource(row.slug),
  };
}

// ---------- Practitioners ----------
export const practitionerRepo = {
  list: (): Promise<Practitioner[]> =>
    api.get<{ data: any[] }>('/praticiens').then((res) => res.data.map(mapPraticien)),
  byId: (id: string): Promise<Practitioner | undefined> =>
    api.get<{ data: any }>(`/praticiens/${id}`).then((res) => mapPraticien(res.data)).catch(() => undefined),
  byDiscipline: (disciplineName: string): Promise<Practitioner[]> =>
    practitionerRepo.list().then((list) => list.filter((p) => p.specialties.includes(disciplineName))),
  recommended: (): Promise<Practitioner[]> =>
    practitionerRepo.list().then((list) => list.slice(0, 4)),
  // No reviews backend yet — Plan 07 builds the `avis` module. Return an
  // honest empty list rather than calling an endpoint that doesn't exist.
  reviewsFor: (_practitionerId: string): Promise<Review[]> => Promise.resolve([]),
};

// ---------- Disciplines ----------
export const disciplineRepo = {
  list: (): Promise<Discipline[]> =>
    api.get<{ data: any[] }>('/disciplines').then((res) => res.data.map(mapDiscipline)),
  bySlug: (slug: string): Promise<Discipline | undefined> =>
    disciplineRepo.list().then((list) => list.find((d) => d.slug === slug)),
};

// ---------- Events ----------
export const eventRepo = {
  list: (): Promise<Event[]> => delay(eventsMock),
  byId: (id: string): Promise<Event | undefined> =>
    delay(eventsMock.find((e) => e.id === id)),
  featured: (): Promise<Event[]> => delay(eventsMock.slice(0, 2)),
};

// ---------- Exchanges ----------
export const exchangeRepo = {
  list: (): Promise<Exchange[]> => delay(exchangesMock),
  byId: (id: string): Promise<Exchange | undefined> =>
    delay(exchangesMock.find((x) => x.id === id)),
  create: (draft: Partial<Exchange>): Promise<Exchange> => {
    const created: Exchange = {
      id: `x${Date.now()}`,
      who: 'Vous',
      role: 'Annecy',
      give: draft.give ?? '',
      want: draft.want ?? '',
      tag: (draft.tag ?? 'Soin contre soin') as Exchange['tag'],
      avatar: ['#C4B0E8', '#A8C8E8'] as const,
      ...draft,
    };
    exchangesMock.unshift(created);
    return delay(created);
  },
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

- [ ] **Step 4: Run the tests to verify they pass**

Run (in `mobile/`): `npm test -- index`
Expected: PASS.

- [ ] **Step 5: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/data/repos/index.ts mobile/src/data/repos/index.test.ts
git commit -m "feat(mobile): wire discipline and practitioner repos to the backend"
```

---

## Task 9: Mobile — event repo wiring

**Files:**
- Modify: `mobile/src/data/repos/index.ts`
- Test: `mobile/src/data/repos/index.test.ts`

Ground truth: same shape gap as web's events task — backend `Event` rows are `{id, titre, type, dates: string[], lieu, prix, nombre_places, description, status}`, with `animateurs[]` (real `Praticien` rows + `pivot.role`) added only by `GET /api/events/:id`, not the list endpoint. Mobile's `Event` type wants `{id, title, kind, when, where, price, priceFrom, gradient, hosts?:[{name,spec,gradient}], program?, meta?}`. Same treatment as the web adapter: `gradient`/`kind`-suffix decoration gets a fixed default, `program` has no backend source and stays `undefined` (already safely guarded by `{e.program ? (...) : null}` in `app/event/[id].tsx`), and the public `list()`/`featured()` calls filter to `status=publié` per the same decision applied on web.

- [ ] **Step 1: Extend the failing test**

Add to `mobile/src/data/repos/index.test.ts`, after the `mapDiscipline` describe block:

```typescript
import { mapEvent } from './index';

describe('mapEvent', () => {
  const row = {
    id: 4, titre: 'Retraite équinoxe', type: 'retraite', dates: ['2026-08-01', '2026-08-02'],
    lieu: 'Lyon', prix: '120.00', nombre_places: 20, description: 'desc', status: 'publié',
  };

  it('maps real fields directly and stringifies the numeric id', () => {
    const e = mapEvent(row);
    expect(e.id).toBe('4');
    expect(e.title).toBe('Retraite équinoxe');
    expect(e.where).toBe('Lyon');
    expect(e.priceFrom).toBe(120);
  });

  it('maps real animateurs into hosts, defaults to an empty list otherwise', () => {
    const withHosts = mapEvent({ ...row, animateurs: [{ firstname: 'A', lastname: 'B', specialite: 'yoga' }] });
    expect(withHosts.hosts).toEqual([{ name: 'A B', spec: 'yoga', gradient: ['#C4B0E8', '#A8C8E8'] }]);
    expect(mapEvent(row).hosts).toEqual([]);
  });
});
```

(The import line merges with the existing `import { mapDiscipline, mapPraticien } from './index';` — combine them into one `import { mapDiscipline, mapPraticien, mapEvent } from './index';` line at the top of the file.)

- [ ] **Step 2: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- index`
Expected: FAIL — `mapEvent` is not exported from `./index`.

- [ ] **Step 3: Add the event adapter and rewire `eventRepo`**

In `mobile/src/data/repos/index.ts`:

Remove the now-unused import:

```typescript
import { eventsMock } from '../mock/events';
```

Add, right after `mapDiscipline`:

```typescript
function formatEventDates(dates: string[]): string {
  if (!Array.isArray(dates) || dates.length === 0) return '';
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));
  if (dates.length === 1) return fmt(dates[0]);
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
}

export function mapEvent(row: any): Event {
  const when = formatEventDates(row.dates);
  return {
    id: String(row.id),
    title: row.titre,
    kind: (row.type || '').toUpperCase(),
    when,
    where: row.lieu,
    price: `${Math.round(Number(row.prix))} €`,
    priceFrom: Number(row.prix),
    gradient: DEFAULT_GRADIENT,
    description: row.description,
    hosts: (row.animateurs ?? []).map((a: any) => ({
      name: `${a.firstname} ${a.lastname}`.trim(),
      spec: a.specialite ?? '',
      gradient: DEFAULT_GRADIENT,
    })),
    program: undefined,
    meta: { dates: when, place: row.lieu, seats: row.nombre_places },
  };
}
```

Replace the `eventRepo` block:

```typescript
export const eventRepo = {
  list: (): Promise<Event[]> =>
    api.get<{ data: any[] }>('/events?status=publié&per_page=50').then((res) => res.data.map(mapEvent)),
  byId: (id: string): Promise<Event | undefined> =>
    api.get<{ data: any }>(`/events/${id}`).then((res) => mapEvent(res.data)).catch(() => undefined),
  featured: (): Promise<Event[]> => eventRepo.list().then((list) => list.slice(0, 2)),
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run (in `mobile/`): `npm test -- index`
Expected: PASS.

- [ ] **Step 5: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/data/repos/index.ts mobile/src/data/repos/index.test.ts
git commit -m "feat(mobile): wire event repo to the backend"
```

---

## Task 10: Mobile — Circle type + cercle repo + CircleCard component

**Files:**
- Modify: `mobile/src/data/types.ts`, `mobile/src/data/repos/index.ts`
- Create: `mobile/src/components/CircleCard.tsx`
- Test: `mobile/src/data/repos/index.test.ts`

Ground truth: the `Cercle` entity is `{id, nom, description, color, animateur, created_at, updated_at}` — no status, no slug, no membership/feed. Per the brief, the new `Circle` type uses these exact backend field names verbatim (no transform layer, unlike `Practitioner`/`Discipline`/`Event` which had to bridge into an already-existing richer UI shape). `color` is a real validated hex column (`/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/` on the backend) — `CircleCard` uses it directly as a real per-item accent instead of a fixed default, since it genuinely is per-item real data.

- [ ] **Step 1: Add the `Circle` type**

In `mobile/src/data/types.ts`, add after the `Discipline` interface:

```typescript
export interface Circle {
  id: string;
  nom: string;
  description: string | null;
  color: string | null;
  animateur: string | null;
}
```

- [ ] **Step 2: Write the failing test**

Add to `mobile/src/data/repos/index.test.ts`, after the `mapEvent` describe block:

```typescript
import { mapCircle } from './index';

describe('mapCircle', () => {
  it('maps real fields verbatim and stringifies the numeric id', () => {
    const row = { id: 3, nom: 'Cercle Aura — Paris', description: 'Un espace de partage.', color: '#7B5FCF', animateur: 'Camille Rossi' };
    expect(mapCircle(row)).toEqual({
      id: '3', nom: 'Cercle Aura — Paris', description: 'Un espace de partage.', color: '#7B5FCF', animateur: 'Camille Rossi',
    });
  });

  it('passes through null fields as-is', () => {
    const row = { id: 5, nom: 'Cercle sans détails', description: null, color: null, animateur: null };
    expect(mapCircle(row)).toEqual({ id: '5', nom: 'Cercle sans détails', description: null, color: null, animateur: null });
  });
});
```

(Merge this import into the single `import { mapDiscipline, mapPraticien, mapEvent, mapCircle } from './index';` line at the top of the file.)

- [ ] **Step 3: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- index`
Expected: FAIL — `mapCircle` is not exported from `./index`.

- [ ] **Step 4: Add `mapCircle` and `cercleRepo`**

In `mobile/src/data/repos/index.ts`, add the `Circle` type to the existing type-only import:

```typescript
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  Conversation,
  ChatMessage,
  Review,
  Circle,
} from '../types';
```

Add, right after `mapEvent`:

```typescript
export function mapCircle(row: any): Circle {
  return {
    id: String(row.id),
    nom: row.nom,
    description: row.description,
    color: row.color,
    animateur: row.animateur,
  };
}
```

Add, right after the `eventRepo` block:

```typescript
// ---------- Cercles ----------
export const cercleRepo = {
  list: (): Promise<Circle[]> =>
    api.get<{ data: any[] }>('/cercles?per_page=50').then((res) => res.data.map(mapCircle)),
  byId: (id: string): Promise<Circle | undefined> =>
    api.get<{ data: any }>(`/cercles/${id}`).then((res) => mapCircle(res.data)).catch(() => undefined),
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run (in `mobile/`): `npm test -- index`
Expected: PASS.

- [ ] **Step 6: Write the CircleCard component**

Create `mobile/src/components/CircleCard.tsx` (forked from `EventCard.tsx` — same pressable-card/gradient-header/navigate-to-detail structure; drops the price/date footer since circles have neither):

```typescript
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Grain } from './Grain';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import type { Circle } from '@data/types';

export function CircleCard({ circle }: { circle: Circle }) {
  const router = useRouter();
  const accent = circle.color ?? colors.violet;
  const gradient = [accent, colors.ink] as const;

  return (
    <Pressable
      onPress={() => router.push(`/cercles/${circle.id}` as any)}
      style={[styles.card, shadows.card]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.img}
      >
        <Grain opacity={0.18} />
        <Text style={styles.name}>{circle.nom}</Text>
      </LinearGradient>
      <View style={styles.body}>
        {circle.animateur ? (
          <View style={styles.animateurRow}>
            <Icon name="inperson" size={13} color={colors.muted} />
            <Text style={styles.animateur}>Animé par {circle.animateur}</Text>
          </View>
        ) : null}
        {circle.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {circle.description}
          </Text>
        ) : null}
        <Text style={styles.cta}>Découvrir →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 22,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  img: {
    height: 120,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 16,
  },
  name: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 21,
    color: '#fff',
    lineHeight: 24,
  },
  body: { paddingHorizontal: 16, paddingVertical: 14 },
  animateurRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  animateur: { ...typography.small, fontSize: 12 },
  description: { ...typography.small, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cta: {
    ...typography.bodyMedium,
    color: colors.violet2,
    fontSize: 13,
  },
});
```

- [ ] **Step 7: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/data/repos/index.ts mobile/src/data/repos/index.test.ts mobile/src/components/CircleCard.tsx
git commit -m "feat(mobile): add Circle type, cercle repo, and CircleCard component"
```

---

## Task 11: Mobile — cercles list + detail screens

**Files:**
- Create: `mobile/app/cercles/index.tsx`, `mobile/app/cercles/[id].tsx`

These are new routes — `cercles/index.tsx` is a plain `ScreenHeader`-topped list (forked from `app/exchange/index.tsx`'s structure, since a card-grid like `evenements.tsx` isn't needed for a single simple list); `cercles/[id].tsx` is forked from `app/event/[id].tsx`'s hero chrome (back/heart/share icon circles over a gradient) with the price dock and program/hosts blocks removed — cercles have no price or schedule concept, and no real feed/member data to show (same rule as the web cercle detail page in Task 4).

- [ ] **Step 1: Write the cercles list screen**

Create `mobile/app/cercles/index.tsx`:

```typescript
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CircleCard } from '@components/CircleCard';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { cercleRepo } from '@data/repos';

export default function CerclesList() {
  const insets = useSafeAreaInsets();
  const { data: circles = [] } = useQuery({
    queryKey: ['cercles'],
    queryFn: cercleRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Cercles" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Text style={typography.eyebrow}>COMMUNAUTÉ</Text>
          <Text style={styles.h}>
            Les <Text style={styles.italic}>cercles</Text> Aura.
          </Text>
          <Text style={styles.sub}>
            Des espaces de partage continus, en ligne et en présentiel.
          </Text>
        </View>

        {circles.map((c) => (
          <CircleCard key={c.id} circle={c} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 24,
    lineHeight: 28,
    marginVertical: 8,
  },
  italic: {
    fontFamily: 'CormorantGaramond_500Medium_Italic',
    color: colors.violet2,
  },
  sub: { ...typography.small, lineHeight: 20 },
});
```

- [ ] **Step 2: Write the cercle detail screen**

Create `mobile/app/cercles/[id].tsx`:

```typescript
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Grain } from '@components/Grain';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { cercleRepo } from '@data/repos';

export default function CercleDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: c } = useQuery({
    queryKey: ['cercle', id],
    queryFn: () => cercleRepo.byId(String(id)),
  });

  if (!c) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const accent = c.color ?? colors.violet;
  const gradient = [accent, colors.ink] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top }]}>
          <Grain opacity={0.18} />
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <Pressable style={styles.iconCircle} onPress={() => router.back()}>
              <Icon name="back" size={20} color={colors.ink} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.iconCircle}>
                <Icon name="heart" size={18} color={colors.ink} />
              </Pressable>
              <Pressable style={styles.iconCircle}>
                <Icon name="share" size={18} color={colors.ink} />
              </Pressable>
            </View>
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.title}>{c.nom}</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 24 }}>
          {c.description ? <Text style={styles.p}>{c.description}</Text> : null}

          <View style={[styles.aboutCard, shadows.card]}>
            <Text style={styles.eyebrow}>À PROPOS</Text>
            {c.animateur ? (
              <View style={styles.row}>
                <Text style={styles.label}>Animation</Text>
                <Text style={styles.value}>{c.animateur}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, position: 'relative', padding: 24, justifyContent: 'flex-end' },
  heroActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFoot: { gap: 12 },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 34,
    color: '#fff',
    lineHeight: 36,
  },
  p: { ...typography.body, lineHeight: 25, marginBottom: 20, fontSize: 14.5 },
  aboutCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },
  eyebrow: { ...typography.eyebrow, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { ...typography.small, fontSize: 13 },
  value: { ...typography.bodyMedium, fontSize: 13 },
});
```

- [ ] **Step 3: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

(These two screens aren't reachable from any tab or link yet — routing them into `_layout.tsx` is Task 14. `npm run typecheck` still validates them on their own; a manual smoke test happens naturally once Task 14 wires navigation.)

- [ ] **Step 4: Commit**

```bash
git add mobile/app/cercles
git commit -m "feat(mobile): add cercles list and detail screens"
```

---

## Task 12: Mobile — Article type + article repo

**Files:**
- Modify: `mobile/src/data/types.ts`, `mobile/src/data/repos/index.ts`
- Test: `mobile/src/data/repos/index.test.ts`

Ground truth: same exact-field-name-verbatim rule as `Circle` (Task 10) — the backend `Article` entity's fields become the `Article` type's fields one-to-one, no renaming. `articleRepo.list()` filters to `status=publié` (same public-list rule as events/blog on web). `articleRepo.bySlug()` uses the `?slug=` filter added in Task 1 (`GET /api/articles?slug=xxx&per_page=1`, take `data[0]`) — articles' `index()` is paginated, so a client-side find-by-slug over one page wouldn't reliably work, unlike disciplines' unpaginated list.

- [ ] **Step 1: Add the `Article` type**

In `mobile/src/data/types.ts`, add after the new `Circle` interface (from Task 10):

```typescript
export interface Article {
  id: string;
  slug: string;
  titre: string;
  categorie: string;
  tonalite: string;
  extrait: string;
  corps: string;
  status: string;
  auteur: string;
  temps_lecture: number;
  image_couverture: string | null;
  meta_description: string | null;
  mot_clef: string | null;
  date_publication: string | null;
}
```

- [ ] **Step 2: Write the failing test**

Add to `mobile/src/data/repos/index.test.ts`, after the `mapCircle` describe block:

```typescript
import { mapArticle } from './index';

describe('mapArticle', () => {
  const row = {
    id: 9, slug: 'preparer-premiere-seance', titre: 'Préparer sa première séance',
    categorie: 'Conseils', tonalite: 'sage', extrait: 'extrait réel', corps: 'corps réel',
    status: 'publié', auteur: "L'équipe Aura", temps_lecture: 4,
    image_couverture: null, meta_description: null, mot_clef: null, date_publication: '2026-04-30T00:00:00.000Z',
  };

  it('maps every field verbatim and stringifies the numeric id', () => {
    expect(mapArticle(row)).toEqual({ ...row, id: '9' });
  });
});
```

(Merge this import into the single `import { mapDiscipline, mapPraticien, mapEvent, mapCircle, mapArticle } from './index';` line at the top of the file.)

- [ ] **Step 3: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- index`
Expected: FAIL — `mapArticle` is not exported from `./index`.

- [ ] **Step 4: Add `mapArticle` and `articleRepo`**

In `mobile/src/data/repos/index.ts`, add `Article` to the existing type-only import (alongside `Circle`):

```typescript
import type {
  Practitioner,
  Discipline,
  Event,
  Exchange,
  Conversation,
  ChatMessage,
  Review,
  Circle,
  Article,
} from '../types';
```

Add, right after `mapCircle`:

```typescript
export function mapArticle(row: any): Article {
  return {
    id: String(row.id),
    slug: row.slug,
    titre: row.titre,
    categorie: row.categorie,
    tonalite: row.tonalite,
    extrait: row.extrait,
    corps: row.corps,
    status: row.status,
    auteur: row.auteur,
    temps_lecture: row.temps_lecture,
    image_couverture: row.image_couverture,
    meta_description: row.meta_description,
    mot_clef: row.mot_clef,
    date_publication: row.date_publication,
  };
}
```

Add, right after the `cercleRepo` block:

```typescript
// ---------- Articles ----------
export const articleRepo = {
  list: (): Promise<Article[]> =>
    api.get<{ data: any[] }>('/articles?status=publié&per_page=50').then((res) => res.data.map(mapArticle)),
  bySlug: (slug: string): Promise<Article | undefined> =>
    api
      .get<{ data: any[] }>(`/articles?slug=${encodeURIComponent(slug)}&per_page=1`)
      .then((res) => (res.data[0] ? mapArticle(res.data[0]) : undefined)),
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run (in `mobile/`): `npm test -- index`
Expected: PASS.

- [ ] **Step 6: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/data/repos/index.ts mobile/src/data/repos/index.test.ts
git commit -m "feat(mobile): add Article type and article repo"
```

---

## Task 13: Mobile — blog list + detail screens

**Files:**
- Create: `mobile/app/blog/index.tsx`, `mobile/app/blog/[slug].tsx`

`blog/index.tsx` is forked from `app/exchange/index.tsx`'s `ScreenHeader`-topped simple-list structure (a card-grid isn't needed for editorial content). `blog/[slug].tsx` borrows `app/domain/[slug].tsx`'s intro-paragraph + italic pull-quote block styling (`borderLeftColor: colors.violet2`, `CormorantGaramond_400Regular_Italic`) since a blog article is pure editorial content, closer to that pattern than to the event detail screen's program/hosts blocks.

- [ ] **Step 1: Write the blog list screen**

Create `mobile/app/blog/index.tsx`:

```typescript
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { shadows } from '@theme/shadows';
import { articleRepo } from '@data/repos';

export default function BlogList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: articleRepo.list,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Journal" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Text style={typography.eyebrow}>JOURNAL</Text>
          <Text style={styles.h}>
            Lire, comprendre, <Text style={styles.italic}>ralentir.</Text>
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {articles.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => router.push(`/blog/${a.slug}` as any)}
              style={[styles.card, shadows.card]}
            >
              <Text style={styles.category}>{a.categorie}</Text>
              <Text style={styles.title}>{a.titre}</Text>
              <Text style={styles.excerpt} numberOfLines={2}>
                {a.extrait}
              </Text>
              <Text style={styles.meta}>
                {a.auteur} · {a.temps_lecture} min
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 24,
    lineHeight: 28,
    marginVertical: 8,
  },
  italic: {
    fontFamily: 'CormorantGaramond_500Medium_Italic',
    color: colors.violet2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  category: { ...typography.eyebrow, marginBottom: 8 },
  title: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 19,
    lineHeight: 23,
    marginBottom: 6,
    color: colors.ink,
  },
  excerpt: { ...typography.small, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  meta: { ...typography.tiny, fontSize: 11 },
});
```

- [ ] **Step 2: Write the blog detail screen**

Create `mobile/app/blog/[slug].tsx`:

```typescript
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { articleRepo } from '@data/repos';

export default function BlogDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: a } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => articleRepo.bySlug(String(slug)),
  });

  if (!a) return <View style={{ flex: 1, backgroundColor: colors.pearl }} />;

  const paragraphs = a.corps.split('\n\n').filter(Boolean);
  const pullIndex = paragraphs.length > 2 ? Math.floor(paragraphs.length / 2) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable style={styles.iconCircle} onPress={() => router.back()}>
            <Icon name="back" size={20} color={colors.ink} />
          </Pressable>
          <Pressable style={styles.iconCircle}>
            <Icon name="share" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          <Text style={typography.eyebrow}>{a.categorie}</Text>
          <Text style={styles.title}>{a.titre}</Text>
          <Text style={styles.meta}>
            {a.auteur} · {a.temps_lecture} min de lecture
          </Text>

          <View style={styles.pull}>
            <Text style={styles.pullTxt}>{a.extrait}</Text>
          </View>

          {paragraphs.map((para, i) =>
            i === pullIndex ? (
              <View key={i} style={styles.midPull}>
                <Text style={styles.midPullTxt}>{para}</Text>
              </View>
            ) : (
              <Text key={i} style={styles.p}>
                {para}
              </Text>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.whiteAlpha85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    marginTop: 10,
    marginBottom: 8,
  },
  meta: { ...typography.small, fontSize: 12, marginBottom: 18 },
  pull: {
    borderLeftWidth: 2,
    borderLeftColor: colors.violet2,
    paddingLeft: 16,
    marginBottom: 22,
  },
  pullTxt: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 20,
    lineHeight: 27,
    color: colors.ink,
  },
  p: { ...typography.body, marginBottom: 16, lineHeight: 24 },
  midPull: {
    borderLeftWidth: 2,
    borderLeftColor: colors.violet2,
    paddingLeft: 16,
    marginVertical: 18,
  },
  midPullTxt: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 20,
    lineHeight: 27,
    color: colors.ink,
  },
});
```

- [ ] **Step 3: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/blog
git commit -m "feat(mobile): add blog list and detail screens"
```

---

## Task 14: Mobile — register the 4 new routes

**Files:**
- Modify: `mobile/app/_layout.tsx`

- [ ] **Step 1: Add the Stack.Screen entries**

In `mobile/app/_layout.tsx`, add 4 entries following the existing plain, no-special-options pattern (matching how `event/[id]` and `domain/[slug]` are registered). Insert them after the `<Stack.Screen name="exchange/create" .../>` line:

```tsx
            <Stack.Screen name="exchange/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="cercles/index" />
            <Stack.Screen name="cercles/[id]" />
            <Stack.Screen name="blog/index" />
            <Stack.Screen name="blog/[slug]" />
            <Stack.Screen name="review" options={{ presentation: 'modal' }} />
```

(This replaces the single existing `<Stack.Screen name="exchange/create" options={{ presentation: 'modal' }} />` line — i.e. the 4 new lines are inserted directly beneath it, immediately before the existing `<Stack.Screen name="review" .../>` line.)

- [ ] **Step 2: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run the full mobile test suite to check for regressions**

Run (in `mobile/`): `npm test`
Expected: PASS (all suites, including `src/data/api/client.test.ts` from Plan 01 and `src/data/repos/index.test.ts` from Tasks 8–12 of this plan).

- [ ] **Step 4: Commit**

```bash
git add mobile/app/_layout.tsx
git commit -m "feat(mobile): register cercles and blog routes in the root layout"
```

---

## Self-review checklist (run before handing off)

- [ ] `server/`: `npm run test:e2e` green (includes the 2 new tests from Tasks 1–2).
- [ ] `web/`: `npm test` green (includes `find-by-slug.test.js`, `event-adapter.test.js`, `praticien-adapter.test.js`); `npm run build` succeeds.
- [ ] `mobile/`: `npm test` green (includes the 5 new `describe` blocks added to `src/data/repos/index.test.ts` across Tasks 8–12); `npm run typecheck` clean.
- [ ] No page left importing from `@/lib/data/disciplines`, `@/lib/data/admin` (cercles), `@/lib/data/events`, `@/lib/data/content` (blogPosts), or `@/lib/data/practitioners` in the 9 web files this plan touches — the mock files themselves are untouched (still used by out-of-scope admin/home/booking/compte pages).
- [ ] No mobile screen this plan touches imports from `src/data/mock/practitioners`, `src/data/mock/disciplines`, or `src/data/mock/events` any more; `src/data/mock/exchanges` and `src/data/mock/messages` are still used (out of scope).
- [ ] Every `Modify`-full-file-replacement page keeps its non-data-fetching JSX (styling, layout, modal/toast wiring) byte-for-byte identical to the original except where a section had zero real backing data.
- [ ] `web/app/(site)/praticien/[id]/ProfileBody.jsx`'s two `p.exchange` accesses are both guarded — the original unconditional `p.exchange.gives` would throw the moment `exchange` stopped being mock data.

## Self-review

**1. Spec coverage.** Walking the brief section by section:
- *Scope (5 domains × 2 platforms + 2 new mobile screen pairs):* disciplines (Task 3 + part of 8), praticiens (Task 7 + part of 8), events (Task 5 + Task 9), articles/blog (Task 6 + Tasks 12–13), cercles (Task 4 + Tasks 10–11) — all 5 domains covered on both platforms; cercles and blog mobile screens are new (Tasks 10–13); `_layout.tsx` wiring is Task 14. Covered.
- *Backend ground truth read and matched:* `disciplines.controller/service`, `events.controller/service`, `articles.controller/service`, `cercles.controller/service`, `praticiens.controller`, `envelope.ts`, `pagination.ts` were all read directly and their exact method bodies/field names are what Tasks 1–2's diffs and every adapter function are grounded in. Covered.
- *Slug↔id resolution (decision #2):* disciplines resolved client-side from the full cached list via `findBySlug` (Task 3); articles get a real backend `?slug=` filter with TDD (Task 1) and both frontends call `?slug=xxx&per_page=1` (Task 6 web, Task 12 mobile `articleRepo.bySlug`); cercles/events/praticiens fetch by numeric id directly, no resolution needed. Covered.
- *Cercles fake feed/members/status (decision #3):* dropped entirely on web (Task 4) — no `status` filter, no member/post counts, no fuzzy lead lookup, no `FEED` array, no member-preview sidebar. Mobile cercle screens (Task 11) never had this fake data to begin with (new screens). Covered.
- *Events status filter (decision #4):* backend filter added with TDD (Task 2); web list (Task 5) and mobile list/featured (Task 9) both call `?status=publié`; the caveat that no HTTP endpoint can currently *set* an event to `'publié'` is called out explicitly at the end of Task 2. Covered.
- *Reviews empty state (decision #5):* web praticien detail passes `reviews = []` with an inline comment citing Plan 07 (Task 7); mobile `practitionerRepo.reviewsFor` returns `Promise.resolve([])` typed as `Review[]` with the same comment (Task 8). Neither calls a nonexistent endpoint. Covered.
- *Test approach (decision #6):* backend Tasks 1–2 are full red→green TDD against the exact `createTestApp`/`http()` pattern from the existing specs. Every new non-trivial web helper (`findBySlug`, `mapEvent`/`formatEventDates`, `mapPraticien`) has a red→green Vitest cycle; pure JSX wiring is verified via `npm run build` only, per the decision. Every new non-trivial mobile function (`mapPraticien`, `mapDiscipline`, `mapEvent`, `mapCircle`, `mapArticle`) has a red→green jest-expo cycle in the shared `repos/index.test.ts`; screens are verified via `npm run typecheck` only. Covered.
- *Mobile new types match backend verbatim (decision, Circle/Article):* `Circle`/`Article` field lists in Tasks 10 and 12 are copied character-for-character from the brief's exact spec. Covered.
- *`_layout.tsx` registrations:* Task 14 adds all 4 routes, following the existing plain-registration pattern. Covered.
- *Exit criteria → unblocks Plan 04/06:* see dedicated section below.

**2. Placeholder scan.** Searched the plan for "TBD"/"TODO"/"add appropriate"/"similar to Task N"/"write tests for the above" — none found. Every step that changes code shows the complete resulting code (full-file replacements for web pages given how non-locally their JSX changes; targeted before/after snippets for the shared `repos/index.ts`, each anchored to a named function or block so there's no ambiguity about where they go). Every commit message is plain text with no AI attribution trailer, matching the hard project rule.

**3. Type/signature consistency across tasks, checked pairwise:**
- `mapPraticien`/`mapDiscipline`/`mapEvent`/`mapCircle`/`mapArticle` (mobile) are all defined once in `repos/index.ts` (Tasks 8–9, 10, 12) and consumed with matching names in Task 8/9's own repo bodies — no drift.
- `practitionerRepo.reviewsFor` signature (`(id: string) => Promise<Review[]>`) declared in Task 8 matches the untouched call site in `app/praticien/[id].tsx` (`practitionerRepo.reviewsFor(String(id))`) — confirmed by reading that screen; no call-site change was needed or made.
- `cercleRepo.list/byId` (Task 10) match the call sites written in Task 11's two new screens (`cercleRepo.list`, `cercleRepo.byId(String(id))`).
- `articleRepo.list/bySlug` (Task 12) match the call sites written in Task 13's two new screens.
- `Circle`/`Article` field names are used identically in the type (Tasks 10/12), the `mapCircle`/`mapArticle` functions (same tasks), and the screens that render them (Tasks 11/13) — e.g. `circle.nom`/`circle.animateur`/`circle.color` and `a.titre`/`a.corps`/`a.temps_lecture` appear consistently, never renamed partway through.
- Web: `mapPraticien`/`mapEvent` (Task 7/5) field names (`p.name`, `p.city`, `p.mode`, `p.price`, `e.title`, `e.where`, `e.meta.dates`) match exactly what the rewritten `PractitionerCard`/`ProfileBody`/`EventCard`-consuming pages read — verified against the actual unmodified `PractitionerCard.jsx`/`EventCard.jsx`/`Rating.jsx`/`Avatar.jsx` source read during research, not from memory.
- `findBySlug(list, slug)` (Task 3) signature matches its one call site in the same task's discipline detail page (`findBySlug(disciplines, slug)`).

**Issues found and fixed during this review:** two real `npm run typecheck` failures, both now corrected in the task text above. (1) `CircleCard.tsx` and `app/cercles/[id].tsx` (Tasks 10–11) originally passed `colors={[accent, colors.ink]}` straight into `LinearGradient` — `accent`/`colors.ink` are plain `string`s, so that array literal infers as `string[]`, which doesn't satisfy `LinearGradient`'s `readonly [string, string, ...string[]]` prop type; both now build a `const gradient = [accent, colors.ink] as const;` first. (2) `mapPraticien` (Task 8, mobile) originally set `experience: { years: row.experience, sessions: undefined as unknown as number }` to satisfy `Practitioner['experience']`'s required `sessions: number` — technically compiles but casts a lie through two layers; replaced with `experience: { years: row.experience } as Practitioner['experience']`, a single cast at the object boundary with a comment explaining the one consumer already treats `sessions` as optional via `?? 600`.

## Exit criteria → unblocks Plan 04/06

Both frontends show live backend data — not mock data — on every public browse/detail screen for the 5 read-only domains: `/disciplines`, `/discipline/[slug]`, `/cercles`, `/cercle/[id]`, `/evenements`, `/evenement/[id]`, `/blog`, `/blog/[slug]`, `/praticiens`, `/praticien/[id]` on web, and their mobile equivalents including the two brand-new screen pairs (`cercles/index`, `cercles/[id]`, `blog/index`, `blog/[slug]`). `GET /api/articles` supports `?slug=`; `GET /api/events` supports `?status=`, with both public list calls using it. All three test suites are green (`server` e2e, `web` Vitest + build, `mobile` jest-expo + typecheck).

**Next:**
- **Plan 04** (client-authenticated read/write domains) can build on the same `api`/react-query patterns established here for its own list/detail screens, once Plan 03's auth lands.
- **Plan 06** (admin wiring + guard hardening) can reuse the backend's `?status=`/`?slug=` filters for the admin article/event list screens (called without the public-only filter value, e.g. no `status` param at all to see every status) and should audit the admin praticien/cercle/event pages (`web/app/admin/**`), which were explicitly left untouched by this plan and still import from the original mock files.
