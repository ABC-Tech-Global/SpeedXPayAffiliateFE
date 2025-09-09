# Frontend Project Structure Guide

This document explains how the frontend is organized, why it’s structured this way, and how to work within it effectively. It’s tailored to this repository’s Next.js 15 + React 19 + Tailwind v4 stack and JWT-based auth.

## At a Glance

```
src/
  app/                    # Next.js App Router (pages, layouts, route handlers)
    (main)/              # Authenticated area and shared layout
    login/               # Public login page
    password-reset/      # Public password reset
    api/                 # Next.js route handlers (server-side only)
  components/            # Reusable UI components
    ui/                  # UI primitives (buttons, inputs, dialog, etc.)
  features/              # Domain-oriented modules (kyc, referrals, payouts, profile, onboarding)
  lib/                   # Core utilities & data access
    api/                 # Server-side API helpers by domain
  types/                 # Shared TypeScript types (API shapes)
  middleware.ts          # Auth guard for protected routes
public/                  # Static assets
server/                  # Express API + Postgres (separate service)
```

- Language: TypeScript
- Framework: Next.js 15 (App Router) + React 19
- Styling: Tailwind v4
- Tests: Vitest (add under `src/__tests__` or `*.test.ts?(x)`)


## Design Principles

- Single source of truth for data access: server-side helpers in `src/lib/api/*` for secure, typed fetching.
- Clear boundary between server and client:
  - Server Components and route handlers call the upstream API directly.
  - Client Components use small internal Next API routes or a generic `apiFetch()` for UI actions.
- Feature-first organization: domain code lives in `src/features/<domain>/*` and is consumed by routes.
- Reuse by layers: primitives in `components/ui`, composites in `components`, feature UIs in `features/*/components`.
- Predictable routing: public routes live at `src/app/login` and `src/app/password-reset`; authenticated routes sit under `src/app/(main)`.


## src/app — App Router

This folder contains pages, layouts, loading and error boundaries, and server-only route handlers.

- Route groups for auth: `src/app/(main)` contains authenticated pages and an async layout that enforces auth.
  - Example: `src/app/(main)/layout.tsx` uses `requireUser()` to redirect unauthenticated requests.
- Public routes: `src/app/login/[[...login]]/page.tsx` and `src/app/password-reset/page.tsx`.
- Streaming: pages may wrap expensive components in `React.Suspense` with `loading.tsx` fallbacks.
- API route handlers: `src/app/api/*/route.ts` are server-only handlers used for client-driven actions (login, logout, uploads, etc.). These can read cookies and safely talk to the upstream API.

Minimal examples:

Server layout enforcing auth (`src/app/(main)/layout.tsx`):
```tsx
// Server Component
import { ReactNode } from 'react'
import { requireUser } from '@/lib/server-auth'

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser() // redirects to /login if unauthenticated
  return <>{children}</>
}
```

Public login page computing next target (`src/app/login/[[...login]]/page.tsx`):
```tsx
export default async function LoginPage({ params, searchParams }) {
  const sp = await searchParams
  const p = await params
  const path = p.login?.length ? `/${p.login.join('/')}` : '/'
  const target = path === '/' ? '/dashboard' : path
  const nextHref = `${target}${new URLSearchParams(sp).toString() ? `?${new URLSearchParams(sp)}` : ''}`
  // Render <LoginForm nextHref={nextHref} />
}
```

Internal API route proxying to upstream (`src/app/api/login/route.ts`):
```ts
export async function POST(req: Request) {
  // Validate body, call `${API_URL}/auth/login`, set HttpOnly cookie, return result
}
```

Why keep `app/api` when `lib/api` exists?
- `app/api` is for client-initiated actions that require server context (cookies, secrets, file handling).
- `lib/api` is for server-side data fetching from Server Components without the extra network hop.


## src/middleware.ts — Auth Guard

The middleware verifies the `token` cookie for protected paths and redirects to `/login` on failure. It keeps public routes lightweight and enforces consistent auth across the app.

- Matcher covers: `/dashboard`, `/referrals`, `/profile`, `/payouts`, `/kyc`.
- Validation uses `jose.jwtVerify` against `JWT_SECRET` (must match the API’s secret).

Benefits: instant redirect before rendering, prevents flashing unauthenticated UI, and centralizes auth.


## src/lib — Core Utilities & Data Layer

- `config.ts`: Resolves `API_URL` from env with safe defaults.
- `server-auth.ts`: Server-only helpers to read cookies and fetch the current user (`getCurrentUser`, `requireUser`).
- `api-client.ts`: Generic `apiFetch<T>()` for client-side calls to internal routes; normalizes errors.
- `validation.ts` + `schemas.ts`: Zod-based validation utilities for API routes.
- `format.ts`: Currency/date formatting helpers.
- `url.ts`: Client-side URL helpers (pagination, query param updates).
- `api/*`: Server-only, domain-focused helpers that call the upstream API (e.g., `users.ts`, `kyc.ts`, `referrals.ts`, `payouts.ts`, `withdrawals.ts`, `bank-accounts.ts`). These:
  - Read the `token` from cookies and set `Authorization`.
  - Use `cache: 'no-store'`.
  - Throw with clear messages on non-OK responses.

