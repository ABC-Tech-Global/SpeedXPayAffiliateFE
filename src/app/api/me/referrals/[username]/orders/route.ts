import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"
import { parseQuery, validationError } from "@/lib/validation"
import { ReferralOrdersQuerySchema } from "@/lib/schemas"
import { ZodError } from "zod"

export async function GET(request: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  try {
    const q = parseQuery(request, ReferralOrdersQuerySchema)
    const usp = new URLSearchParams()
    if (q.page) usp.set('page', String(q.page))
    if (q.limit) usp.set('limit', String(q.limit))
    const res = await fetch(`${API_URL}/me/referrals/${encodeURIComponent(username)}/orders${usp.toString() ? `?${usp.toString()}` : ''}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { orders: [], total: 0, page: 1, limit: 10 }, { status: res.status })
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
