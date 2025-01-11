import { createContext, createEffect, createSignal, onCleanup, useContext } from 'solid-js';

export const NowContext = createContext<() => Date>();

export function useNowContext() {
  const context = useContext(NowContext);
  if (!context) {
    throw new Error("Can't find NowContext");
  }

  return context;
}

export function createTicker(duration: number) {
  const [now, setNow] = createSignal(new Date());
  const tick = () => setNow(new Date());

  tick();
  createEffect(() => {
    const intervalId = setInterval(tick, duration);
    onCleanup(() => clearInterval(intervalId));
  });

  return now;
}
