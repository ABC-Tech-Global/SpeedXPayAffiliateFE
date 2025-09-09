import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const res = await fetch(`${API_URL}/bank-accounts`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  const accounts = Array.isArray(data) ? data : (Array.isArray((data || {}).accounts) ? (data as any).accounts : [])
  return NextResponse.json({ accounts }, { status: res.ok ? 200 : res.status })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const twofa = request.headers.get('x-2fa-code') || ''
  const res = await fetch(`${API_URL}/bank-accounts`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(twofa ? { 'x-2fa-code': twofa } : {}) }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => null)
  if (!res.ok) return NextResponse.json(data ?? { error: 'Failed to create' }, { status: res.status })
  const id = (data && typeof (data as any).id !== 'undefined') ? (data as any).id : undefined
  // Try to fetch the created account to return a consistent shape
  try {
    const listRes = await fetch(`${API_URL}/bank-accounts`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const listData = await listRes.json().catch(() => null)
    const accounts = Array.isArray(listData) ? listData : []
    const found = typeof id !== 'undefined' ? accounts.find((a: any) => a?.id === id) : undefined
    if (found) return NextResponse.json({ account: found }, { status: 201 })
    // Fallback: synthesize a minimal account object
    const fallback = { id, bank_name: body?.bankName, account_number: body?.bankAccountNumber, is_default: Boolean(body?.makeDefault) }
    return NextResponse.json({ account: fallback }, { status: 201 })
  } catch {
    const fallback = { id, bank_name: body?.bankName, account_number: body?.bankAccountNumber, is_default: Boolean(body?.makeDefault) }
    return NextResponse.json({ account: fallback }, { status: 201 })
  }
}
