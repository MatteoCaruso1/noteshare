import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a datetime string as local time (not UTC) and format it.
 * This is needed because the database stores datetimes without timezone info,
 * and JavaScript's Date constructor interprets them as UTC.
 */
export function formatLocalDateTime(dateStr: string, formatStr: string = 'MMM d, yyyy · h:mm a'): string {
  // Remove any timezone suffix and parse components
  const cleanStr = dateStr.replace('T', ' ').split('+')[0].split('Z')[0];
  const [datePart, timePart] = cleanStr.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '12:00:00').split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes);
  return format(localDate, formatStr);
}
