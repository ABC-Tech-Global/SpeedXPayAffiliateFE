SPXA Codex — Next.js + API stack

## Stack
- Next.js 15 (App Router), React 19, Tailwind v4
- Auth via JWT (HttpOnly cookie) validated by an external API service managed by the backend team
- Protected routes: `/dashboard`, `/profile`, `/referrals`

## Prerequisites
- Node 20+
- Docker (optional; only if you run the companion API stack locally via its own repository or images)

## Environment
Copy `.env.example` to `.env.local` and fill in the values provided by the backend/API team. `API_URL` should point at the running API (default `http://localhost:4000` when you host it locally) and `JWT_SECRET` must match the API configuration.

```bash
cp .env.example .env.local
```

For production, start from the provided example and supply real values:

```bash
cp .env.production.example .env.production
```

Important:
- `API_URL` (preferred) or `NEXT_PUBLIC_API_URL` must point to the API base URL (default `http://localhost:4000`).
- `JWT_SECRET` must match between the Next.js middleware and the API.

## Production Checklist

- Env: set `NODE_ENV=production` for the app.
- Secrets:
  - `JWT_SECRET` set in the app and identical to the value used by the API service.
  - API URL set via `API_URL` (or `NEXT_PUBLIC_API_URL`) in the app.
  - Site URL set via `NEXT_PUBLIC_SITE_URL` (e.g., `https://app.example.com`).
  - If using Vercel Blob for uploads, set `BLOB_READ_WRITE_TOKEN` in the app and confirm the backend exposes assets via its configured blob domain (e.g. `BLOB_PUBLIC_BASE_URL`).
- Database: coordinate with the backend team so their deployment exposes the correct `DATABASE_URL` (append `sslmode=require` when required).
- CORS: ensure the API allows your site origin (e.g., `https://app.example.com`).
- Cookies: secure cookies are enabled automatically in prod (`secure: true`).
- Build & run:
  - App: `npm ci && npm run build && npm start` (port 3000).
  - API: follow the backend repository’s deployment guide; the service must run on the same JWT secret and exposed base URL.
- Health checks (API): `GET /health` and `GET /db/health` (available from the backend service).
- Storage: verify with the backend team that uploads persist and blob URLs match what the frontend stores.
- Docker: pass env via platform secrets and coordinate shared values with the backend infrastructure pipeline.

## Run the app

Ensure you have an API endpoint from the backend team (local, staging, or production) and set `API_URL` accordingly. Start the frontend:

```bash
npm run dev
```

App: http://localhost:3000
API: Use the URL supplied by the backend team (http://localhost:4000 if you run their service locally)

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
- `npm run stack:up` — Optional Docker Compose helper; requires the backend repository/build context to be available locally
- `npm run stack:logs` — Follow API/DB logs when running the optional Docker stack

## Project layout
- `src/app` — App Router
  - `(main)` — Authenticated routes and layout
  - `login` — Public login page
- `src/lib/server-auth.ts` — Server helpers to read cookie and fetch user
- `src/components` — UI + Navbar/UserMenu
- Backend API — lives in a separate repository/service managed by the backend team

## Conventions & Architecture

- Data layer: Server Components call backend endpoints via helpers in `src/lib/api/*` (split by feature: `users.ts`, `referrals.ts`, `payouts.ts`, `withdrawals.ts`). These functions:
  - Read the `token` from cookies and set Authorization.
  - Use `no-store` caching and throw on non-OK responses.
  - Return typed data defined in `src/types/api.ts`.

- Client API calls: Use `apiFetch<T>()` from `src/lib/api-client.ts` in Client Components. It:
  - Sets `no-store`, parses JSON, throws `ApiError` with a normalized message on failure.
  - Keeps components focused on UX and removes fetch boilerplate.

- UI badges: Reusable status badges live in `src/components/StatusBadges.tsx` (`StatusPill`, `OnboardingBadge`, `AccountStatusBadge`).

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
- In Server Components: `import { getProfile } from '@/lib/api/users'` and call directly.
  - In Client Components: continue to call Next routes via `apiFetch<T>()` (`src/lib/api-client.ts`).
