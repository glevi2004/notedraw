/**
 * Time formatting utilities
 */

export function timeAgo(date: Date | string | undefined): string {
  if (!date) return "recently";
  
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };
  
  if (seconds < 60) return "just now";
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      if (unit === "hour" && interval === 1) return "an hour ago";
      if (unit === "hour") return `${interval} hours ago`;
      if (unit === "day" && interval === 1) return "a day ago";
      if (unit === "day") return `${interval} days ago`;
      if (unit === "week" && interval === 1) return "a week ago";
      if (unit === "week") return `${interval} weeks ago`;
      if (unit === "month" && interval === 1) return "a month ago";
      if (unit === "month") return `${interval} months ago`;
      if (unit === "year" && interval === 1) return "a year ago";
      if (unit === "year") return `${interval} years ago`;
    }
  }
  
  return then.toLocaleDateString();
}

export function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return "";
  return timeAgo(date);
}
