# Aura API (NestJS)

NestJS port of the Laravel API in `../server`. Same routes, same JSON envelopes, same French messages — endpoint-for-endpoint parity, with a documented set of deliberate fixes to real bugs found in the original PHP app during the port.

## Run

```bash
cp .env.example .env   # fill DB_* and JWT_SECRET (reuse values from ../server/.env if migrating an existing deployment)
npm install
npm run migration:run  # fresh DB only — see the migration plan doc for the existing-DB delta SQL
npm run start:dev      # http://localhost:8000/api
```

## Test

```bash
npx jest                             # unit tests (src/common/*.spec.ts)
npx jest --config test/jest-e2e.json # e2e tests (in-memory sqlite, no external DB needed)
```

## Architecture

- One NestJS module per original Laravel controller group (see `src/`).
- Shared response envelope (`src/common/envelope.ts`) matches Laravel's `{status, message, data}` JSON shape.
- Shared pagination helpers (`src/common/pagination.ts`) match Laravel's paginator shape (`current_page`, `last_page`, `per_page`, `total`, and optionally `next_page_url`/`prev_page_url`).
- Auth: JWT (HS256, same secret as the original app for a smooth cutover), three guards — `JwtAuthGuard` (must be logged in), `AdminGuard` (must be `is_admin`), `ClientGuard` (must have a linked `clients` row by email — this is a NEW mechanism that doesn't map to anything in Laravel; see Known Deviations below).

## Deliberate deviations from the PHP app

The full decision table (D1–D17) documenting every deliberate fix is in the migration plan at `docs/superpowers/plans/2026-07-13-php-to-nestjs-migration.md` in the git history of this branch. Highlights:

- **Admin verification routes actually enforce admin access now.** The Laravel `admin` middleware alias was referenced in routes but never registered — those routes crashed in production. Fixed here with real `AdminGuard` enforcement.
- **Client-scoped endpoints (echanges, paiements, remboursements) actually work now.** Laravel referenced an `Auth::guard('client')` that was never configured in `config/auth.php` — every client-scoped endpoint 500'd. Fixed here via `ClientGuard`, which resolves the JWT-authenticated user's linked `clients` table row by email (mirroring how the Laravel app already linked praticiens to users by email).
- **Schema corrections.** The `echanges` and `paiements` tables gained columns their Laravel controllers/models referenced but the original migrations never created (the PHP app would have thrown SQL errors on those code paths in production).
- **Route-ordering fixes.** Several `GET .../statistics` endpoints were unreachable in Laravel because `{id}` was declared first and shadowed the literal path "statistics". Fixed here by declaring literal routes before parameterized ones.
- **Broken/dead code dropped, not ported.** `Article::incrementViews()` (called but never defined), the `Reservation` model/controller (no table, no route), several controller methods with no matching route (`EmailTemplateController::restore/duplicate/preview/statistics/changeStatus`, `DisciplineController::search`, `ArticleController::showBySlug`).
- **Praticien registration is now transactional.** The Laravel original had no DB transaction around User+Praticien+5-document creation, so a mid-write failure could orphan rows. Fixed here with `DataSource.transaction(...)`.
- **File upload storage is hardened beyond the PHP original.** Path traversal via client-supplied filenames, missing file-size limits, and mimetype-only (spoofable) validation were all fixed during the port — see `src/common/storage.service.ts`/`src/common/upload.util.ts`.
- **Timezone-safe date comparisons.** A couple of "must be strictly after today" validations (promotions expiration, echange `delai_souhaite`) were fixed to compare UTC calendar-date strings rather than mixing local-midnight and UTC-parsed `Date` objects, which could accept or reject today's date incorrectly depending on server timezone — see `isStrictlyAfterToday` in `src/common/format.ts`.

## Known limitations / security debt (inherited from the PHP app, unchanged by this port)

- **Most catalog/content/admin-adjacent routes are PUBLIC** (cercles, events, promotions, disciplines, articles, notifications, email templates, and the admin-facing sides of echanges/paiements/remboursements) — this matches the real Laravel app's actual behavior, but it was never a deliberate security decision there, just an omission. Locking these down with proper auth is a follow-up, not something this migration took on unilaterally.
- **Praticien entity has no relation back to its linked `User` row** (by email) the way `verifiePar`/`createdBy` relations exist elsewhere — this was a gap in the original migration plan carried through Task 7, not an implementer oversight. If the admin frontend needs anything off that nested `user` object (e.g. `last_login_at`), the `Praticien` entity needs an email-joined relation added.
- **Reference number generation (`TX-#####`, `RMB-#####`) is not cryptographically unique** — 5 random digits, matching the Laravel original's `rand()`-based approach. Collision-possible at scale; a follow-up could switch to a sequence or UUID-based reference.

## Next steps (explicitly out of scope for this migration)

1. Auth hardening — put real guards on the currently-public admin/catalog surfaces once a decision is made about what should require auth.
2. Data migration script — copy rows from the existing Laravel MySQL database into this schema (the delta SQL for reusing the existing DB in-place, rather than a fresh one, is documented in the migration plan).
3. Point `web/`/`mobile/` frontends at this API's base URL and verify response-shape differences (numbers are JS numbers here vs. strings in Eloquent's JSON serialization in a few places; relation keys are camelCase here vs. snake_case in Laravel in a few places) don't break anything.
4. Decommission `../server` (the Laravel app) once parity is verified in staging.
