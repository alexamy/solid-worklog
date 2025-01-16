import { createStore } from 'solid-js/store';
import { AppStore, getDefaultAppStore } from './app';

export type AppContextValue = ReturnType<typeof createAppStore>;

export function createAppStore() {
  const [appStore, setAppStore] = createStore(getDefaultAppStore());

  function moveDate(delta: number) {
    const next = new Date(appStore.selectedDate);
    next.setDate(next.getDate() + delta);
    setAppStore('selectedDate', next);
  }

  function resetWithDefaults(state: AppStore) {
    setAppStore({ ...getDefaultAppStore(), ...state });
  }

  return [appStore, setAppStore, { resetWithDefaults, moveDate }] as const;
};
