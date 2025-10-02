import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

type BankAccount = { id: number; bank_name: string; account_number: string; is_default: boolean }
type CreateBankAccountBody = {
  bankName?: string
  bankAccountNumber?: string
  makeDefault?: boolean
}

function normalizeAccounts(payload: unknown): BankAccount[] {
  if (!Array.isArray(payload)) {
    if (payload && typeof payload === 'object') {
      const maybeAccounts = (payload as { accounts?: unknown }).accounts
      if (Array.isArray(maybeAccounts)) {
        return normalizeAccounts(maybeAccounts)
      }
    }
    return []
  }
  return payload.filter((item): item is BankAccount => {
    if (!item || typeof item !== 'object') return false
    const candidate = item as Record<string, unknown>
    return typeof candidate.id === 'number'
      && typeof candidate.bank_name === 'string'
      && typeof candidate.account_number === 'string'
      && typeof candidate.is_default === 'boolean'
  })
}

function parseBody(value: unknown): CreateBankAccountBody {
  if (!value || typeof value !== 'object') return {}
  const record = value as Record<string, unknown>
  return {
    bankName: typeof record.bankName === 'string' ? record.bankName : undefined,
    bankAccountNumber: typeof record.bankAccountNumber === 'string' ? record.bankAccountNumber : undefined,
    makeDefault: typeof record.makeDefault === 'boolean' ? record.makeDefault : undefined,
  }
}

function extractId(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = (value as Record<string, unknown>).id
  return typeof candidate === 'number' ? candidate : undefined
}

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const res = await fetch(`${API_URL}/bank-accounts`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  const accounts = normalizeAccounts(data)
  return NextResponse.json({ accounts }, { status: res.ok ? 200 : res.status })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const rawBody = await request.json().catch(() => ({}))
  const body = parseBody(rawBody)
  const twofa = request.headers.get('x-2fa-code') || ''
  const res = await fetch(`${API_URL}/bank-accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(twofa ? { 'x-2fa-code': twofa } : {}),
    },
    body: JSON.stringify({
      bankName: body.bankName,
      bankAccountNumber: body.bankAccountNumber,
      makeDefault: body.makeDefault,
    }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) return NextResponse.json(data ?? { error: 'Failed to create' }, { status: res.status })

  const createdId = extractId(data)

  // Try to fetch the created account to return a consistent shape
  try {
    const listRes = await fetch(`${API_URL}/bank-accounts`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    const listData = await listRes.json().catch(() => null)
    const accounts = normalizeAccounts(listData)
    const found = typeof createdId === 'number' ? accounts.find((account) => account.id === createdId) : undefined
    if (found) return NextResponse.json({ account: found }, { status: 201 })

    const fallback: BankAccount = {
      id: createdId ?? 0,
      bank_name: body.bankName ?? '',
      account_number: body.bankAccountNumber ?? '',
      is_default: Boolean(body.makeDefault),
    }
    return NextResponse.json({ account: fallback }, { status: 201 })
  } catch {
    const fallback: BankAccount = {
      id: createdId ?? 0,
      bank_name: body.bankName ?? '',
      account_number: body.bankAccountNumber ?? '',
      is_default: Boolean(body.makeDefault),
    }
    return NextResponse.json({ account: fallback }, { status: 201 })
  }
}
