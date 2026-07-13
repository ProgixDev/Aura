# Aura Plan 01 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both frontends a real, tested path to the NestJS backend, prove it end-to-end with one live endpoint, and clear the cheap navigation bugs.

**Architecture:** Add the missing `GET /api/praticiens/:id` endpoint (repo-direct, matching the existing praticiens controller). Introduce a shared-shape fetch client on each frontend (`web/lib/api.js`, `mobile/src/data/api/client.ts`) that unwraps the backend's `{status,data,pagination}` envelope, attaches a bearer token, and throws a typed `ApiError`. Stand up the missing test harnesses (Vitest on web, jest-expo on mobile). Backend keeps its existing Jest e2e harness.

**Tech Stack:** NestJS 11 + TypeORM + better-sqlite3 (e2e); Next.js 15 (React 19, plain JSX) + Vitest + @tanstack/react-query; Expo 54 / React Native 0.81 (TS) + jest-expo + @tanstack/react-query (already present).

**Reference:** [master roadmap](2026-07-13-aura-master-roadmap.md) · [checklist](../../frontend-functionality-checklist.md)

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/praticiens/praticiens.controller.ts` (modify) | Add `show(:id)` detail endpoint |
| `server/test/listing.e2e-spec.ts` (modify) | e2e tests for praticien detail + 404 |
| `web/.env.local` (create) | `NEXT_PUBLIC_API_URL` for dev |
| `web/lib/api.js` (create) | Web fetch client (`api`, `apiFetch`, `ApiError`, `setAuthToken`) |
| `web/lib/api.test.js` (create) | Vitest unit tests for the client |
| `web/vitest.config.mjs` (create) | Vitest config |
| `web/app/providers.jsx` (create) | Client-side react-query provider |
| `web/app/layout.jsx` (modify) | Wrap children in `<Providers>` |
| `web/package.json` (modify) | Add `@tanstack/react-query`, `vitest`; `test` script |
| `mobile/.env` (create) | `EXPO_PUBLIC_API_BASE` for dev |
| `mobile/src/data/api/client.ts` (create) | Mobile fetch client (same shape, TS) |
| `mobile/src/data/api/client.test.ts` (create) | jest-expo unit tests for the client |
| `mobile/src/store/session.ts` (modify) | Add `token` field + sync into api client |
| `mobile/package.json` (modify) | Add `jest`, `jest-expo`, `@types/jest`; jest config; `test` script |
| web route-link files (modify) | 7 dead-link fixes (Task 6) |

---

## Task 1: Backend — `GET /api/praticiens/:id`

**Files:**
- Modify: `server/src/praticiens/praticiens.controller.ts`
- Test: `server/test/listing.e2e-spec.ts`

- [ ] **Step 1: Write the failing tests**

In `server/test/listing.e2e-spec.ts`, capture the seeded praticien's id and add two tests. Change the praticien seed block (currently `await ds.getRepository(Praticien).save({...})`) to capture the row, and add a module-scope variable:

```typescript
describe('clients + praticiens listing', () => {
  let app: INestApplication;
  let praticienId: number;
  beforeAll(async () => {
    app = await createTestApp({ imports: [ClientsModule, PraticiensModule] });
    const ds = app.get(DataSource);
    await ds.getRepository(Client).save([
      { firstname: 'C1', lastname: 'L', email: 'c1@x.io', city: 'Paris' },
      { firstname: 'C2', lastname: 'L', email: 'c2@x.io', city: 'Lyon' },
    ]);
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'p@x.io', telephone: '06', ville: 'Nice',
      niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    praticienId = p.id;
  });
```

Then add these tests before the closing `});` of the describe block:

```typescript
  it('GET /api/praticiens/:id returns the praticien', async () => {
    const res = await http().get(`/api/praticiens/${praticienId}`).expect(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({ id: praticienId, firstname: 'P', ville: 'Nice' });
  });

  it('GET /api/praticiens/:id returns 404 for a missing praticien', async () => {
    await http().get('/api/praticiens/999999').expect(404);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:e2e -- listing.e2e-spec.ts`
Expected: FAIL — the detail test gets 404 for a valid id (no `:id` route), so the `.expect(200)` fails.

- [ ] **Step 3: Add the endpoint**

In `server/src/praticiens/praticiens.controller.ts`, extend the imports and add a `show` method:

```typescript
import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb, paginationUrls } from '../common/pagination';

@Controller('praticiens')
export class PraticiensController {
  constructor(@InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>) {}

  @Get()
  async index(@Query() query: Record<string, any>, @Req() req: Request) {
    const { page, perPage } = parsePagination(query, 10);
    const { data, pagination, lastPage } = await paginateQb(
      this.praticiens.createQueryBuilder('p'), page, perPage,
    );
    return success(data, undefined, {
      pagination: { ...pagination, ...paginationUrls(req, page, lastPage) },
    });
  }

  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    const praticien = await this.praticiens.findOne({ where: { id } });
    if (!praticien) throw new NotFoundException('Praticien introuvable');
    return success(praticien);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:e2e -- listing.e2e-spec.ts`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 5: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS (no other suite depends on the absence of `:id`).

- [ ] **Step 6: Commit**

```bash
git add server/src/praticiens/praticiens.controller.ts server/test/listing.e2e-spec.ts
git commit -m "feat(server): add GET /api/praticiens/:id detail endpoint"
```

---

## Task 2: Web — api client + Vitest harness

**Files:**
- Create: `web/lib/api.js`, `web/lib/api.test.js`, `web/vitest.config.mjs`, `web/.env.local`
- Modify: `web/package.json`

- [ ] **Step 1: Install Vitest and add the test script**

Run (in `web/`): `npm install -D vitest`

Then in `web/package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create the Vitest config**

Create `web/vitest.config.mjs`:

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/**/*.test.{js,jsx}'],
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `web/lib/api.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError, setAuthToken } from './api';

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('web api client', () => {
  beforeEach(() => { setAuthToken(null); });

  it('GET builds the URL and unwraps the success envelope', async () => {
    global.fetch = mockFetch(200, { status: 'success', data: [{ id: 1 }] });
    const res = await api.get('/praticiens');
    expect(res.data).toEqual([{ id: 1 }]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/praticiens',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('attaches the bearer token when set', async () => {
    global.fetch = mockFetch(200, { status: 'success', data: {} });
    setAuthToken('tok123');
    await api.get('/compte');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('throws ApiError on a non-2xx response', async () => {
    global.fetch = mockFetch(404, { status: 'error', message: 'Not found' });
    await expect(api.get('/nope')).rejects.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run (in `web/`): `npm test`
Expected: FAIL — `./api` does not exist ("Failed to resolve import").

- [ ] **Step 5: Write the api client**

Create `web/lib/api.js`:

```javascript
// Web API client. Wraps fetch, unwraps the backend { status, data, pagination }
// envelope, attaches a bearer token, and throws ApiError on failure.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let authToken = null;
export function setAuthToken(token) { authToken = token; }

export async function apiFetch(path, { method = 'GET', body, token, headers = {} } = {}) {
  const t = token ?? authToken;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let payload = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }

  if (!res.ok || (payload && payload.status === 'error')) {
    throw new ApiError(payload?.message || `Request failed (${res.status})`, res.status, payload);
  }
  return payload;
}

export const api = {
  get: (p, o) => apiFetch(p, { ...o, method: 'GET' }),
  post: (p, body, o) => apiFetch(p, { ...o, method: 'POST', body }),
  put: (p, body, o) => apiFetch(p, { ...o, method: 'PUT', body }),
  del: (p, o) => apiFetch(p, { ...o, method: 'DELETE' }),
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run (in `web/`): `npm test`
Expected: PASS (3 tests).

- [ ] **Step 7: Create the dev env file**

Create `web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

- [ ] **Step 8: Commit**

```bash
git add web/lib/api.js web/lib/api.test.js web/vitest.config.mjs web/.env.local web/package.json web/package-lock.json
git commit -m "feat(web): add API client + Vitest harness"
```

---

## Task 3: Web — react-query provider

**Files:**
- Create: `web/app/providers.jsx`
- Modify: `web/app/layout.jsx`, `web/package.json`

- [ ] **Step 1: Install react-query**

Run (in `web/`): `npm install @tanstack/react-query`

- [ ] **Step 2: Create the provider component**

Create `web/app/providers.jsx`:

```jsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function Providers({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 3: Wrap the app in the provider**

Modify `web/app/layout.jsx` — add the import and wrap the body contents:

```jsx
import { Cormorant_Garamond, Outfit } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import ModalRoot from '@/components/modals/ModalRoot';
import ToastRoot from '@/components/ui/ToastRoot';
```

Change the `<body>` block to:

```jsx
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <ModalRoot />
          <ToastRoot />
        </Providers>
      </body>
```

- [ ] **Step 4: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds (compiles all routes with the new provider; no runtime errors).

- [ ] **Step 5: Commit**

```bash
git add web/app/providers.jsx web/app/layout.jsx web/package.json web/package-lock.json
git commit -m "feat(web): add react-query provider"
```

---

## Task 4: Mobile — api client + jest-expo harness

**Files:**
- Create: `mobile/src/data/api/client.ts`, `mobile/src/data/api/client.test.ts`, `mobile/.env`
- Modify: `mobile/package.json`

- [ ] **Step 1: Install jest-expo and add config + script**

Run (in `mobile/`): `npm install -D jest jest-expo @types/jest`

Then in `mobile/package.json`, add to `"scripts"`:

```json
"test": "jest"
```

And add a top-level `"jest"` key:

```json
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tanstack/.*))"
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `mobile/src/data/api/client.test.ts`:

```typescript
import { api, ApiError, setAuthToken } from './client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('mobile api client', () => {
  beforeEach(() => setAuthToken(null));

  it('unwraps the success envelope', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: [{ id: '1' }] });
    const res = await api.get<{ data: { id: string }[] }>('/praticiens');
    expect(res.data).toEqual([{ id: '1' }]);
  });

  it('attaches the bearer token', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: {} });
    setAuthToken('tok');
    await api.get('/x');
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers.Authorization).toBe('Bearer tok');
  });

  it('throws ApiError on an error status', async () => {
    (global as any).fetch = mockFetch(500, { status: 'error', message: 'boom' });
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- client`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 4: Write the api client**

Create `mobile/src/data/api/client.ts`:

```typescript
// Mobile API client. Mirrors web/lib/api.js: wraps fetch, unwraps the backend
// { status, data, pagination } envelope, attaches a bearer token, throws ApiError.
const BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers = {} } = opts;
  const t = token ?? authToken;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let payload: any = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }

  if (!res.ok || payload?.status === 'error') {
    throw new ApiError(payload?.message ?? `Request failed (${res.status})`, res.status, payload);
  }
  return payload as T;
}

