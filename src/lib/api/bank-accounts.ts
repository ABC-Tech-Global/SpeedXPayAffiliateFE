import 'server-only'

import { cookies } from 'next/headers'
import { API_URL } from '@/lib/config'

type BankAccount = { id: number; bank_name: string; account_number: string; is_default: boolean }

function isBankAccount(value: unknown): value is BankAccount {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return typeof obj.id === 'number'
    && typeof obj.bank_name === 'string'
    && typeof obj.account_number === 'string'
    && typeof obj.is_default === 'boolean'
}

async function authHeaders() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) throw new Error('missing auth token')
  return { Authorization: `Bearer ${token}` }
}

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { ...(init?.headers || {}), ...headers },
  })
  const data = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    const obj = (data && typeof data === 'object') ? data as Record<string, unknown> : {}
    const msg = (typeof obj.error === 'string' && obj.error)
      || (typeof obj.message === 'string' && obj.message)
      || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

export async function getBankAccounts(): Promise<{ accounts: BankAccount[] }> {
  const raw = await getJSON<unknown>(`/bank-accounts`)

  let accounts: BankAccount[] = []
  if (Array.isArray(raw)) {
    accounts = raw.filter(isBankAccount)
  } else if (raw && typeof raw === 'object') {
    const maybeAccounts = (raw as { accounts?: unknown }).accounts
    if (Array.isArray(maybeAccounts)) {
      accounts = maybeAccounts.filter(isBankAccount)
    }
  }

  return { accounts }
}
