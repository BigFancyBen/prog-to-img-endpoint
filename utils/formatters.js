/**
 * Convert minutes to human-readable string format
 * @param {number} mins - Minutes to convert
 * @returns {string} Formatted time string
 */
export function formatRuntime(mins) {
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  let runtime = ''

  if (hours > 0) {
    runtime += hours === 1 ? `${hours}hr ` : `${hours}hrs `
  }
  
  if (minutes > 0) {
    runtime += minutes === 1 ? `${minutes}min` : `${minutes}mins`
  }

  return runtime.trim() || '0mins'
}

/**
 * Format large numbers with appropriate suffixes (k, m)
 * @param {number} count - Number to format
 * @returns {string} Formatted number string
 */
export function formatCount(count) {
  if (count >= 1000000) {
    return `${Math.floor(count * 10 / 1000000) / 10}m`
  }
  if (count > 100000) {
    return `${Math.trunc(count / 1000)}k`
  }
  if (count > 1000) {
    return `${Math.trunc((count * 10) / 1000) / 10}k`
  }
  return count.toString()
}

/**
 * Format XP values with appropriate suffixes
 * @param {string|number} xp - XP value to format
 * @returns {string} Formatted XP string
 */
export function formatXP(xp) {
  const xpInt = typeof xp === 'string' ? parseInt(xp.replace(/,/g, '')) : xp
  
  if (xpInt >= 1000000) {
    return `${Math.floor(xpInt * 10 / 1000000) / 10}m xp`
  }
  if (xpInt > 1000) {
    return `${Math.trunc((xpInt * 10) / 1000 / 10)}k xp`
  }
  return `${xpInt} xp`
}

/**
 * Get current date in US format
 * @returns {string} Formatted date string
 */
export function getCurrentDate() {
  return new Date().toLocaleDateString('en-US')
} 