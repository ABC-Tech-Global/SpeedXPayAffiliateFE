import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  // Best effort server update; ignore failures in dev
  const res = await fetch(`${API_URL}/me/tour/seen`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
  const status = res?.status ?? 200
  const data = await res?.json().catch(() => ({}))
  const resp = NextResponse.json(data ?? {}, { status })
  // Also set a cookie so SSR can gate the overlay without extra API calls
  resp.cookies.set('tourSeen', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return resp
}
