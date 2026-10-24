# RumahStock

A mobile-first household essentials app built with Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth/Postgres/Storage/Realtime, React Hook Form, and Zod. Money uses PostgreSQL `numeric` and Decimal.js; dates use Asia/Kuala_Lumpur.

## Current configuration

**Connected to your RumahStock Supabase project** (`uobvttelqccqyurjcyja`, Singapore). The schema, private image bucket, RLS policies, and Realtime publication are installed. The ignored `.env.local` contains the project URL and public publishable key; no service-role key is used. Open [localhost:3000](http://localhost:3000) to register or log in.

Email confirmation remains enabled. The local callback/confirmation URLs are allowlisted, and the hosted minimum password length is eight characters. When deploying, add that deployment’s origin and auth callback URLs in Supabase and update `NEXT_PUBLIC_SITE_URL`.

Hosted verification passed for password login, session persistence, owner/member invitations, private uploads, cross-household isolation, partial purchases, duplicate protection, conflict handling, and synchronization between two signed-in browser sessions. Temporary test accounts, households, purchases and images were removed. Signup/recovery email delivery still needs checking using your own mailbox; no test email was sent.

Without configuration, `/` opens `/demo`, a clearly labeled interactive sample household. Its changes persist in this browser’s localStorage under `rumahstock:explicit-demo:v1`. It never authenticates a user, uploads images, calls a real household, or seeds production data. You can reset it in demo Settings. Real protected routes redirect to login and fail closed without configuration.

## Run the application

Use Node.js 22.12 or newer (tested with Node 26) and npm. Versions are pinned in `package-lock.json`. TypeScript 6 and ESLint 9 are used for compatibility with Next’s current lint plugins; the newest majors have incompatible peers.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). To use real accounts, connect a fresh Supabase project or start the local stack below, copy `.env.example` to `.env.local`, fill in the URL and **publishable** key, then restart Next.js. Never put a service-role or secret key in `NEXT_PUBLIC_*` variables. This app needs neither.

