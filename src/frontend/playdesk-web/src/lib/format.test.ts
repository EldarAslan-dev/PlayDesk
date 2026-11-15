import { describe, expect, it } from 'vitest'
import { offsetDate, remaining, todayBaku } from './format'

describe('date helpers', () => {
  it('handles dates across months and years', () => {
    expect(offsetDate('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('formats countdown / overdue', () => {
    const start = Date.parse('2026-11-14T12:00:00Z')
    expect(remaining('2026-11-14T12:45:00Z', start)).toBe('00:45:00')
    expect(remaining('2026-11-14T11:59:50Z', start)).toBe('+00:00:10')
  })
  it('returns a valid Baku YYYY-MM-DD date', () => {
    expect(todayBaku()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
