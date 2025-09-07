import 'server-only'

import { cookies } from 'next/headers'
import { API_URL } from '@/lib/config'
import type { KycResponse } from '@/types/api'

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
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const obj = (data as Record<string, unknown>) || {}
    const msg = (typeof obj.error === 'string' && obj.error)
      || (typeof obj.message === 'string' && obj.message)
      || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return (data as T) ?? ({} as T)
}

export async function getKyc(): Promise<KycResponse> {
  return getJSON<KycResponse>('/kyc/me')
}

