import 'server-only'

import { cookies } from 'next/headers'
import { API_URL } from '@/lib/config'
import type {
  ProfileResponse,
  KycResponse,
  PayoutsResponse,
  WithdrawalsResponse,
  ReferralsResponse,
  ReferralDetailResponse,
  ReferralOrdersResponse,
} from '@/types/api'

type Json = Record<string, unknown> | unknown[] | null

async function authHeaders() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) throw new Error('missing auth token')
  return { Authorization: `Bearer ${token}` }
}

async function getJSON<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers: { ...(init?.headers || {}), ...headers },
  })
  let data: unknown = null
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const obj = (data as Record<string, unknown>) || {}
    const msg = (typeof obj.error === 'string' && obj.error)
      || (typeof obj.message === 'string' && obj.message)
      || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

export async function getProfile(): Promise<ProfileResponse> {
  return getJSON<ProfileResponse>('/me/profile')
}

export async function getKyc(): Promise<KycResponse> {
  return getJSON<KycResponse>('/me/kyc')
}

export async function getPayouts(params: { page?: number; limit?: number; type?: string } = {}): Promise<PayoutsResponse> {
  const usp = new URLSearchParams()
  if (params.page) usp.set('page', String(params.page))
  if (params.limit) usp.set('limit', String(params.limit))
  if (params.type) usp.set('type', params.type)
  const qs = usp.toString()
  return getJSON<PayoutsResponse>(`/me/payouts${qs ? `?${qs}` : ''}`)
}


export async function getWithdrawals(params: { page?: number; limit?: number } = {}): Promise<WithdrawalsResponse> {
  const usp = new URLSearchParams()
  if (params.page) usp.set('page', String(params.page))
  if (params.limit) usp.set('limit', String(params.limit))
  const qs = usp.toString()
  return getJSON<WithdrawalsResponse>(`/me/withdrawals${qs ? `?${qs}` : ''}`)
}


export async function getReferrals(params: { q?: string; onboarding?: string; account?: string; page?: number; limit?: number } = {}): Promise<ReferralsResponse> {
  const usp = new URLSearchParams()
  if (params.q) usp.set('q', params.q)
  if (params.onboarding) usp.set('onboarding', params.onboarding)
  if (params.account) usp.set('account', params.account)
  if (params.page) usp.set('page', String(params.page))
  if (params.limit) usp.set('limit', String(params.limit))
  const qs = usp.toString()
  return getJSON<ReferralsResponse>(`/me/referrals${qs ? `?${qs}` : ''}`)
}


export async function getReferralDetail(username: string): Promise<ReferralDetailResponse> {
  return getJSON<ReferralDetailResponse>(`/me/referrals/${encodeURIComponent(username)}`)
}


export async function getReferralOrders(username: string, params: { page?: number; limit?: number } = {}): Promise<ReferralOrdersResponse> {
  const usp = new URLSearchParams()
  if (params.page) usp.set('page', String(params.page))
  if (params.limit) usp.set('limit', String(params.limit))
  const qs = usp.toString()
  return getJSON<ReferralOrdersResponse>(`/me/referrals/${encodeURIComponent(username)}/orders${qs ? `?${qs}` : ''}`)
}

export async function getReferralsAccountBreakdown(): Promise<{ total: number; active: number; onboarding: number; deactivated: number }> {
  const [all, act, onb, dea] = await Promise.all([
    getReferrals({ page: 1, limit: 1 }),
    getReferrals({ page: 1, limit: 1, account: 'active' }),
    getReferrals({ page: 1, limit: 1, account: 'onboarding' }),
    getReferrals({ page: 1, limit: 1, account: 'deactivated' }),
  ])
  return {
    total: Number(all.total || 0),
    active: Number(act.total || 0),
    onboarding: Number(onb.total || 0),
    deactivated: Number(dea.total || 0),
  }
}
