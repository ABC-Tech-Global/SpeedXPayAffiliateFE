import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })

  const endpoint = new URL('/api/affiliate/updateTourSeen', API_URL).toString()
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => null)
  const json = NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
  if (res.ok) {
    json.cookies.set('tourSeen', '1', { path: '/', maxAge: 60 * 60 * 24 * 365 })
  }
  return json
}
