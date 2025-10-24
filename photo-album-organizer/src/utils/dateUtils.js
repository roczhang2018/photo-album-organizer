/**
 * Date Utilities
 * Handles date operations and week group generation
 */

/**
 * Generate ISO week group from date
 * @param {Date} date - Date to generate week group for
 * @returns {string} Week group in format YYYY-W## (e.g., "2024-W01")
 */
export function generateWeekGroup(date = new Date()) {
  const year = date.getFullYear()
  const week = getISOWeek(date)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

/**
 * Get ISO week number for a date
 * @param {Date} date - Date to get week number for
 * @returns {number} ISO week number (1-53)
 */
export function getISOWeek(date) {
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000)
}

/**
 * Parse week group string
 * @param {string} weekGroup - Week group string (YYYY-W##)
 * @returns {Object} Parsed week group with year and week
 */
export function parseWeekGroup(weekGroup) {
  const match = weekGroup.match(/^(\d{4})-W(\d{2})$/)
  if (!match) {
    throw new Error('Invalid week group format. Expected YYYY-W##')
  }
  
  return {
    year: parseInt(match[1], 10),
    week: parseInt(match[2], 10)
  }
}

/**
 * Get start date of a week group
 * @param {string} weekGroup - Week group string (YYYY-W##)
 * @returns {Date} Start date of the week (Monday)
 */
export function getWeekStartDate(weekGroup) {
  const { year, week } = parseWeekGroup(weekGroup)
  
  // Create date for January 4th of the year (always in week 1)
  const jan4 = new Date(year, 0, 4)
  const jan4Week = getISOWeek(jan4)
  
  // Calculate the start of the target week
  const daysToAdd = (week - jan4Week) * 7
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() + daysToAdd)
  
  // Adjust to Monday (ISO week starts on Monday)
  const dayOfWeek = weekStart.getDay()
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  weekStart.setDate(weekStart.getDate() + daysToMonday)
  
  return weekStart
}

/**
 * Get end date of a week group
 * @param {string} weekGroup - Week group string (YYYY-W##)
 * @returns {Date} End date of the week (Sunday)
 */
export function getWeekEndDate(weekGroup) {
  const startDate = getWeekStartDate(weekGroup)
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  return endDate
}

/**
 * Format week group for display
 * @param {string} weekGroup - Week group string (YYYY-W##)
 * @returns {string} Formatted week group (e.g., "2024 Week 1")
 */
export function formatWeekGroup(weekGroup) {
  const { year, week } = parseWeekGroup(weekGroup)
  return `${year} Week ${week}`
}

/**
 * Get all week groups between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<string>} Array of week group strings
 */
export function getWeekGroupsBetween(startDate, endDate) {
  const weekGroups = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const weekGroup = generateWeekGroup(current)
    if (!weekGroups.includes(weekGroup)) {
      weekGroups.push(weekGroup)
    }
    current.setDate(current.getDate() + 7)
  }
  
  return weekGroups.sort()
}

/**
 * Get current week group
 * @returns {string} Current week group
 */
export function getCurrentWeekGroup() {
  return generateWeekGroup(new Date())
}

/**
 * Validate week group format
 * @param {string} weekGroup - Week group to validate
 * @returns {boolean} True if valid format
 */
export function isValidWeekGroup(weekGroup) {
  try {
    parseWeekGroup(weekGroup)
    return true
  } catch {
    return false
  }
}

/**
 * Get week group for a specific date string
 * @param {string} dateString - Date string (ISO format or other parseable format)
 * @returns {string} Week group
 */
export function getWeekGroupForDate(dateString) {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date string')
  }
  return generateWeekGroup(date)
}

/**
 * Parse various date formats and return Date object
 * @param {string} dateString - Date string in various formats
 * @returns {Date} Parsed date
 */
