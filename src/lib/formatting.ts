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
