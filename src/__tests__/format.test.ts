import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate } from '@/lib/format'

describe('formatCurrency', () => {
  it('formats integers in VND with no decimals', () => {
    const out = formatCurrency(1234567)
    expect(out).toMatch(/1[.,]?234[.,]?567/) // locale tolerant
  })

  it('respects custom currency and fraction digits', () => {
    const out = formatCurrency(1234.56, { currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
    expect(out).toMatch(/1,?234\.56|1\.?234,56/) // locale tolerant
  })
})

describe('formatDate', () => {
  it('formats ISO strings into a human-readable date', () => {
    const iso = '2024-01-02T03:04:05.000Z'
    const out = formatDate(iso)
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(5)
  })

  it('gracefully handles invalid input', () => {
    const out = formatDate('not-a-date')
    expect(typeof out).toBe('string')
  })
})

