import { describe, it, expect } from 'vitest'
import { updateUrlParams, clampPage, pageButtons } from '@/lib/url'

describe('updateUrlParams', () => {
  it('sets and removes params correctly', () => {
    const base = 'https://example.com/path?foo=1&bar=2'
    const next = updateUrlParams(base, { foo: 42, bar: '', baz: 'x' })
    const url = new URL(next)
    expect(url.searchParams.get('foo')).toBe('42')
    expect(url.searchParams.get('bar')).toBeNull()
    expect(url.searchParams.get('baz')).toBe('x')
  })
})

describe('clampPage', () => {
  it('clamps below and above bounds', () => {
    expect(clampPage(0, 10)).toBe(1)
    expect(clampPage(11, 10)).toBe(10)
    expect(clampPage(5, 10)).toBe(5)
  })
})

describe('pageButtons', () => {
  it('shows first/last and window around current', () => {
    expect(pageButtons(5, 10, 2)).toEqual([1, 3, 4, 5, 6, 7, 10])
    expect(pageButtons(1, 3, 2)).toEqual([1, 2, 3])
    expect(pageButtons(10, 10, 2)).toEqual([1, 8, 9, 10])
  })
})

