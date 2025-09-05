import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

const originalFetch = global.fetch

describe('server data layer me.ts', () => {
  beforeEach(() => {
    process.env.API_URL = 'http://api.test'
    // mock next/headers cookies
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (_: string) => ({ value: 't123' }) }),
    }))
    ;(global as any).fetch = vi.fn()
  })
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    ;(global as any).fetch = originalFetch
  })

  it('getProfile calls backend with Authorization header', async () => {
    const { getProfile } = await import('@/lib/api/me')
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ profile: { username: 'alice' } }) })
    const data = await getProfile()
    expect(data.profile?.username).toBe('alice')
    expect(global.fetch).toHaveBeenCalledWith('http://api.test/me/profile', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer t123' }),
    }))
  })

  it('throws when token missing', async () => {
    vi.doMock('next/headers', () => ({ cookies: async () => ({ get: (_: string) => undefined }) }))
    const { getProfile } = await import('@/lib/api/me')
    await expect(getProfile()).rejects.toThrow('missing auth token')
  })
})
