import superjson from 'superjson';
import { createEffect } from 'solid-js';

export function persistObject<T extends object>(
  store: T,
  setStore: (store: T) => void,
  getDefaultStore: () => T,
  storageKey: string,
  migrate: (store: T) => T = (store) => store,
) {
  createEffect(load);
  createEffect(save);

  function load() {
    const items = localStorage.getItem(storageKey);
    if (items) {
      try {
        setStore(migrate(superjson.parse(items)));
      } catch (error) {
        console.error(error);
        localStorage.removeItem(storageKey);
        setStore(getDefaultStore());
      }
    }
  }

  function save() {
    localStorage.setItem(storageKey, superjson.stringify(store));
  }

  function reset() {
    localStorage.removeItem(storageKey);
    setStore(getDefaultStore());
    window.location.reload();
  }

  return {
    reset,
  };
}
