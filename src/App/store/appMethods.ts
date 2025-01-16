import { createStore } from 'solid-js/store';
import { AppStore, getDefaultAppStore } from './app';

export type AppContextValue = ReturnType<typeof createAppStore>;

export function createAppStore() {
  const [appStore, setAppStore] = createStore(getDefaultAppStore());

  function resetWithDefaults(state: AppStore) {
    setAppStore({ ...getDefaultAppStore(), ...state });
  }

  return [appStore, setAppStore, { resetWithDefaults }] as const;
};