export const api = {
  get: <T = any>(p: string, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'GET' }),
  post: <T = any>(p: string, body?: unknown, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'POST', body }),
  put: <T = any>(p: string, body?: unknown, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'PUT', body }),
  del: <T = any>(p: string, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'DELETE' }),
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run (in `mobile/`): `npm test -- client`
Expected: PASS (3 tests).

- [ ] **Step 6: Create the dev env file**

Create `mobile/.env`:

```
EXPO_PUBLIC_API_BASE=http://localhost:8000/api
```

(Note: on a physical device, `localhost` must be the dev machine's LAN IP — documented, not blocking here.)

- [ ] **Step 7: Commit**

```bash
git add mobile/src/data/api/client.ts mobile/src/data/api/client.test.ts mobile/.env mobile/package.json mobile/package-lock.json
git commit -m "feat(mobile): add API client + jest-expo harness"
```

---

## Task 5: Mobile — auth token in session store

**Files:**
- Modify: `mobile/src/store/session.ts`

- [ ] **Step 1: Add the token field and sync it into the api client**

Modify `mobile/src/store/session.ts` to import `setAuthToken`, add a `token` field, a `setToken` action that also pushes into the api client, clear it on `signOut`, and rehydrate it on app start:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../data/api/client';

export type Role = 'seeker' | 'practitioner';

interface SessionState {
  hasSeenOnboarding: boolean;
  role: Role | null;
  firstName: string | null;
  practitionerActive: boolean;
  trialDaysLeft: number;
  token: string | null;
  setOnboardingSeen: () => void;
  setRole: (role: Role) => void;
  setFirstName: (name: string) => void;
  togglePractitionerActive: () => void;
  setToken: (token: string | null) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      role: null,
      firstName: 'Sarah',
      practitionerActive: true,
      trialDaysLeft: 23,
      token: null,
      setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      setRole: (role) => set({ role }),
      setFirstName: (firstName) => set({ firstName }),
      togglePractitionerActive: () =>
        set((s) => ({ practitionerActive: !s.practitionerActive })),
      setToken: (token) => {
        setAuthToken(token);
        set({ token });
      },
      signOut: () => {
        setAuthToken(null);
        set({ role: null, firstName: null, hasSeenOnboarding: false, token: null });
      },
    }),
    {
      name: 'aura.session',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);
