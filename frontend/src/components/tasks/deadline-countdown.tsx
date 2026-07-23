"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { differenceInSeconds, differenceInDays, differenceInHours, differenceInMinutes, isPast } from "date-fns";

interface DeadlineCountdownProps {
  deadline: string;
}

export function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  const deadlineDate = new Date(deadline);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isPast(deadlineDate)) {
    return (
      <span className="flex items-center gap-1 text-red-500 text-xs font-medium shrink-0">
        <AlertTriangle className="h-3 w-3" />
        Overdue
      </span>
    );
  }

  const days = differenceInDays(deadlineDate, now);
  const hours = differenceInHours(deadlineDate, now) % 24;
  const minutes = differenceInMinutes(deadlineDate, now) % 60;
  const seconds = differenceInSeconds(deadlineDate, now) % 60;

  let display: string;
  let urgent = false;

  if (days > 0) {
    display = `${days}d ${hours}h`;
  } else if (hours > 0) {
    display = `${hours}h ${minutes}m`;
    urgent = hours < 2;
  } else {
    display = `${minutes}m ${seconds}s`;
    urgent = true;
  }

  return (
    <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${urgent ? "text-amber-500" : "text-muted-foreground"}`}>
      <Clock className="h-3 w-3" />
      {display}
    </span>
  );
}
