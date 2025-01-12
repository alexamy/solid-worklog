import { createStore } from 'solid-js/store';
import { getDefaultDataStore } from './data';

export function createDataStore() {
  const [dataStore, setDataStore] = createStore(getDefaultDataStore());

  return [dataStore, setDataStore] as const;
}
