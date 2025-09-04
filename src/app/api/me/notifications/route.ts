import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })

  const res = await fetch(`${API_URL}/me/notifications`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const body = await request.json().catch(() => ({}))

  const res = await fetch(`${API_URL}/me/notifications`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
}

