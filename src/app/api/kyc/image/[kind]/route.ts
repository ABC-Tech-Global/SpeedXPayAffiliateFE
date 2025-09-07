import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { API_URL } from "@/lib/config"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return new Response(JSON.stringify({ error: "missing token" }), { status: 401 })
  const res = await fetch(`${API_URL}/kyc/image/${kind}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.url) return new Response(JSON.stringify({ error: data?.error || 'not found' }), { status: res.status })
  return Response.redirect(data.url, 302)
}
