import { createStore, SetStoreFunction } from 'solid-js/store'
import { createEffect, For } from 'solid-js';
import { css, cx } from '@linaria/core';
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
  end: Date;
}

// component
export function App() {
  const [store, setStore] = createStore<Store>(defaultStore);

  function updateItem(item: Partial<Item>, index: number) {
    setStore('items', index, item);
  }

  function addItem() {
    setStore('items', (items) => [...items, {
      id: items.length,
      description: '',
      tag: '',
      start: new Date(),
      end: new Date(),
    }]);
  }

  function finishItem(index: number) {
    setStore('items', index, {
      end: new Date(),
    });
  }

  const { reset } = persistStore(store, setStore);

  return (
    <div>
      <div class={sToolbar}>
        <button onClick={addItem}>Add</button>
        <button onClick={() => finishItem(store.items.length - 1)}>Finish</button>
        <button onClick={reset}>Reset</button>
      </div>
      <div class={sTable}>
        <For each={store.items}>
          {(item, index) => (
            <div class={sRow}>
              <div class={sCell}>{formatTime(item.start)}</div>
              <div class={sCell}>{calculateDuration(item.start, item.end)}</div>
              <div class={sCell}>{formatTime(item.end)}</div>
              <div
                class={cx(sCell, sCellText)}
                contentEditable
                onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, index())}
              >
                {item.tag}
              </div>
              <div
                class={cx(sCell, sCellText)}
                contentEditable
                onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, index())}
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
    id: 0,
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
  padding: 10px 15px;
  gap: 10px;
`;

const sTable = css`
  display: grid;
  grid-template-columns: auto auto auto auto auto;
`;

const sRow = css`
  display: contents;
`;

const sCell = css`
  flex: 1;
  border: 1px solid #ccc;
  padding: 10px 15px;
`;

const sCellText = css`
  text-align: left;
`;
