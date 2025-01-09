import { createStore, unwrap } from 'solid-js/store'
import { createEffect, For } from 'solid-js';
import { css } from '@linaria/core';

interface Item {
  id: number;
  description: string;
  tag: string;
  start: Date;
  end: Date;
}

export function App() {
  const [store, setStore] = createStore({
    items: [{
      id: 0,
      description: 'dinner',
      tag: 'idle',
      start: new Date(2025, 0, 1, 17, 20, 0),
      end: new Date(2025, 0, 1, 18, 25, 0),
    }] satisfies Item[],
  });

  function updateItem(item: Partial<Item>, index: number) {
    setStore('items', index, item);
  }

  return (
    <div>
      <For each={store.items}>
        {(item, index) => (
          <div class={sTable}>
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
  )
}

// methods
function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function calculateDuration(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

// styles
const sTable = css`
  display: flex;
`;

const sCell = css`
  flex: 1;
  border: 1px solid #ccc;
  padding: 10px 15px;
`;
