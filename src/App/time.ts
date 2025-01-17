/** @returns duration in minutes */
export function calculateDuration(start: Date, end: Date): number {
  const startHours = start.getHours();
  const startMinutes = start.getMinutes();
  const endHours = end.getHours() < startHours ? end.getHours() + 24 : end.getHours();
  const endMinutes = end.getMinutes();

  const hoursDiff = endHours - startHours;
  const minutesDiff = endMinutes - startMinutes;

  return hoursDiff * 60 + minutesDiff;
}

export function toTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
