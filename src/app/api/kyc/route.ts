import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"
import { KycUpdateSchema, parseJson, validationError } from "@/lib/validation"
import { ZodError } from "zod"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })

  const res = await fetch(`${API_URL}/kyc/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  try {
    const body = await parseJson(request, KycUpdateSchema)

    const res = await fetch(`${API_URL}/kyc/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

