import { createStore, SetStoreFunction } from 'solid-js/store'
import { createEffect, createMemo, createSignal, For } from 'solid-js';
import { css } from '@linaria/core';
import * as devalue from 'devalue';
import pomodoroSvg from './pomodoro.svg';

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

  const [currentDate, setCurrentDate] = createSignal(new Date());
  const isToday = createMemo(() => currentDate().toDateString() === new Date().toDateString());

  function moveDate(delta: number) {
    const next = new Date(currentDate());
    next.setDate(next.getDate() + delta);
    setCurrentDate(next);
  }

  const [selectedItemId, setSelectedItemId] = createSignal<number | undefined>(undefined);
  const isInProgress = createMemo(() => store.items[store.items.length - 1].end === undefined);

  const itemsAtDate = createMemo(() => store.items.filter(item => item.start.toDateString() === currentDate().toDateString()));
  const reversedItems = createMemo(() => itemsAtDate().slice().reverse());

  const [now, setNow] = createSignal(new Date());
  createEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000); // TODO: 60000
    return () => clearInterval(intervalId);
  });

  const dayStats = createMemo(() => calculateStatsAtDate(store.items, currentDate));

  function updateItem(item: Partial<Item>, id: number) {
    setStore('items', item => item.id === id, item);
  }

  function addItem(item: Partial<Item> = {}) {
    setStore('items', (items) => [...items, {
      id: items.length,
      description: '',
      tag: '',
      start: new Date(),
      end: undefined,
      ...item,
    }]);
  }

  function finishItem() {
    setStore('items', store.items.length - 1, {
      end: new Date(),
    });
  }

  function tapItem() {
    finishItem();
    addItem();
  }

  function removeItem(id: number) {
    setStore('items', (items) => items.filter(item => item.id !== id));
  }

  const { reset } = persistStore(store, setStore);

  function triggerNonDestructiveBlur(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    const selection = window.getSelection();
    const offset = selection?.focusOffset || 0;

    e.preventDefault();
    e.currentTarget.blur();
    e.currentTarget.focus();

    const range = document.createRange();
    const textNode = e.currentTarget.firstChild || e.currentTarget;
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset);

    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  return (
    <div class={sApp}>
      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <button disabled={isInProgress()} onClick={() => addItem()}>Add</button>
          <button disabled={!isInProgress()} onClick={finishItem}>Finish</button>
          <button disabled={!isInProgress()} onClick={tapItem}>Tap</button>
        </div>
        <div class={sToolbarRight}>
          <button disabled={!selectedItemId()} onClick={() => removeItem(selectedItemId()!)}>Remove</button>
          <button onClick={reset}>Reset</button>
        </div>
      </div>

      <div class={sCurrentDate}>
        <button onClick={() => moveDate(-1)}>{'<'}</button>
        {currentDate().toLocaleDateString()}
        <button disabled={isToday()} onClick={() => moveDate(1)}>{'>'}</button>
        <button onClick={() => setCurrentDate(new Date())}>Today</button>
      </div>

      Worklog
      <div class={sTable}>
        <For each={reversedItems()}>
          {(item) => (
            <div class={sRow}
              classList={{ [sRowSelected]: selectedItemId() === item.id }}
              onClick={() => setSelectedItemId(item.id)}
            >
              <div class={sCell}>{toTimestamp(item.start)}</div>
              <div class={sCell}>{calculateDuration(item.start, item.end ?? now())}</div>
              <div class={sCell}>{item.end ? toTimestamp(item.end) : ''}</div>
              <div
                class={sCell}
                classList={{ [sCellEditable]: true }}
                contentEditable
                onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                onKeyDown={(e) => e.key === 'Enter' && triggerNonDestructiveBlur(e)}
              >
                {item.tag}
              </div>
              <div
                class={sCell}
                classList={{ [sCellEditable]: true }}
                contentEditable
                onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
                onKeyDown={(e) => e.key === 'Enter' && triggerNonDestructiveBlur(e)}
              >
                {item.description}
              </div>
            </div>
          )}
        </For>
      </div>

      Stats
      <div class={sTableStats}>
        <For each={dayStats()}>
          {(entry) => (
            <div class={sRow}>
              <div class={sCell}>{entry.tag}</div>
              <div class={sCell}>{entry.duration} minutes</div>
              <div class={sCell} classList={{ [sCellPomodoro]: true }}>
                <For each={Array(Math.floor(toPomodoro(entry.duration))).fill(0)}>
                  {() => <PomodoroIcon />}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function PomodoroIcon() {
  return <img width={24} height={24} src={pomodoroSvg} alt="Pomodoro" />;
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
function toTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function calculateDuration(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
}

function calculateStatsAtDate(itemsAll: Item[], date: () => Date) {
  const target = getDateNoTime(date());

  const itemsAtDate = itemsAll.filter(item => {
    const itemDate = getDateNoTime(item.start);
    return itemDate.getTime() === target.getTime();
  });

  const tags = [...new Set(itemsAtDate.map(item => item.tag))];

  const entries = tags.map(tag => {
    const now = new Date();
    const items = itemsAtDate.filter(item => item.tag === tag);
    const duration = items
      .reduce((acc, item) => acc + calculateDuration(item.start, item.end ?? now), 0);

    return { tag: tag || '*empty*', duration };
  });

  return entries;
}

function getDateNoTime(date: Date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target;
}

function toPomodoro(minutes: number) {
  return Math.round(minutes / 25 * 5) / 5;
}

// styles
const sApp = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

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

const sCurrentDate = css`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
`;

const sTable = css`
  display: grid;
  grid-template-columns: auto auto auto auto auto;
`;

const sTableStats = css`
  display: grid;
  grid-template-columns: auto auto auto;
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

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: default;
  outline: none;
`;

const sCellEditable = css`
  min-width: 120px;
  justify-content: flex-start;
  cursor: text;
`;

const sCellPomodoro = css`
  display: flex;
  gap: 5px;
`;
