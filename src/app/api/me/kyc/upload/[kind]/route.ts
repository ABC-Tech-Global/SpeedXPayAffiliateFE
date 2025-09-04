import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function POST(request: Request, { params }: { params: { kind: string } }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const form = await request.formData()
  const res = await fetch(`${API_URL}/me/kyc/upload/${params.kind}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form as any,
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
}

export async function DELETE(_request: Request, { params }: { params: { kind: string } }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const res = await fetch(`${API_URL}/me/kyc/upload/${params.kind}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
}
