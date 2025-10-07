import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { jwtVerify } from 'jose'
import { API_URL } from '@/lib/config'

export type ServerCurrentUser = { id: number; username: string; password_reset_required?: boolean }

type TokenPayload = {
  nameid?: string | number
  unique_name?: string
  name?: string
  sub?: string | number
  exp?: number
  isFirstLogin?: boolean
}

async function deriveUserFromToken(token: string, opts?: { firstLoginCompleted?: boolean }): Promise<ServerCurrentUser | null> {
  try {
    const secretStr = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev_secret_change_me' : '')
    if (!secretStr) {
      throw new Error('JWT_SECRET is required in production')
    }
    const secret = new TextEncoder().encode(secretStr)
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'], clockTolerance: 5 })
    const data = payload as TokenPayload
    const username = data.unique_name
      ?? data.name
      ?? (typeof data.sub === 'string' ? data.sub : undefined)
    if (!username) return null
    const rawId = data.nameid ?? data.sub
    const parsedId = typeof rawId === 'string' ? Number(rawId) : typeof rawId === 'number' ? rawId : NaN
    const id = Number.isFinite(parsedId) ? parsedId : -1
    return {
      id,
      username,
      password_reset_required: opts?.firstLoginCompleted ? false : data.isFirstLogin,
    }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<ServerCurrentUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  const firstLoginCompleted = cookieStore.get('first_login_complete')?.value === '1'
  if (!token) return null

  try {
    const res = await fetch(`${API_URL}/user`, {
      headers: { Authorization: `Bearer ${token}` },
      // User identity should not be cached across users
      cache: 'no-store',
    })
    if (!res.ok) {
      const fallback = await deriveUserFromToken(token, { firstLoginCompleted })
      if (fallback) return fallback
      return null
    }
    const data = (await res.json().catch(() => null)) as
      | { user?: ServerCurrentUser }
      | null
    const user = data?.user ?? null
    if (!user) return null
    if (firstLoginCompleted) {
      return { ...user, password_reset_required: false }
    }
    return user
  } catch {
    const fallback = await deriveUserFromToken(token, { firstLoginCompleted })
    if (fallback) return fallback
    return null
  }
}

export async function requireUser(): Promise<ServerCurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login' as Route)
  return user
}
