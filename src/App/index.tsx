import { createStore, unwrap } from 'solid-js/store'
import { createEffect, For } from 'solid-js';
import { css } from '@linaria/core';

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

const STORAGE_KEY = 'solid-worklog-store';

// component
export function App() {
  const [store, setStore] = createStore<Store>(defaultStore);

  function updateItem(item: Partial<Item>, index: number) {
    setStore('items', index, item);
  }

  createEffect(() => {
    const items = localStorage.getItem(STORAGE_KEY);
    if (items) {
      setStore(JSON.parse(items));
    }
  });

  createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unwrap(store)));
  });

  return (
    <div>
      <div class={sToolbar}>
        <button onClick={() => localStorage.removeItem(STORAGE_KEY)}>Reset</button>
      </div>
      <div class={sTable}>
        <For each={store.items}>
          {(item, index) => (
            <div class={sRow}>
              <div class={sCell}>{formatTime(item.start)}</div>
              <div class={sCell}>{calculateDuration(item.start, item.end)}</div>
              <div class={sCell}>{formatTime(item.end)}</div>
              <div
                class={sCell}
                contentEditable
                onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, index())}
              >
                {item.tag}
              </div>
              <div
                class={sCell}
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
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

// styles
const sToolbar = css`
  display: flex;
  padding: 10px 15px;
`;

const sTable = css`
  display: flex;
  flex-direction: column;
`;

const sRow = css`
  display: flex;
`;

const sCell = css`
  flex: 1;
  border: 1px solid #ccc;
  padding: 10px 15px;
`;
