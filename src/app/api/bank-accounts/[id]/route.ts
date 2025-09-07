import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const { id } = await params
  const twofa = request.headers.get('x-2fa-code') || ''
  const res = await fetch(`${API_URL}/users/me/bank-accounts/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, ...(twofa ? { 'x-2fa-code': twofa } : {}) } })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}
