import { createContext, useContext } from 'solid-js';
import { createStore, SetStoreFunction } from 'solid-js/store';

export interface AppStore {
  selectedDate: Date;
  currentTab: 'worklog' | 'settings';
  statRange: 'day' | 'week' | 'month' | 'year' | 'all';
  sortBy: 'tag' | 'duration';
  sortOrder: 'asc' | 'desc';
  jiraHost: string;
  theme: string;
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
    currentTab: 'worklog',
    statRange: 'day',
    sortBy: 'duration',
    sortOrder: 'desc',
    jiraHost: '',
    theme: 'light',
  };
}
