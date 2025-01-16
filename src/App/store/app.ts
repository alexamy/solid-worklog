import { createContext, useContext } from 'solid-js';
import { AppContextValue } from './appMethods';

export interface AppStore {
  selectedDate: Date;
  currentTab: 'worklog' | 'settings';
  statRange: 'day' | 'week' | 'month' | 'year' | 'all';
  sortBy: 'tag' | 'duration';
  sortOrder: 'asc' | 'desc';
  jiraHost: string;
  theme: 'light' | 'dark';
  skipEmptyDays: boolean;
}

export const AppContext = createContext<AppContextValue>();

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
    skipEmptyDays: false,
  };
}
