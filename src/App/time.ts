export function calculateDuration(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
}
