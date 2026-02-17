/**
 * Date utility functions for streak calculation and formatting.
 * All date strings use ISO 8601 format: YYYY-MM-DD.
 */

export function getTodayISO(): string {
  return formatDateISO(new Date());
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return formatDateISO(date);
}

/**
 * Calculate the current consecutive streak.
 * @param sortedDatesDesc - array of ISO date strings sorted newest-first
 */
export function calculateCurrentStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  const today = getTodayISO();
  let streak = 0;
  let expectedDate = today;

  // If today isn't checked in, start from yesterday
  if (sortedDatesDesc[0] !== today) {
    expectedDate = addDays(today, -1);
  }

  for (const date of sortedDatesDesc) {
    if (date === expectedDate) {
      streak++;
      expectedDate = addDays(expectedDate, -1);
    } else if (date < expectedDate) {
      break;
    }
  }

  return streak;
}

/**
 * Calculate the longest consecutive streak ever.
 * @param sortedDatesAsc - array of ISO date strings sorted oldest-first
 */
export function calculateLongestStreak(sortedDatesAsc: string[]): number {
  if (sortedDatesAsc.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDatesAsc.length; i++) {
    const expected = addDays(sortedDatesAsc[i - 1], 1);
    if (sortedDatesAsc[i] === expected) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function getMonthYear(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

