import { createContext, useContext } from 'solid-js';
import { SetStoreFunction } from 'solid-js/store';

export interface AppStore {
  selectedDate: Date;
  sync: Date;
}

export const AppContext = createContext<[AppStore, SetStoreFunction<AppStore>]>();

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("Can't find AppContext");
  }

  return context;
}

export function getDefaultAppStore(): AppStore {
  return {
    selectedDate: new Date(),
    sync: new Date(),
  };
}
