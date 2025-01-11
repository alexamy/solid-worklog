import { SetStoreFunction } from 'solid-js/store';
import { DataStore, getDefaultDataStore } from './data';
import superjson from 'superjson';
import { createEffect } from 'solid-js';

export function persistStore(
  store: DataStore,
  setStore: SetStoreFunction<DataStore>,
  storageKey = 'solid-worklog-store',
) {
  function save(key = storageKey) {
    localStorage.setItem(key, superjson.stringify(store));
  }

  function load(key = storageKey, backupStore = getDefaultDataStore()) {
    const items = localStorage.getItem(key);
    if (items) {
      try {
        setStore(superjson.parse(items));
      } catch (error) {
        console.error(error);
        localStorage.removeItem(key);
        setStore(backupStore);
      }
    }
  }

  createEffect(() => load());
  createEffect(() => save());

  function reset() {
    localStorage.removeItem(storageKey);
    setStore(getDefaultDataStore());
    window.location.reload();
  }

  return {
    reset,
  };
}
