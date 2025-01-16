import { createStore } from 'solid-js/store';
import { getDefaultAppStore } from './app';

export type AppContextValue = ReturnType<typeof createAppStore>;

export function createAppStore() {
  const [appStore, setAppStore] = createStore(getDefaultAppStore());

  return [appStore, setAppStore, {}] as const;
};
