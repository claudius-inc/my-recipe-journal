/**
 * Formatting utilities for dates, percentages, and other display values
 */

/**
 * Format a number as a percentage with one decimal place
 * @example formatPercent(65.432) // "65.4%"
 */
export function formatPercent(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
}

/**
 * Format a date as "DD Mon YYYY"
 * @example formatDate(new Date("2024-01-15")) // "15 Jan 2024"
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a date with time as "DD Mon YYYY, HH:MM AM/PM"
 * @example formatDateTime(new Date("2024-01-15T14:30:00")) // "15 Jan 2024, 2:30 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${month} ${year}, ${time}`;
}

/**
 * Format a date relative to now (e.g. "5 minutes ago", "2 hours ago")
 */
export const formatRelativeTime = (iso: string) => {
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });
  const now = Date.now();
  const diffMs = new Date(iso).getTime() - now;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 14) {
    return formatter.format(diffDays, "day");
  }
  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 8) {
    return formatter.format(diffWeeks, "week");
  }
  const diffMonths = Math.round(diffDays / 30);
  return formatter.format(diffMonths, "month");
};
