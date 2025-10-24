/**
 * Unit tests for Date Utilities
 */
import { describe, it, expect } from 'vitest'
import {
  generateWeekGroup,
  getISOWeek,
  parseWeekGroup,
  formatWeekGroup,
  getCurrentWeekGroup,
  isValidWeekGroup,
  getWeekGroupForDate,
  parseDate,
  convertTimezone,
  sortWeekGroups,
  getWeekGroupsInRange,
  getPreviousWeekGroup,
  getNextWeekGroup
} from '../utils/dateUtils.js'

describe('Date Utils', () => {
  describe('generateWeekGroup', () => {
    it('should generate correct week group for known date', () => {
      const date = new Date('2024-01-15') // Monday of week 3
      const weekGroup = generateWeekGroup(date)
      expect(weekGroup).toBe('2024-W03')
    })

    it('should use current date when no date provided', () => {
      const weekGroup = generateWeekGroup()
      expect(weekGroup).toMatch(/^\d{4}-W\d{2}$/)
    })
  })

  describe('getISOWeek', () => {
    it('should return correct ISO week number', () => {
      const date = new Date('2024-01-15')
      const week = getISOWeek(date)
      expect(week).toBe(3)
    })

    it('should handle year boundaries correctly', () => {
      const date = new Date('2024-01-01')
      const week = getISOWeek(date)
      expect(week).toBeGreaterThan(0)
      expect(week).toBeLessThanOrEqual(53)
    })
  })

  describe('parseWeekGroup', () => {
    it('should parse valid week group', () => {
      const result = parseWeekGroup('2024-W03')
      expect(result).toEqual({ year: 2024, week: 3 })
    })

    it('should throw error for invalid format', () => {
      expect(() => parseWeekGroup('2024-03')).toThrow('Invalid week group format')
      expect(() => parseWeekGroup('2024-W99')).toThrow('Invalid week group format')
      expect(() => parseWeekGroup('invalid')).toThrow('Invalid week group format')
    })
  })

  describe('formatWeekGroup', () => {
    it('should format week group correctly', () => {
      const formatted = formatWeekGroup('2024-W03')
      expect(formatted).toBe('2024 Week 3')
    })

    it('should return original for invalid format', () => {
      const formatted = formatWeekGroup('invalid')
      expect(formatted).toBe('invalid')
    })
  })

  describe('getCurrentWeekGroup', () => {
    it('should return current week group', () => {
      const currentWeek = getCurrentWeekGroup()
      expect(currentWeek).toMatch(/^\d{4}-W\d{2}$/)
    })
  })

  describe('isValidWeekGroup', () => {
    it('should validate correct week groups', () => {
      expect(isValidWeekGroup('2024-W01')).toBe(true)
      expect(isValidWeekGroup('2024-W52')).toBe(true)
      expect(isValidWeekGroup('2023-W53')).toBe(true)
    })

    it('should reject invalid week groups', () => {
      expect(isValidWeekGroup('2024-01')).toBe(false)
      expect(isValidWeekGroup('2024-W99')).toBe(false)
      expect(isValidWeekGroup('invalid')).toBe(false)
      expect(isValidWeekGroup('')).toBe(false)
    })
  })

  describe('getWeekGroupForDate', () => {
    it('should get week group for date string', () => {
      const weekGroup = getWeekGroupForDate('2024-01-15')
      expect(weekGroup).toBe('2024-W03')
    })

    it('should throw error for invalid date', () => {
      expect(() => getWeekGroupForDate('invalid-date')).toThrow('Invalid date string')
    })
  })

  describe('parseDate', () => {
    it('should parse ISO date string', () => {
      const date = parseDate('2024-01-15')
      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January
      expect(date.getDate()).toBe(15)
    })

    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('01/15/2024')
      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBe(2024)
    })

    it('should throw error for invalid date', () => {
      expect(() => parseDate('invalid')).toThrow('Unable to parse date')
      expect(() => parseDate('')).toThrow('Date string is required')
    })
  })

  describe('convertTimezone', () => {
    it('should convert to UTC', () => {
      const date = new Date('2024-01-15T12:00:00-05:00')
      const utcDate = convertTimezone(date, 'UTC')
      expect(utcDate).toBeInstanceOf(Date)
    })

    it('should throw error for invalid date', () => {
      expect(() => convertTimezone(null)).toThrow('Valid date is required')
    })
  })

  describe('sortWeekGroups', () => {
    it('should sort week groups chronologically', () => {
      const weekGroups = ['2024-W10', '2024-W01', '2023-W52', '2024-W05']
      const sorted = sortWeekGroups(weekGroups)
      expect(sorted).toEqual(['2023-W52', '2024-W01', '2024-W05', '2024-W10'])
    })

    it('should handle empty array', () => {
      expect(sortWeekGroups([])).toEqual([])
    })

    it('should throw error for non-array input', () => {
      expect(() => sortWeekGroups('not-array')).toThrow('Week groups must be an array')
    })
  })

  describe('getWeekGroupsInRange', () => {
    it('should get week groups in date range', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-31')
      const weekGroups = getWeekGroupsInRange(start, end)
      expect(weekGroups.length).toBeGreaterThan(0)
      expect(weekGroups[0]).toMatch(/^\d{4}-W\d{2}$/)
    })

    it('should throw error for invalid dates', () => {
      expect(() => getWeekGroupsInRange(null, new Date())).toThrow('Valid start and end dates are required')
      expect(() => getWeekGroupsInRange(new Date(), null)).toThrow('Valid start and end dates are required')
    })

    it('should throw error if start is after end', () => {
      const start = new Date('2024-02-01')
      const end = new Date('2024-01-01')
      expect(() => getWeekGroupsInRange(start, end)).toThrow('Start date must be before end date')
    })
  })

  describe('getPreviousWeekGroup', () => {
    it('should get previous week group', () => {
      const previous = getPreviousWeekGroup('2024-W03')
      expect(previous).toBe('2024-W02')
    })

    it('should handle year boundary', () => {
      const previous = getPreviousWeekGroup('2024-W01')
      expect(previous).toMatch(/^2023-W\d{2}$/)
    })
  })

  describe('getNextWeekGroup', () => {
    it('should get next week group', () => {
      const next = getNextWeekGroup('2024-W03')
      expect(next).toBe('2024-W04')
    })

    it('should handle year boundary', () => {
      const next = getNextWeekGroup('2024-W52')
      expect(next).toMatch(/^2025-W\d{2}$/)
    })
  })
})
