import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const twofa = request.headers.get('x-2fa-code') || ''
  const res = await fetch(`${API_URL}/users/me/2fa/disable`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(twofa ? { 'x-2fa-code': twofa } : {}) }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? {}, { status: res.status })
}