export function parseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error('Date string is required')
  }

  // Try different date formats
  const formats = [
    // ISO format
    (str) => new Date(str),
    // YYYY-MM-DD
    (str) => {
      const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
      }
      return null
    },
    // MM/DD/YYYY
    (str) => {
      const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (match) {
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]))
      }
      return null
    },
    // DD/MM/YYYY
    (str) => {
      const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (match) {
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
      }
      return null
    }
  ]

  for (const format of formats) {
    try {
      const date = format(dateString)
      if (date && !isNaN(date.getTime())) {
        return date
      }
    } catch (error) {
      // Continue to next format
    }
  }

  throw new Error(`Unable to parse date: ${dateString}`)
}

/**
 * Handle timezone conversion for date
 * @param {Date} date - Date to convert
 * @param {string} timezone - Target timezone (e.g., 'UTC', 'America/New_York')
 * @returns {Date} Converted date
 */
export function convertTimezone(date, timezone = 'UTC') {
  if (!date || !(date instanceof Date)) {
    throw new Error('Valid date is required')
  }

  // For now, we'll use UTC as the standard timezone
  // In a real application, you might want to use a library like date-fns-tz
  if (timezone === 'UTC') {
    return new Date(date.getTime() + (date.getTimezoneOffset() * 60000))
  }

  // For other timezones, we'll need a more sophisticated approach
  // This is a simplified implementation
  return date
}

/**
 * Sort week groups chronologically
 * @param {Array<string>} weekGroups - Array of week group strings
 * @returns {Array<string>} Sorted week groups
 */
export function sortWeekGroups(weekGroups) {
  if (!Array.isArray(weekGroups)) {
    throw new Error('Week groups must be an array')
  }

  return weekGroups.sort((a, b) => {
    try {
      const aParsed = parseWeekGroup(a)
      const bParsed = parseWeekGroup(b)
      
      // Compare years first
      if (aParsed.year !== bParsed.year) {
        return aParsed.year - bParsed.year
      }
      
      // Then compare weeks
      return aParsed.week - bParsed.week
    } catch (error) {
      console.warn(`Invalid week group format: ${a} or ${b}`)
      return 0
    }
  })
}

/**
 * Get week groups in a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<string>} Array of week groups in range
 */
export function getWeekGroupsInRange(startDate, endDate) {
  if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date)) {
    throw new Error('Valid start and end dates are required')
  }

  if (startDate > endDate) {
    throw new Error('Start date must be before end date')
  }

  const weekGroups = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const weekGroup = generateWeekGroup(current)
    if (!weekGroups.includes(weekGroup)) {
      weekGroups.push(weekGroup)
    }
    current.setDate(current.getDate() + 7)
  }
  
  return sortWeekGroups(weekGroups)
}

/**
 * Get previous week group
 * @param {string} weekGroup - Current week group
 * @returns {string} Previous week group
 */
export function getPreviousWeekGroup(weekGroup) {
  const { year, week } = parseWeekGroup(weekGroup)
  
  if (week > 1) {
    return `${year}-W${(week - 1).toString().padStart(2, '0')}`
  } else {
    // Go to last week of previous year
    const lastWeek = getISOWeek(new Date(year - 1, 11, 31))
    return `${year - 1}-W${lastWeek.toString().padStart(2, '0')}`
  }
}

/**
 * Get next week group
 * @param {string} weekGroup - Current week group
 * @returns {string} Next week group
 */
export function getNextWeekGroup(weekGroup) {
  const { year, week } = parseWeekGroup(weekGroup)
  const lastWeek = getISOWeek(new Date(year, 11, 31))
  
  if (week < lastWeek) {
    return `${year}-W${(week + 1).toString().padStart(2, '0')}`
  } else {
    // Go to first week of next year
    return `${year + 1}-W01`
  }
}

/**
 * Get week group display name with date range
 * @param {string} weekGroup - Week group string
 * @returns {string} Display name with date range
 */
export function getWeekGroupDisplayName(weekGroup) {
  try {
    const startDate = getWeekStartDate(weekGroup)
    const endDate = getWeekEndDate(weekGroup)
    
    const startStr = startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    const endStr = endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
    
    return `${formatWeekGroup(weekGroup)} (${startStr} - ${endStr})`
  } catch (error) {
    return formatWeekGroup(weekGroup)
  }
}