The `dev` and `start` scripts allow up to 64 KiB of request headers. Cookies are shared across ports on `localhost`, so several local apps can exceed Node’s default 16 KiB limit and produce HTTP 431 before Next.js handles the request. Start through these npm scripts to apply the allowance. If old browser data still exceeds it, remove unnecessary localhost cookies in browser settings; that may sign you out of other local apps. Managed hosting has its own request-header limits. [Node header-size option](https://nodejs.org/api/cli.html#--max-http-header-sizesize).

## Local Supabase (Docker required)

The checked-in `supabase/config.toml` configures the local stack. No sample SQL is seeded.

```sh
npx supabase start
npx supabase db reset
npx supabase status
```

`db reset` recreates **the local development database** and applies `supabase/migrations/20261024025611_household_mvp.sql`. Use the local API URL and publishable/anon key printed by `status` in `.env.local`. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

The local mail viewer is normally [localhost:54324](http://localhost:54324); use the address printed by `supabase status`. Local email confirmation defaults to disabled for easier testing; enable `auth.email.enable_confirmations` to test confirmation emails. Password recovery emails can be opened in the local mail viewer.

## Hosted Supabase

1. Create a **fresh** project, preferably in Singapore. This migration is the initial schema for RumahStock.
2. For a **new installation**, apply the checked-in migrations in order, or use the Supabase CLI. The connected RumahStock project has already had all migrations applied:

   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

3. In **Project Settings → API**, copy the project URL and publishable key into `.env.local`. `NEXT_PUBLIC_SITE_URL` must be the exact public app origin, without a trailing slash. Restart/rebuild Next.js after changing public environment variables.
4. In **Authentication → URL Configuration**, set the Site URL to the app origin and allow these redirect URLs for each environment:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/confirm`
   - `https://YOUR_DOMAIN/auth/callback`
   - `https://YOUR_DOMAIN/auth/confirm`
5. Enable email/password sign-in. Choose whether signup email confirmation is required. The default Supabase confirmation and recovery templates use the configured redirects and work with `/auth/callback` (PKCE). Complete PKCE emails in the browser where the request began. For confirmation across browsers, an OTP template can link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`; recovery uses `type=recovery`. After confirming, reopen your household invitation link if necessary.
6. Configure your SMTP provider for reliable delivery outside development. Supabase’s test mail service can restrict recipients and send rates.
7. The migration creates the **private** `product-images` bucket (JPG/PNG/WebP, 5 MB), household folder policies, and Realtime publication entries. Ensure Postgres Changes is enabled for the published tables. Keep the `private` schema out of exposed Data API schemas.
8. Run Supabase’s Security/Performance Advisors and the hosted acceptance checks below before using real household data.

Phone camera access requires HTTPS (localhost is allowed). A plain HTTP LAN IP normally cannot access the camera. Use an HTTPS preview or tunnel with matching Supabase redirect configuration for device testing.

## Structure

```text
src/
  app/                  Server routes, auth callbacks, APIs, protected layout
    (household)/        Dashboard, items/details, shopping, scan, purchases, household, settings
    demo/               Explicitly separate sample household
  components/           App shell, household/realtime provider, reusable presentation
    ui/                 shadcn/ui source components
  features/             Validated forms, scanner, purchase/list workflows, server actions
  lib/                  Domain calculations, validation, shared labels, generated database types
    supabase/           Official SSR browser/server clients and configuration
supabase/migrations/    Initial schema, RPC, constraints, RLS, Storage and Realtime configuration
scripts/                PostgreSQL test harness and schema-derived type generator
tests/                  Calculation tests and Playwright browser flows
docs/                   Design reference and implementation/verification notes
```

The build sequence was schema/security → SSR authentication → household setup → product/list/purchase workflows → scanner → dashboard/responsive UI → database and browser checks. Navigation, status, and category labels are shared in `src/lib/labels.ts`; screen-specific copy stays in its feature module.

## Database and authorization

`auth.users → profiles → household_members → households`. Each user has at most one membership and each household has one owner. A household owns its product catalog, one availability row per product, one shared shopping list, invitation records, and purchase headers/lines. Composite foreign keys prevent cross-household product/list/purchase references.

All exposed tables have RLS. Application identities are verified with `auth.getUser()` before server reads and mutations; the SSR proxy refreshes cookies with `getClaims()`. Queries are request-local, use no household-wide public caching, and paginate beyond Supabase’s default response limit.

Clients have read policies and no direct table write grants. The public `household_action` RPC is an invoker wrapper around a private, narrowly scoped function. Every branch checks `auth.uid()` and membership; owner-only actions derive the role from the database. RLS helpers are private to avoid recursive membership policies. Invitation tokens are random, single-use, SHA-256 hashed at rest, revocable, and expire in seven days. Tokens are only returned when created, so copy the link then.

Purchase recording locks the product and shopping entry, checks the entry’s version, validates quantity/unit/date/price, snapshots the product name and package size, inserts a purchase, subtracts partial quantities, and updates availability **in one transaction**. A unique request key plus payload matching makes an identical retry return the existing receipt. Different requests with stale list versions are rejected. Forms disable repeated submissions and preserve their request key for retries.

Pending entries are unique per product/list. Removing one keeps its history internally. Products are archived, never deleted; purchase snapshots survive edits and archiving. Pending products must be removed from the shopping list before archiving. Owners can remove members; owner transfer and deleting accounts/households are outside this MVP.

Storage writes are limited to the member’s household UUID folder. Uploads validate size, MIME type and file signatures on the server. Images are served through an authenticated, uncached route. Overwrites are disabled and each upload gets a new path. Failed item saves can leave unreferenced uploads; lifecycle cleanup is a future maintenance task.

Realtime changes cause an authoritative server refresh. Reconnect, browser focus/visibility, and a 60-second reconciliation refresh recover missed changes and membership revocation. The UI displays connection state. No offline write queue is provided.

## Prices and product lookup

Estimates use pending quantity × the most recent historical unit price with an exact product/package-size/purchase-unit match. Latest means purchase date, with recording time as a tiebreaker. Missing prices are excluded and counted. Actual spending sums immutable purchase line totals by the Malaysian purchase calendar month.

Scanning only identifies a product. Lookup first searches the household catalog, then calls Open Food Facts on the server with an eight-second timeout and an identifying User-Agent. Product details require review before saving. Unknown products, non-food products, provider outages, and denied camera permissions always have manual fallbacks. No external price is guessed. External food data is attributed to [Open Food Facts](https://world.openfoodfacts.org) under [ODbL](https://world.openfoodfacts.org/data). Household price records are entered by members.

The rear camera is preferred. Native BarcodeDetector is used only when it supports all four retail formats; otherwise the ZXing-C++ WebAssembly reader is loaded on demand. Repeated native-detector failures also switch to the software reader. It checks horizontal and rotated EAN/UPC barcodes, and empty frames continue scanning without warnings. `predev` and `prebuild` copy the matching decoder binary into `public/wasm`; it is served locally, and camera frames stay in the browser. Camera tracks are stopped on close, navigation, detection, tab backgrounding, and delayed acquisition after unmount. Each camera session accepts at most one detection.

## Validation commands

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run test:e2e
npm run build
```

Browser tests need Chromium: `npx playwright install chromium`. They run against a local server or `TEST_BASE_URL`; the explicit demo stays isolated in each test’s browser context. Use `E2E_PRODUCTION=1` with an already-running production build for stable checks.

`test:db` applies the **actual migration** to an isolated PostgreSQL/PGlite instance, supplies minimal test-only Auth/Storage schemas, creates different identities, and exercises permissions under the `authenticated` and `anon` roles. It needs neither Docker nor credentials. This verifies database behavior; it does not substitute for Supabase Auth, mail, Storage service, or Realtime transport tests.

Database TypeScript types are generated from the migration rather than manually maintained:

```sh
npm run db:types:offline
# With a running local Supabase stack, use the official generator instead:
npm run db:types
# Hosted alternative:
npx supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public > src/lib/database.types.ts
```

Regenerate after schema changes and run the type check. The offline generator uses the actual PostgreSQL information schema; it intentionally emits no relationship join metadata because queries use separately typed tables.

## Acceptance checks for a new deployment

Core hosted flows have been verified against the connected project; see the verification report. Repeat this checklist for a new deployment. Real email delivery and physical-phone recognition still need checking. Use two browser profiles for users A and B and a third, unrelated household C:

- Register and confirm A; log in, refresh, log out, then test forgot/reset-password email delivery and callbacks.
- Create A’s household. Generate an invitation; join B. Check expired, used, and revoked tokens fail. B must not be able to manage invitations or members.
- Save a camera-scanned known product and a manually created unknown product; test camera denial and manually uploaded photos on a real phone.
- With both household sessions open, add/edit/remove an entry and update availability. Verify immediate synchronization, then disconnect and reconnect B.
- Partially purchase an entry. Confirm remaining quantity, actual spending, historical unit price, resulting availability, and preserved snapshots.
- Submit the same purchase twice and try simultaneous purchases from stale forms. There must be no duplicate receipt or lost remainder.
- Confirm missing and incompatible prices are excluded from estimates. C must not see or mutate A/B’s products, lists, purchases, invitations, or images, including by calling the Data API directly.

See [verification notes](docs/verification.md) for what was actually tested and remaining limits. Receipt scanning, expiry tracking, offline synchronization, automatic consumption, and live retailer prices are intentionally outside this release.

## Reference documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [ZXing WebAssembly](https://github.com/Sec-ant/zxing-wasm)
- [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/)
