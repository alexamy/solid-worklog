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

  function at(options: {
    hour: number, minute: number,
    day?: number, month?: number, year?: number,
  }) {
    const { hour, minute, year, month, day } = {
      hour: options.hour,
      minute: options.minute,
      day: now.getDate() + (options.day || 0),
      month: now.getMonth() + (options.month || 0),
      year: now.getFullYear() + (options.year || 0),
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
