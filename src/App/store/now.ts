import { createContext, createEffect, createSignal, onCleanup, useContext } from 'solid-js';

export const NowContext = createContext<() => Date>();

export function useNowContext() {
  const context = useContext(NowContext);
  if (!context) {
    throw new Error("Can't find NowContext");
  }

  return context;
}

export function createTicker() {
  const [now, setNow] = createSignal(new Date());

  createEffect(() => {
    let previous = new Date();

    function check() {
      const current = new Date();
      if (current.getMinutes() !== previous.getMinutes()) {
        setNow(current);
        previous = current;
      }
    }

    const intervalId = setInterval(check, 1000);
    onCleanup(() => clearInterval(intervalId));
  });

  return now;
}
