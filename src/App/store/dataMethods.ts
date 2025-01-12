import { createStore, produce } from 'solid-js/store';
import { getDefaultDataStore, Item } from './data';
import { calculateDuration } from '../time';

export type DataContextValue = ReturnType<typeof createDataStore>;

export function createDataStore() {
  const [dataStore, setDataStore] = createStore(getDefaultDataStore());

  // memos
  const isInProgress = () => dataStore.items[0].end === undefined;

  // item management
  function createItem(partial: Partial<Item>): Item {
    const item = {
      description: '',
      tag: '',
      start: new Date(),
      end: undefined,
      ...partial,
      id: randomId(),
    };

    setDataStore('items', (items) => [item, ...items]);

    return item;
  }

  function updateItem(item: Partial<Item>, id: string): void {
    setDataStore('items', item => item.id === id, item);
  }

  // worklog methods
  function startLog(item: Partial<Item> = {}): Item {
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
    return createItem({
      start: now,
      end: undefined,
      ...item,
    });
  }

  function fillLog(item: Partial<Item> = {}): Item {
    const lastItem = dataStore.items[0];
    if(!lastItem || !lastItem.end) {
      throw new Error('No last item or end time');
    }

    return createItem({
      start: lastItem.end,
      end: new Date(),
      ...item,
    });
  }

  function finishLog(): Item {
    setDataStore('items', 0, {
      end: new Date(),
    });

    return dataStore.items[0];
  }

  function tapLog(): Item {
    finishLog();
    return startLog();
  }

  // item movement
  function addRow(at: Date): Item {
    const date = new Date(at);

    return createItem({
      start: new Date(date.setHours(12, 0, 0, 0)),
      end: new Date(date.setHours(12, 5, 0, 0)),
    });
  }

  function duplicateRow(selected: string): Item {
    const item = dataStore.items.find(item => item.id === selected);
    if(!item) {
      throw new Error('Item not found');
    }

    const newItem = createItem(item);
    setDataStore('items', produce((items) => {
      const selectedIndex = items.findIndex(item => item.id === selected);
        const newIndex = items.findIndex(item => item.id === newItem.id);
        items.splice(newIndex, 1); // Remove
        items.splice(selectedIndex, 0, newItem); // Insert
      }));

    return newItem;
  }

  function removeRow(selected: string, setSelectedItemId: (id: string) => void): void {
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

  function moveRowUp(selected: string): void {
    setDataStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selected);
      if (index > 0) {
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
      }
    }));
  }

  function moveRowDown(selected: string): void {
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
    updateItem,

    startLog,
    finishLog,
    fillLog,
    tapLog,

    addRow,
    duplicateRow,
    removeRow,
    moveRowUp,
    moveRowDown,
  }] as const;
}

function randomId() {
  return Math.random().toString(16).substring(2, 8);
}
