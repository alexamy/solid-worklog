import { createContext, useContext } from 'solid-js';

export const NowContext = createContext<() => Date>();

export function useNowContext() {
  const context = useContext(NowContext);
  if (!context) {
    throw new Error("Can't find NowContext");
  }

  return context;
}
