import { describe, expect, it } from 'vitest'
import {
  formatDateKey,
  getDayIndexFromStart,
  getDaysBetween,
  isValidDateKey
} from '../src/utils/dateUtils.js'

describe('dateUtils', () => {
  it('formats timestamps into date keys', () => {
    expect(formatDateKey(new Date(2026, 2, 28))).toBe('2026-03-28')
    expect(formatDateKey(Date.UTC(2026, 2, 28))).toBe('2026-03-28')
  })

  it('calculates date differences and day index correctly', () => {
    expect(getDaysBetween('2026-03-01', '2026-03-05')).toBe(4)
    expect(getDayIndexFromStart('2026-03-01', '2026-03-05')).toBe(5)
    expect(getDayIndexFromStart('2026-03-05', '2026-03-01')).toBe(1)
  })

  it('validates date key format', () => {
    expect(isValidDateKey('2026-03-28')).toBe(true)
    expect(isValidDateKey('2026-3-28')).toBe(false)
    expect(isValidDateKey('not-a-date')).toBe(false)
  })
})
