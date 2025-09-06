SPXA Codex — Next.js + API stack

## Stack
- Next.js 15 (App Router), React 19, Tailwind v4
- Auth via JWT (HttpOnly cookie) validated by a separate API (`server/`)
- Protected routes: `/dashboard`, `/profile`, `/referrals`

## Prerequisites
- Node 20+
- Docker (for Postgres + API)

## Environment
Copy `.env.example` to `.env.local` (Next) and `.env` in `server/` if needed. Ensure both share the same `JWT_SECRET`.

```bash
cp .env.example .env.local
# If running API outside docker, also create server/.env accordingly
```

For production, start from the provided examples and fill in real values:

```bash
cp .env.production.example .env.production
cp server/.env.production.example server/.env.production
```

Important:
- `API_URL` (preferred) or `NEXT_PUBLIC_API_URL` must point to the API base URL (default `http://localhost:4000`).
- `JWT_SECRET` must match between the Next.js middleware and the API.

## Production Checklist

- Env: set `NODE_ENV=production` for both app and API.
- Secrets:
  - `JWT_SECRET` set and identical in app and `server/`.
  - API URL set via `API_URL` (or `NEXT_PUBLIC_API_URL`) in the app.
  - Site URL set via `NEXT_PUBLIC_SITE_URL` (e.g., `https://app.example.com`).
- Database:
  - Provide `DATABASE_URL` (preferred) or full `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` in API.
  - If your Postgres requires TLS, append `sslmode=require` to `DATABASE_URL`.
- CORS: set `CORS_ORIGIN` in API to your site origin (e.g., `https://app.example.com`).
- Cookies: secure cookies are enabled automatically in prod (`secure: true`).
- Build & run:
  - App: `npm ci && npm run build && npm start` (port 3000).
  - API: `cd server && npm ci && npm run build && npm start` (port 4000).
- Health checks (API): `GET /health` and `GET /db/health`.
- Storage: persist `server/uploads/` if using KYC/image uploads.
- Docker: pass env via platform secrets; ensure the above variables are provided at runtime.

## Run the stack

Start Postgres and API (via Docker Compose):

```bash
npm run stack:up
# or run pieces
npm run db:up
npm run api:up
```

Start the Next.js app:

```bash
npm run dev
```

App: http://localhost:3000
API: http://localhost:4000

## Auth flow
1) Visit `/login` and sign in. On success, the app sets an HttpOnly `token` cookie.
2) Protected routes are guarded by `src/middleware.ts` and a server layout at `src/app/(main)/layout.tsx` which verifies the token and redirects to `/login` if invalid.
3) `Log out` clears the cookie via `/api/logout`.

## Scripts
- `npm run dev` — Next dev (Turbopack)
- `npm run build` — Production build
- `npm start` — Serve production
- `npm run lint` — Lint
- `npm run lint:fix` — Lint with autofix
- `npm run stack:up` — Start DB + API via Docker
- `npm run stack:logs` — Follow API/DB logs

## Project layout
- `src/app` — App Router
  - `(main)` — Authenticated routes and layout
  - `login` — Public login page
- `src/lib/server-auth.ts` — Server helpers to read cookie and fetch user
- `src/components` — UI + Navbar/UserMenu
- `server/` — Express API + Postgres

## Conventions & Architecture

- Data layer: Server Components call backend endpoints via helpers in `src/lib/api/me.ts`. These functions:
  - Read the `token` from cookies and set Authorization.
  - Use `no-store` caching and throw on non-OK responses.
  - Return typed data defined in `src/types/api.ts`.

- Client API calls: Use `apiFetch<T>()` from `src/lib/api-client.ts` in Client Components. It:
  - Sets `no-store`, parses JSON, throws `ApiError` with a normalized message on failure.
  - Keeps components focused on UX and removes fetch boilerplate.

- UI badges: Reusable status badges live in `src/components/StatusBadges.tsx` (`StatusPill`, `OnboardingBadge`, `AccountStatusBadge`, `KycStatusBadge`).

- Formatting: Use `src/lib/format.ts` for currency/date formatting; do not create ad‑hoc helpers in pages.

- Routing & pagination helpers: Use `src/lib/url.ts` (`updateUrlParams`, `clampPage`, `pageButtons`) inside client-side pagination UIs.

- QR codes: 2FA QR codes render locally via `src/components/QRCode.tsx` (no external network calls).

## ADR: Server Data Layer (src/lib/api/me.ts)

- Title: Centralize server-only backend access in `src/lib/api/me.ts`.
- Status: Accepted (2025-09-05)
- Context:
  - App Router with Server Components benefits from doing data fetching on the server.
  - Auth token is stored in HttpOnly cookie; reading it must happen on the server.
  - Multiple pages were re-implementing similar fetch logic or calling internal Next API routes.
- Decision:
  - Introduce a small server-only module (`server-only`) that reads the cookie via `cookies()` and calls the upstream API (`API_URL`) directly.
  - Export narrow, typed helpers (e.g., `getProfile`, `getPayouts`, `getReferrals`) returning shapes defined in `src/types/api.ts`.
  - Use `cache: 'no-store'` and throw on non-OK responses to fail fast.
  - Replace server-side calls to internal `/api/*` with these helpers to remove extra network hops and header plumbing.
- Consequences:
  - Pros: Consistent fetch approach, fewer moving parts in pages, better performance (one hop), safer token handling, easy for juniors to follow.
  - Cons: Light coupling to backend REST shapes; helpers must be updated when backend changes.
  - Testing: Logic is simple; defer unit tests to utility layers and keep helpers thin.
- Alternatives considered:
  - Per-page fetch + internal Next API routes: more boilerplate, extra hop, duplicated header logic.
  - Client-only data flow: pushes secrets to client; not acceptable.
  - tRPC/GraphQL gateway: more indirection and infra for this scope; revisit if product needs evolve.
- Usage:
  - In Server Components: `import { getProfile } from '@/lib/api/me'` and call directly.
  - In Client Components: continue to call Next routes via `apiFetch<T>()` (`src/lib/api-client.ts`).
