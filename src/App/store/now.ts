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
  function tick() {
    setNow(new Date());
  }

  createEffect(() => {
    const at = new Date();
    const msUntilNextMinute = 60000 - (at.getSeconds() * 1000 + at.getMilliseconds());

    let intervalId: number;
    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, interval);
    }, msUntilNextMinute);

    onCleanup(() => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    });
  });

  return now;
}