```

- [ ] **Step 2: Verify types compile**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS (no type errors).

- [ ] **Step 3: Re-run the api client test to confirm no breakage**

Run (in `mobile/`): `npm test -- client`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/store/session.ts
git commit -m "feat(mobile): persist auth token in session store, sync to api client"
```

---

## Task 6: Web — dead-link bug batch

**Files (modify):** the 7 links below. These are pure string corrections — no new pages.

| File | Find | Replace |
|---|---|---|
| `web/app/(site)/compte/page.jsx` | `'/recherche'` | `'/praticiens'` |
| `web/app/(site)/compte/favoris/page.jsx` (2 occurrences) | `'/recherche'` | `'/praticiens'` |
| `web/app/(site)/compte/reservations/ReservationsBody.jsx` | `'/recherche'` | `'/praticiens'` |
| `web/app/(site)/compte/reservation/[id]/page.jsx` | `'/recherche'` | `'/praticiens'` |
| `web/app/(site)/reserver/[id]/BookingFlow.jsx` | `` `/praticiens/${p.id}` `` | `` `/praticien/${p.id}` `` |
| `web/app/admin/praticien/[id]/page.jsx` | `` `/praticiens/${p.id}` `` | `` `/praticien/${p.id}` `` |
| `web/app/admin/paiement/[id]/page.jsx` | `'/admin/reservations/' + booking.id` | `'/admin/reservation/' + booking.id` |

