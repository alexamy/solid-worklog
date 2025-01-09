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
  id: string;
  description: string;
  tag: string;
  start: Date;
  end: Date | undefined;
}

// component
export function App() {
  const [store, setStore] = createStore<Store>(getDefaultStore());
  const backupKey = 'solid-worklog-store-backup';
  const persist = persistStore(store, setStore);

  // date
  const [currentDate, setCurrentDate] = createSignal(new Date());
  const isToday = createMemo(() => currentDate().toDateString() === new Date().toDateString());

  function moveDate(delta: number) {
    const next = new Date(currentDate());
    next.setDate(next.getDate() + delta);
    setCurrentDate(next);
  }

  // selected
  const [selectedItemId, setSelectedItemId] = createSignal<string | undefined>(undefined);
  createEffect(() => {
    const listener = () => {
      setSelectedItemId(undefined);
    };

    document.body.addEventListener('click', listener);
    return () => document.body.removeEventListener('click', listener);
  });

  // items
  const isInProgress = createMemo(() => store.items[store.items.length - 1].end === undefined);

  const itemsAtDate = createMemo(() => store.items.filter(item => item.start.toDateString() === currentDate().toDateString()));
  const reversedItems = createMemo(() => itemsAtDate().slice().reverse());

  const [now, setNow] = createSignal(new Date());
  createEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(intervalId);
  });

  const dayStats = createMemo(() => calculateStatsAtDate(
    store.items,
    () => isToday() ? now() : currentDate(),
  ));

  const availableTags = createMemo(() => [...new Set(store.items.map(item => item.tag))]);

  // methods
  function updateItem(item: Partial<Item>, id: string) {
    setStore('items', item => item.id === id, item);
  }

  function addItem(item: Partial<Item> = {}) {
    setStore('items', (items) => [...items, {
      id: randomId(),
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

  function removeItem(id: string) {
    setStore('items', (items) => items.filter(item => item.id !== id));
  }

  function processCellKeyDown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
    }
  }

  return (
    <div class={sApp}>
      <div class={sCurrentDate}>
        <div class={sToolbarLeft}>
          <button disabled={isToday()} onClick={() => setCurrentDate(new Date())}>Today</button>
          <button onClick={() => moveDate(-1)}>{'<'}</button>
          {currentDate().toLocaleDateString()}
          <button disabled={isToday()} onClick={() => moveDate(1)}>{'>'}</button>
        </div>
        <div class={sToolbarRight}>
          {toTimestamp(now())}
        </div>
      </div>

      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <button disabled={isInProgress()} onClick={() => addItem()}>Add</button>
          <button disabled={!isInProgress()} onClick={finishItem}>Finish</button>
          <button disabled={!isInProgress()} onClick={tapItem}>Tap</button>
          <button disabled={!selectedItemId()} onDblClick={() => removeItem(selectedItemId()!)}>Remove</button>
        </div>
        <div class={sToolbarRight}>
          <button onDblClick={persist.reset} title="Double click to reset">Reset</button>
        </div>
      </div>

      Worklog
      <div class={sTable}>
        <div class={sRow}>
          <div class={sCell} classList={{ [sCellDuration]: true }}>Duration</div>
          <div class={sCell}>Tag</div>
          <div class={sCell}>Description</div>
        </div>
        <For each={reversedItems()}>
          {(item) => (
            <div class={sRow}
              classList={{ [sRowSelectable]: true, [sRowSelected]: selectedItemId() === item.id }}
              onClick={() => setSelectedItemId(item.id)}
            >
              <div class={sCell}>{toTimestamp(item.start)}</div>
              <div class={sCell}>{calculateDuration(item.start, item.end ?? now())}</div>
              <div class={sCell} classList={{ [sCellGrayed]: !item.end }}>{toTimestamp(item.end ?? now())}</div>
              <div
                class={sCell}
                classList={{ [sCellEditable]: true }}
                contentEditable
                onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                onKeyDown={(e) => processCellKeyDown(e)}
              >
                {item.tag}
              </div>
              <div
                class={sCell}
                classList={{ [sCellEditable]: true }}
                contentEditable
                onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
                onKeyDown={(e) => processCellKeyDown(e)}
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
              <div class={sCell}>{entry.duration} min</div>
              <div class={sCell} classList={{ [sCellPomodoro]: true }}>
                <For each={Array(Math.floor(toPomodoro(entry.duration))).fill(0)}>
                  {() => <PomodoroIcon />}
                </For>
                <PomodoroIcon amount={toPomodoro(entry.duration) % 1} grayed={true} />
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

function PomodoroIcon(props: { amount?: number, grayed?: boolean }) {
  const targetWidth = () => 24 * (props.amount ?? 1);
  const width = () => targetWidth() >= 10 ? targetWidth() : 0;

  return <img
    width={width().toFixed(2)}
    height={24}
    src={pomodoroSvg}
    alt="Pomodoro"
    classList={{ [sPomodoroGrayed]: props.grayed }}
  />;
}

// api
function persistStore(
  store: Store,
  setStore: SetStoreFunction<Store>,
  storageKey = 'solid-worklog-store',
) {
  function save(key = storageKey) {
    localStorage.setItem(key, devalue.stringify(store));
  }

  function load(key = storageKey) {
    const items = localStorage.getItem(key);
    if (items) {
      try {
        setStore(devalue.parse(items));
      } catch (error) {
        console.error(error);
        localStorage.removeItem(key);
        setStore(getDefaultStore());
      }
    }
  }

  createEffect(() => load());
  createEffect(() => save());

  function reset() {
    localStorage.removeItem(storageKey);
    setStore(getDefaultStore());
    window.location.reload();
  }

  return {
    reset,
    load,
    save,
  };
}

function getDefaultStore(): Store {
  const now = new Date();

  function at(hour: number, minute: number) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
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
    }],
  };
}

// methods
function randomId() {
  return Math.random().toString(16).substring(2, 6);
}

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
  return minutes / 25;
}

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

// styles
const sApp = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 500px;
`;

const sToolbar = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
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
  justify-content: space-between;
  align-items: center;
  gap: 10px;
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
`;

const sRowSelectable = css`
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

const sCellDuration = css`
  grid-column: span 3;
`;

const sCellEditable = css`
  min-width: 120px;
  justify-content: flex-start;
  cursor: text;
`;

const sCellGrayed = css`
  color: #242424;
  font-style: italic;

  &:hover {
    color: #555;
  }
`;

const sCellPomodoro = css`
  display: flex;
  gap: 5px;
`;

const sPomodoroGrayed = css`
  filter: grayscale(100%) brightness(120%);
`;
