import 'server-only'

import { cookies } from 'next/headers'
import { API_URL } from '@/lib/config'
import type { ProfileResponse } from '@/types/api'

async function authHeaders() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) throw new Error('missing auth token')
  return { Authorization: `Bearer ${token}` }
}

export async function getProfile(): Promise<ProfileResponse> {
  const headers = await authHeaders()
  const [profRes, payRes, notifRes] = await Promise.all([
    fetch(`${API_URL}/profile`, { headers, cache: 'no-store' }),
    fetch(`${API_URL}/payment`, { headers, cache: 'no-store' }),
    fetch(`${API_URL}/notifications`, { headers, cache: 'no-store' }),
  ])
  // We are liberal in parsing to avoid throwing on a single failed branch.
  const profile = await profRes.json().catch(() => ({}))
  const payment = await payRes.json().catch(() => ({}))
  const notifications = await notifRes.json().catch(() => ({}))
  return { profile, payment, notifications }
}
