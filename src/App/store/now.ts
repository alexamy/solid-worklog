import { createContext, createEffect, createSignal, onCleanup, useContext } from 'solid-js';

export const NowContext = createContext<() => Date>();

export function useNowContext() {
  const context = useContext(NowContext);
  if (!context) {
    throw new Error("Can't find NowContext");
  }

  return context;
}

export function createTicker(interval: number) {
  const [now, setNow] = createSignal(new Date());

  createEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), interval);
    onCleanup(() => clearInterval(intervalId));
  });

  return now;
}
