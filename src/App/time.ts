import { createEffect, createSignal, onCleanup } from 'solid-js';

export function createTicker(interval: number) {
  const [now, setNow] = createSignal(new Date());

  createEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), interval);
    onCleanup(() => clearInterval(intervalId));
  });

  return now;
}

export function calculateDuration(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
}

export function toTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
