import superjson from 'superjson';
import { createEffect } from 'solid-js';

export function persistData<T extends object>(
  store: T,
  setStore: (store: T) => void,
  getDefaultStore: () => T,
  storageKey = 'solid-worklog-store',
) {
  function save(key = storageKey) {
    localStorage.setItem(key, superjson.stringify(store));
  }

  function load(key = storageKey) {
    const items = localStorage.getItem(key);
    if (items) {
      try {
        setStore(superjson.parse(items));
      } catch (error) {
        console.error(error);
        localStorage.removeItem(key);
        setStore(getDefaultStore());
      }
    }
  }

  createEffect(() => load());
  createEffect(() => save());

  function reset() {
    localStorage.removeItem(storageKey);
    setStore(getDefaultStore());
    window.location.reload();
  }

  return {
    reset,
  };
}
