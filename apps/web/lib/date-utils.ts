/**
 * Date formatting utilities for displaying relative time
 */

/**
 * Formats a date as a relative time string (e.g., "2 months ago", "just now")
 * 
 * @param date - The date to format (Date object, ISO string, or null/undefined)
 * @param options - Optional configuration
 * @param options.includeSeconds - Whether to show seconds for very recent times (default: false)
 * @param options.maxDays - Show absolute date after this many days (default: 365, i.e., show relative for up to a year)
 * @returns Formatted relative time string
 * 
 * @example
 * formatRelativeTime(new Date()) // "just now"
 * formatRelativeTime(new Date(Date.now() - 5 * 60 * 1000)) // "5m ago"
 * formatRelativeTime(new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000)) // "2 months ago"
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  options?: {
    includeSeconds?: boolean;
    maxDays?: number;
  },
): string {
  if (!date) {
    return "recently";
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return "recently";
  }

  // Handle future dates
  if (dateObj > now) {
    return "just now";
  }

  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const maxDays = options?.maxDays ?? 365;

  // Show absolute date if beyond maxDays
  if (diffDays > maxDays) {
    return dateObj.toLocaleDateString();
  }

  // Seconds (only if includeSeconds is true and very recent)
  if (options?.includeSeconds && diffSecs < 60) {
    if (diffSecs < 1) return "just now";
    return `${diffSecs}s ago`;
  }

  // Minutes
  if (diffMins < 1) return "just now";
  if (diffMins < 60) {
    return `${diffMins}${diffMins === 1 ? "m" : "m"} ago`;
  }

  // Hours
  if (diffHours < 24) {
    return `${diffHours}${diffHours === 1 ? "h" : "h"} ago`;
  }

  // Days
  if (diffDays < 7) {
    return `${diffDays}${diffDays === 1 ? "d" : "d"} ago`;
  }

  // Weeks (approximate)
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`;
  }

  // Months
  if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;
  }

  // Years
  return `${diffYears} ${diffYears === 1 ? "year" : "years"} ago`;
}
