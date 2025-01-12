import { createContext, useContext } from 'solid-js';
import { DataContextValue } from './dataMethods';

export interface DataStore {
  items: Item[];
}

export interface Item {
  id: string;
  description: string;
  tag: string;
  start: Date;
  end: Date | undefined;
}

export const DataContext = createContext<DataContextValue>();

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("Can't find DataContext");
  }

  return context;
}

export function getDefaultDataStore(): DataStore {
  const now = new Date();

  function at(options: Partial<{ year: number, month: number, day: number, hour: number, minute: number }>) {
    const { year, month, day, hour, minute } = {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      ...options,
    };
    return new Date(year, month, day, hour, minute, 0);
  }

  return {
    items: [{
      id: '1',
      description: 'dinner',
      tag: 'idle',
      start: at({ hour: 13, minute: 20 }),
      end: at({ hour: 14, minute: 0 }),
  }, {
      id: '2',
      description: 'dev',
      tag: 'task 1',
      start: at({ hour: 14, minute: 5 }),
      end: at({ hour: 15, minute: 0 }),
    }, {
      id: '3',
      description: 'dev',
      tag: 'task 2',
      start: at({ hour: 15, minute: 15 }),
      end: at({ hour: 15, minute: 35 }),
    }],
  };
}
