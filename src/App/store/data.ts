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
  end: Date;
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

  function at(hour: number, minute: number, offset: {
    day?: number, month?: number, year?: number,
  } = {}) {
    return new Date(
      now.getFullYear() + (offset.year || 0),
      now.getMonth() + (offset.month || 0),
      now.getDate() + (offset.day || 0),
      hour,
      minute,
      0,
    );
  }

  return {
    items: [{
      id: '1',
      description: 'dinner',
      tag: 'idle',
      start: at(13, 20),
      end: at(14, 0),
    }, {
      id: '2',
      description: 'dev',
      tag: 'task 1',
      start: at(14, 5),
      end: at(15, 0),
    }, {
      id: '3',
      description: 'dev',
      tag: 'task 2',
      start: at(15, 15),
      end: at(15, 35),
    }, {
      id: '3a',
      description: 'dev',
      tag: 'task 2',
      start: at(15, 45),
      end: at(16, 0),
    }, {
      id: '4',
      description: 'dev',
      tag: 'task yesterday',
      start: at(15, 15, { day: -1 }),
      end: at(15, 35, { day: -1 }),
    }, {
      id: '5',
      description: 'dev',
      tag: 'task last month',
      start: at(15, 15, { month: -1 }),
      end: at(15, 35, { month: -1 }),
    }, {
      id: '6',
      description: 'dev',
      tag: 'task last year',
      start: at(15, 15, { year: -1 }),
      end: at(15, 35, { year: -1 }),
    }],
  };
}
