import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function GET(_req: Request, { params }: { params: { kind: string } }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return new Response(JSON.stringify({ error: "missing token" }), { status: 401 })

  const upstream = await fetch(`${API_URL}/me/kyc/image/${params.kind}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  const headers = new Headers()
  const ct = upstream.headers.get('content-type') || 'application/octet-stream'
  headers.set('content-type', ct)
  return new Response(upstream.body, { status: upstream.status, headers })
}