> Note: `web/app/admin/echanges/page.jsx` links rows to `/admin/echange/${id}` — that page genuinely does not exist. It is **built in Plan 06**, not fixed here. Leave it.

- [ ] **Step 1: Apply the 7 edits** (use the table above; open each file and replace).

- [ ] **Step 2: Verify no bad links remain**

Run (in `web/`):
```bash
grep -rn "/recherche" app/ ; grep -rn "praticiens/\${" app/ ; grep -rn "admin/reservations/" app/
```
Expected: no matches for `/recherche`; no `praticiens/${...}` template links (only the singular `praticien/${...}` should exist); no `admin/reservations/` string concatenations. (The sidebar/list routes `/praticiens` and `/admin/reservations` as standalone hrefs are fine — you are looking specifically for the interpolated/detail forms above.)

- [ ] **Step 3: Verify the build compiles**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/app
git commit -m "fix(web): correct dead navigation links (recherche→praticiens, plural→singular detail routes)"
```

---

## Self-review checklist (run before handing off)

- [ ] `server/`: `npm run test:e2e` green.
- [ ] `web/`: `npm test` green; `npm run build` succeeds.
- [ ] `mobile/`: `npm test` green; `npm run typecheck` clean.
- [ ] Both api clients expose the same surface: `api.get/post/put/del`, `ApiError`, `setAuthToken`.
- [ ] No leftover `/recherche` or interpolated plural `/praticiens/${id}` links in web.

## Exit criteria → unblocks Plan 02

Both frontends have a tested client that can call the backend and unwrap responses; `GET /api/praticiens/:id` is live; test harnesses exist on all three codebases; navigation bugs cleared. **Next:** Plan 02 wires the read-only public domains (disciplines, praticiens, events, articles, cercles) on both platforms using these clients.
