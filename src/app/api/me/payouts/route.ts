import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"
import { WithdrawRequestSchema, parseJson, validationError, parseQuery } from "@/lib/validation"
import { PayoutsQuerySchema } from "@/lib/schemas"
import { ZodError } from "zod"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  try {
    const q = parseQuery(request, PayoutsQuerySchema)
    const usp = new URLSearchParams()
    if (q.page) usp.set('page', String(q.page))
    if (q.limit) usp.set('limit', String(q.limit))
    if (q.type) usp.set('type', q.type)
    const res = await fetch(`${API_URL}/me/payouts${usp.toString() ? `?${usp.toString()}` : ''}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  try {
    const body = await parseJson(request, WithdrawRequestSchema)
    const res = await fetch(`${API_URL}/me/payouts/withdraw`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
