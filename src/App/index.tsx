import { createStore, SetStoreFunction } from 'solid-js/store'
import { createEffect, createMemo, createSignal, For } from 'solid-js';
import { css } from '@linaria/core';
import * as devalue from 'devalue';

// types
interface Store {
  items: Item[];
}

interface Item {
  id: number;
  description: string;
  tag: string;
  start: Date;
  end: Date | undefined;
}

// component
export function App() {
  const [store, setStore] = createStore<Store>(defaultStore);

  const [selectedItemId, setSelectedItemId] = createSignal<number | undefined>(undefined);
  const isInProgress = createMemo(() => store.items[store.items.length - 1].end === undefined);
  const reversedItems = createMemo(() => store.items.slice().reverse());

  const [now, setNow] = createSignal(new Date());
  createEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  });

  function updateItem(item: Partial<Item>, id: number) {
    setStore('items', item => item.id === id, item);
  }

  function addItem() {
    setStore('items', (items) => [...items, {
      id: items.length,
      description: '',
      tag: '',
      start: new Date(),
      end: undefined,
    }]);
  }

  function finishItem() {
    setStore('items', store.items.length - 1, {
      end: new Date(),
    });
  }

  function removeItem(id: number) {
    setStore('items', (items) => items.filter(item => item.id !== id));
  }

  const { reset } = persistStore(store, setStore);

  return (
    <div>
      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <button disabled={isInProgress()} onClick={addItem}>Add</button>
          <button disabled={!isInProgress()} onClick={finishItem}>Finish</button>
        </div>
        <div class={sToolbarRight}>
          <button disabled={!selectedItemId()} onClick={() => removeItem(selectedItemId()!)}>Remove</button>
          <button onClick={reset}>Reset</button>
        </div>
      </div>
      <div class={sTable}>
        <For each={reversedItems()}>
          {(item) => (
            <div class={sRow}
              classList={{ [sRowSelected]: selectedItemId() === item.id }}
              onClick={() => setSelectedItemId(item.id)}
            >
              <div class={sCell}>{formatTime(item.start)}</div>
              <div class={sCell}>{calculateDuration(item.start, item.end ?? now())}</div>
              <div class={sCell}>{item.end ? formatTime(item.end) : ''}</div>
              <div
                class={sCell}
                classList={{ [sCellEditable]: true }}
                contentEditable
                onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
              >
                {item.tag}
              </div>
              <div
                class={sCell}
                classList={{ [sCellEditable]: true }}
                contentEditable
                onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
              >
                {item.description}
              </div>
            </div>
            )}
          </For>
        </div>
    </div>
  )
}

// api
function persistStore(
  store: Store,
  setStore: SetStoreFunction<Store>,
  storageKey = 'solid-worklog-store',
) {
  // load from storage
  createEffect(() => {
    const items = localStorage.getItem(storageKey);
    if (items) {
      try {
        setStore(devalue.parse(items));
      } catch (error) {
        console.error(error);
        localStorage.removeItem(storageKey);
        setStore(defaultStore);
      }
    }
  });

  // save to storage
  createEffect(() => {
    localStorage.setItem(storageKey, devalue.stringify(store));
  });

  // api
  function reset() {
    localStorage.removeItem(storageKey);
    setStore(defaultStore);
    window.location.reload();
  }

  return {
    reset,
  };
}

const defaultStore: Store = {
  items: [{
    id: 125,
    description: 'dinner',
    tag: 'idle',
    start: new Date(2025, 0, 1, 17, 20, 0),
    end: new Date(2025, 0, 1, 18, 25, 0),
  }],
};

// methods
function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function calculateDuration(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
}

// styles
const sToolbar = css`
  display: flex;
  justify-content: space-between;
  padding: 10px 15px;
  gap: 10px;
`;

const sToolbarLeft = css`
  display: flex;
  gap: 10px;
`;

const sToolbarRight = css`
  display: flex;
  gap: 10px;
`;

const sTable = css`
  display: grid;
  grid-template-columns: auto auto auto auto auto;
`;

const sRowSelected = css`
  background-color: #161616;
`;

const sRow = css`
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;

  &:hover:not(.${sRowSelected}) {
    background-color: #333;
  }
`;

const sCell = css`
  flex: 1;
  border: 1px solid #ccc;
  padding: 10px 15px;
  cursor: default;
`;

const sCellEditable = css`
  text-align: left;
  cursor: text;
`;