Examples:

Server data fetch (`src/lib/api/payouts.ts`):
```ts
import { cookies } from 'next/headers'
import { API_URL } from '@/lib/config'

export async function getPayouts(params?: { page?: number; limit?: number }) {
  const token = (await cookies()).get('token')?.value
  const usp = new URLSearchParams()
  if (params?.page) usp.set('page', String(params.page))
  const res = await fetch(`${API_URL}/payouts?${usp}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to load payouts')
  return res.json()
}
```

Client call (`src/lib/api-client.ts`):
```ts
export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, { cache: 'no-store', ...init })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError('Request failed', res.status, data)
  return data as T
}
```


## src/components — UI Library

- `components/ui/*`: Reusable UI primitives (buttons, cards, dialogs, inputs) styled with Tailwind and Radix. These are low-level, composable building blocks.
- `components/*`: App-wide composites like `Navbar`, `UserMenu`, `AnnouncementsCarousel`, `StatusBadges`, etc.

Example:
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function Example() {
  return (
    <Card>
      <CardHeader><CardTitle>Example</CardTitle></CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  )
}
```

Naming: Components use `PascalCase.tsx`. Keep primitives generic and accessible; add feature-specific UI inside `src/features` instead.


## src/features — Domain Modules

Group feature code by domain to keep pages thin and encourage reuse:

- `features/kyc`: KYC client and widgets
- `features/referrals`: Filters, tabs, pagination
- `features/payouts`: Withdraw flow and filters
- `features/profile`: Tabs, hooks (e.g., 2FA prompt)
- `features/onboarding`: Dialog buttons, onboarding helpers

Usage pattern:
- Server pages fetch data via `src/lib/api/*` and render feature components.
- Client interactions inside feature components call internal API routes or use thin client fetchers.

Adding a new feature (example: reports):
```
src/features/reports/components/ReportsTable.tsx
src/features/reports/hooks/useReports.ts
```
Then create a page at `src/app/(main)/reports/page.tsx` and import the feature components.


## src/types — Shared Types

- Centralize API response/request shapes in `src/types/api.ts`.
- Keep pages and features typed and resilient to backend changes.


## public — Static Assets

- Favicon and public images live here. Refer with `/path.png` from components/pages.


## server — Upstream API (Reference)

- Separate Express + Postgres service. The frontend talks to it via `API_URL`.
- Frontend never exposes tokens to the client directly; tokens are HttpOnly cookies read server-side.


## Testing

- Framework: Vitest with jsdom for React tests.
- Location: `src/__tests__/` or co-located `src/**/*.test.ts?(x)`.
- What to test: utility logic (`lib/format`, `lib/url`), validation in `lib/validation`, and hooks/components with meaningful behavior. Keep server-only fetchers thin and test the utilities they depend on.

Example test snippet:
```ts
import { describe, expect, it } from 'vitest'
import { updateUrlParams } from '@/lib/url'

describe('updateUrlParams', () => {
  it('sets and removes params', () => {
    const url = updateUrlParams('https://x.test?a=1', { a: null, b: 2 })
    expect(url).toContain('b=2')
    expect(url).not.toContain('a=1')
  })
})
```


## Why This Structure & Benefits

- Separation of concerns:
  - Routing and page composition live in `app/`.
  - Domain UI and logic live in `features/`.
  - Cross-cutting utilities live in `lib/`.
  - Visual primitives live in `components/ui/`, while app-level composites live in `components/`.
- Secure data flow:
  - Server Components and route handlers read the auth cookie and call the upstream API directly.
  - Avoids leaking tokens to the client and removes an extra network hop for server rendering.
- Scalability and clarity:
  - Feature folders scale with product surface without bloating pages.
  - Co-location of hooks/components per feature improves discoverability and refactor safety.
- Performance:
  - Server rendering with streaming `Suspense` keeps TTFB low and interactivity high.
  - `cache: 'no-store'` on auth-bound fetches avoids cross-user cache bleed.
- Developer experience:
  - Consistent naming, typed helpers, and small examples reduce ramp-up time.
  - Tests are easy to place and focused on units with real logic.


## Conventions Recap

- Components: PascalCase file names; keep primitives generic.
- Utilities/hooks: kebab-case, named exports.
- Auth: HttpOnly `token` cookie; middleware + `requireUser()` protect private routes.
- Env: Set `API_URL` (or `NEXT_PUBLIC_API_URL`) and a shared `JWT_SECRET` between app and API.
- Tests: place in `src/__tests__/` or alongside implementation.


## Adding a New Page Safely (Checklist)

1) Place route under `src/app/(main)/<route>/page.tsx` if authenticated; otherwise under `src/app/<route>/page.tsx`.
2) Fetch server data in the page via `src/lib/api/<domain>.ts`.
3) Render existing feature components or create new ones under `src/features/<domain>/components`.
4) For client actions (forms, mutations), add a small handler under `src/app/api/<domain>/route.ts` and call it from the client via `apiFetch()`.
5) Add `loading.tsx`/`error.tsx` as needed, and tests for any new utility logic.

---

If you want this document expanded with diagrams or inline links to specific files, let’s add those next.

