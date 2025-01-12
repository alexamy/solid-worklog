import { createStore, produce } from 'solid-js/store';
import { getDefaultDataStore, Item } from './data';
import { calculateDuration } from '../time';

export type DataContextValue = ReturnType<typeof createDataStore>;

export function createDataStore() {
  const [dataStore, setDataStore] = createStore(getDefaultDataStore());

  // memos
  const isInProgress = () => dataStore.items[0].end === undefined;

  // item management
  function createItem(partial: Partial<Item>) {
    const item = {
      id: randomId(),
      description: '',
      tag: '',
      start: new Date(),
      end: undefined,
      ...partial,
    };

    setDataStore('items', (items) => [item, ...items]);

    return item;
  }

  function addItem(at: Date) {
    const date = new Date(at);

    createItem({
      start: new Date(date.setHours(12, 0, 0, 0)),
      end: new Date(date.setHours(12, 5, 0, 0)),
    });
  }

  function updateItem(item: Partial<Item>, id: string) {
    setDataStore('items', item => item.id === id, item);
  }

  function removeItem(selected: string, setSelectedItemId: (id: string) => void) {
    // select next item
    const index = dataStore.items.findIndex(item => item.id === selected);
    if(index >= 0) {
      const item = dataStore.items[index + 1];
      setSelectedItemId(item?.id);
    }

    // remove item
    const filtered = dataStore.items.filter(item => item.id !== selected);
    if(filtered.length > 0) {
      setDataStore('items', filtered);
    }
  }

  // worklog methods
  function startLog(item: Partial<Item> = {}) {
    const now = new Date();

    const lastItem = dataStore.items[0];
    if(!lastItem || !lastItem.end) {
      throw new Error('No last item or end time');
    }

    // if from last item the time is between 20 minutes and 2 hours, then add entry with idle tag
    const duration = calculateDuration(lastItem.end, now);
    if(duration >= 20 && duration <= 2 * 60) {
      fillLog({ tag: 'idle' });
    }

    // start new item
    createItem({
      start: now,
      end: undefined,
      ...item,
    });
  }

  function fillLog(item: Partial<Item> = {}) {
    const lastItem = dataStore.items[0];
    if(!lastItem || !lastItem.end) {
      throw new Error('No last item or end time');
    }

    createItem({
      start: lastItem.end,
      end: new Date(),
      ...item,
    });
  }

  function finishLog() {
    setDataStore('items', 0, {
      end: new Date(),
    });
  }

  function tapLog() {
    finishLog();
    startLog();
  }

  // item movement
  // TODO: move above or below selected item
  function duplicateRow(selected: string) {
    const item = dataStore.items.find(item => item.id === selected);
    if(item) {
      createItem(item);
    }
  }

  function moveRowUp(selected: string) {
    setDataStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selected);
      if (index > 0) {
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
      }
    }));
  }

  function moveRowDown(selected: string) {
    setDataStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selected);
      if (index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }
    }));
  }

  return [dataStore, setDataStore, {
    isInProgress,

    createItem,
    addItem,
    updateItem,
    removeItem,

    startLog,
    finishLog,
    fillLog,
    tapLog,

    moveRowUp,
    moveRowDown,
    duplicateRow,
  }] as const;
}

function randomId() {
  return Math.random().toString(16).substring(2, 8);
}
