import { createContext, useContext } from 'solid-js';
import { createStore, SetStoreFunction } from 'solid-js/store';

type SortBy = 'tag' | 'duration';
type SortOrder = 'asc' | 'desc';

export interface AppStore {
  selectedDate: Date;
  statRange: 'day' | 'week' | 'month' | 'year' | 'all';
  jiraHost: string;
  theme: 'light' | 'dark';
  sortBy: SortBy;
  sortOrder: SortOrder;
}

export type AppContextValue = [AppStore, SetStoreFunction<AppStore>];
export const AppContext = createContext<AppContextValue>();

export function createAppStore() {
  const [appStore, setAppStore] = createStore(getDefaultAppStore());

  return [appStore, setAppStore] satisfies AppContextValue;
}

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
    statRange: 'day',
    jiraHost: '',
    theme: 'light',
    sortBy: 'duration',
    sortOrder: 'desc',
  };
}
