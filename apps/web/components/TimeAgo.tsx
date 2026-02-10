"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/time";

interface TimeAgoProps {
  date: Date | string | undefined;
  className?: string;
}

/**
 * TimeAgo component - displays relative time like "2 hours ago"
 * Auto-updates every minute
 */
export function TimeAgo({ date, className = "" }: TimeAgoProps) {
  const [relativeTime, setRelativeTime] = useState(() => timeAgo(date));

  useEffect(() => {
    // Update immediately
    setRelativeTime(timeAgo(date));

    // Update every minute
    const interval = setInterval(() => {
      setRelativeTime(timeAgo(date));
    }, 60000);

    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className={className} title={date ? new Date(date).toLocaleString() : undefined}>
      {relativeTime}
    </span>
  );
}
