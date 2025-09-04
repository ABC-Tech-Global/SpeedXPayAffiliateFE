import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const res = await fetch(`${API_URL}/me/2fa/enable`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? {}, { status: res.status })
}

