import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"
import { ProfileUpdateSchema, parseJson, validationError } from "@/lib/validation"
import { ZodError } from "zod"
import type { ProfileResponse } from "@/types/api"
import { deriveTourSeenFromProfile } from "@/features/onboarding/utils/tourSeen"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })

  const headers = { Authorization: `Bearer ${token}` }
  try {
    const [profRes, payRes, notifRes] = await Promise.all([
      fetch(`${API_URL}/profile`, { headers, cache: 'no-store' }),
      fetch(`${API_URL}/payment`, { headers, cache: 'no-store' }),
      fetch(`${API_URL}/notifications`, { headers, cache: 'no-store' }),
    ])

    const profile = await profRes.json().catch(() => ({}))
    const payment = await payRes.json().catch(() => ({}))
    const notifications = await notifRes.json().catch(() => ({}))

    const resp: ProfileResponse = {
      profile,
      payment,
      notifications,
    }

    const json = NextResponse.json(resp, { status: 200 })
    // Mirror server truth in a cookie for SSR hints (optional)
    const seen = deriveTourSeenFromProfile(profile as ProfileResponse["profile"]);
    if (seen === true) {
      json.cookies.set('tourSeen', '1', { path: '/', maxAge: 60 * 60 * 24 * 365 })
    } else if (seen === false) {
      json.cookies.set('tourSeen', '0', { path: '/', maxAge: 60 * 60 * 24 * 30 })
    }
    return json
  } catch {
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  try {
    const body = await parseJson(request, ProfileUpdateSchema)
    const twofa = request.headers.get('x-2fa-code') || ''

    const res = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(twofa ? { 'x-2fa-code': twofa } : {}) },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
