import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"
import { ChangePasswordSchema, parseJson, validationError } from "@/lib/validation"
import { ZodError } from "zod"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  try {
    const body = await parseJson(request, ChangePasswordSchema)
    const twofa = request.headers.get('x-2fa-code') || ''

    const res = await fetch(`${API_URL}/account/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(twofa ? { 'x-2fa-code': twofa } : {}) },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    return NextResponse.json(data ?? { ok: res.ok }, { status: res.status })
  } catch (err) {
    if (err instanceof ZodError) return validationError(err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
