import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { API_URL } from '@/lib/config'

export type ServerCurrentUser = { id: number; username: string; password_reset_required?: boolean }

export async function getCurrentUser(): Promise<ServerCurrentUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null

  try {
    const res = await fetch(`${API_URL}/user`, {
      headers: { Authorization: `Bearer ${token}` },
      // User identity should not be cached across users
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as
      | { user?: ServerCurrentUser }
      | null
    return data?.user ?? null
  } catch {
    return null
  }
}

export async function requireUser(): Promise<ServerCurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login' as Route)
  return user
}
