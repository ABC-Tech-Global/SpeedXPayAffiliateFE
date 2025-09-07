import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const body = await req.json().catch(() => null) as { kind?: string; blobPath?: string; url?: string }
  if (!body || !body.kind || (!body.blobPath && !body.url)) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  const res = await fetch(`${API_URL}/kyc/me/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
}

