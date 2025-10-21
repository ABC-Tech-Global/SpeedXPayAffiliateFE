import 'server-only'

import { cookies } from 'next/headers'

import { API_URL } from '@/lib/config'
import type { OnboardingOverview } from '@/types/api'

async function authHeaders() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) throw new Error('missing auth token')
  return { Authorization: `Bearer ${token}` }
}

function toNonNegativeNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) && num > 0 ? num : 0
}

function normalizeOverview(payload: unknown): OnboardingOverview {
  const data = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {}
  const payoutBankCount = toNonNegativeNumber(data.payoutBankCount)
  const commissionWalletBalance = toNonNegativeNumber(data.commissionWalletBalance)
  const totalReferrals = toNonNegativeNumber(data.totalReferrals)
  const activeReferrals = toNonNegativeNumber(data.activeReferrals)
  const deactivatedReferrals = toNonNegativeNumber(data.deactivatedReferrals)

  const requireSetup = typeof data.requireSetup === 'boolean'
    ? data.requireSetup
    : payoutBankCount < 1

  return {
    requireSetup,
    payoutBankCount,
    commissionWalletBalance,
    totalReferrals,
    activeReferrals,
    deactivatedReferrals,
  }
}

export async function getOnboardingOverview(): Promise<OnboardingOverview> {
  const headers = await authHeaders()
  const endpoint = new URL('/api/affiliate/viewOnboarding', API_URL).toString()
  const res = await fetch(endpoint, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    body: '',
  })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const error = (body && typeof body === 'object') ? body as Record<string, unknown> : {}
    const message = (typeof error.error === 'string' && error.error)
      || (typeof error.message === 'string' && error.message)
      || `Request failed (${res.status})`
    throw new Error(message)
  }

  const payload = (body && typeof body === 'object') ? (body as { data?: unknown }).data : null

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid onboarding overview response')
  }

  return normalizeOverview(payload)
}
