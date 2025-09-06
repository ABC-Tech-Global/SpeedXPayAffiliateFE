import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, ApiError } from '@/lib/api-client'

const originalFetch = global.fetch

describe('apiFetch', () => {
  beforeEach(() => {
    ;(global as any).fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    ;(global as any).fetch = originalFetch
  })

  it('returns parsed JSON on success', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    const res = await apiFetch<{ ok: boolean }>('https://api.test/x', { method: 'GET' })
    expect(res.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith('https://api.test/x', expect.objectContaining({ cache: 'no-store' }))
  })

  it('throws ApiError with message from JSON error', async () => {
    // Provide the same mocked response for both calls in this test
    ;(global.fetch as any).mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'Bad' }) })
    await expect(apiFetch('https://api.test/x')).rejects.toThrowError(ApiError)
    try { await apiFetch('https://api.test/x') } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      const err = e as ApiError
      expect(err.status).toBe(400)
      expect(err.message).toBe('Bad')
    }
  })

  it('throws ApiError with default message when no JSON', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('no json') } })
    await expect(apiFetch('https://api.test/x')).rejects.toThrow('Request failed (500)')
  })
})
