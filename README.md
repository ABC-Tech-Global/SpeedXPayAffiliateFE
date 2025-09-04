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

Important:
- `API_URL` (preferred) or `NEXT_PUBLIC_API_URL` must point to the API base URL (default `http://localhost:4000`).
- `JWT_SECRET` must match between the Next.js middleware and the API.

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
