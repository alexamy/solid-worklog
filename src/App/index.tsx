import { createStore, produce, SetStoreFunction } from 'solid-js/store'
import { createEffect, createMemo, createSignal, For, Match, onCleanup, Show, Switch } from 'solid-js';
import { css, cx } from '@linaria/core';
import superjson from 'superjson';
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

  // items
  const isInProgress = createMemo(() => store.items[store.items.length - 1].end === undefined);

  const itemsAtDate = createMemo(() => store.items.filter(item => item.start.toDateString() === currentDate().toDateString()));

  const [now, setNow] = createSignal(new Date());
  createEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30000);
    onCleanup(() => clearInterval(intervalId));
  });

  // stats
  const [statTime, setStatTime] = createSignal<'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const statTimeStartDate = createMemo(() => {
    const from = currentDate();
    const time = statTime();

    switch (time) {
      case 'day':   return from;
      case 'week':  return getStartOfWeek(from);
      case 'month': return new Date(from.getFullYear(), from.getMonth(), 1);
      case 'year':  return new Date(from.getFullYear(), 0, 1);
      case 'all':   return new Date(0);
      default:      throw new Error(time satisfies never);
    }
  });

  function dateFilter(item: Item) {
    const target = statTimeStartDate();
    const itemDate = getDateNoTime(item.start);
    const time = statTime();

    switch (time) {
      case 'day':
        return itemDate.toDateString() === target.toDateString();
      case 'week':
        return getStartOfWeek(itemDate).toDateString() === target.toDateString();
      case 'month':
        return itemDate.getFullYear() === target.getFullYear()
            && itemDate.getMonth() === target.getMonth();
      case 'year':
        return itemDate.getFullYear() === target.getFullYear();
      case 'all':
        return true;
      default:
        throw new Error(time satisfies never);
    }
  }

  const [sortBy, setSortBy] = createSignal<'tag' | 'duration' | 'pomodoros'>('tag');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

  function changeSorting(by: 'tag' | 'duration' | 'pomodoros') {
    if (sortBy() === by) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(by);
      setSortOrder('asc');
    }
  }

  const dayStats = createMemo(() => calculateStatsAtDate(
    store.items,
    dateFilter,
  ));

  const sortedStats = createMemo(() => {
    const { entries, sumAll } = dayStats();

    const stats = entries.map(item => ({
      ...item,
      pomodoros: toPomodoro(item.duration),
    }));

    stats.sort((a, b) => {
      const aVal = a[sortBy()];
      const bVal = b[sortBy()];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder() === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder() === 'asc'
        ? Number(aVal) - Number(bVal)
        : Number(bVal) - Number(aVal);
    });

    return { entries: stats, sumAll };
  });

  // const availableTags = createMemo(() => [...new Set(store.items.map(item => item.tag))]);

  // methods
  function updateItem(item: Partial<Item>, id: string) {
    setStore('items', item => item.id === id, item);
  }

  function addItem() {
    startItem({
      start: new Date(currentDate().setHours(12, 0, 0, 0)),
      end: new Date(currentDate().setHours(12, 5, 0, 0)),
    });
  }

  function startItem(item: Partial<Item> = {}) {
    setStore('items', (items) => [{
      id: randomId(),
      description: '',
      tag: '',
      start: new Date(),
      end: undefined,
      ...item,
    }, ...items]);
  }

  function finishItem() {
    setStore('items', store.items.length - 1, {
      end: new Date(),
    });
  }

  function tapItem() {
    finishItem();
    startItem();
  }

  function removeItem(id: string) {
    setStore('items', (items) => items.filter(item => item.id !== id));
  }

  function moveUp() {
    setStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selectedItemId());
      if (index > 0) {
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
      }
    }));
  }

  function moveDown() {
    setStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selectedItemId());
      if (index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }
    }));
  }

  function processCellKeyDown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
    }
  }

  async function uploadStore() {
    const data = await uploadJson();
    if (data) setStore(data);
  }

  return (
    <div class={sApp}>
      <div class={sCurrentDate}>
        <div class={sToolbarLeft}>
          <button disabled={isToday()} onClick={() => setCurrentDate(new Date())}>Today</button>
          <button onClick={() => moveDate(-1)}>{'<'}</button>
          <input
            type="date"
            value={currentDate().toISOString().split('T')[0]}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setCurrentDate(new Date(e.target.value))}
            style={{ width: '110px' }}
          />
          <button disabled={isToday()} onClick={() => moveDate(1)}>{'>'}</button>
          {toTimestamp(now())}
        </div>
      </div>

      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <button disabled={isInProgress()} onClick={() => startItem()}>Start</button>
          <button disabled={!isInProgress()} onClick={() => finishItem()}>Finish</button>
          <button disabled={!isInProgress()} onClick={() => tapItem()}>Tap</button>
        </div>
        <div class={sToolbarRight}>
          Rows:
          <button onClick={() => addItem()}>+</button>
          <button disabled={!selectedItemId()} onClick={() => moveUp()}>↑</button>
          <button disabled={!selectedItemId()} onClick={() => moveDown()}>↓</button>
          <button disabled={!selectedItemId()} onClick={() => removeItem(selectedItemId()!)}>-</button>
        </div>
      </div>

      Worklog
      <div class={sTable}>
        <div class={sRow} onClick={() => setSelectedItemId(undefined)}>
          <div class={cx(sCell, sCellHeader, sCellSpan3)}>Duration</div>
          <div class={cx(sCell, sCellHeader)}>Tag</div>
          <div class={cx(sCell, sCellHeader)}>Description</div>
        </div>
        <For each={itemsAtDate()}>
          {(item) => (
            <div class={cx(sRow, sRowSelectable)}
              classList={{
                [sRowSelected]: selectedItemId() === item.id,
                [sRowIdle]: item.tag === 'idle',
              }}
              onClick={() => setSelectedItemId(item.id)}
            >
              <div
                class={cx(sCell, sCellEditable)}
                contentEditable
                onBlur={(e) => updateItem({ start: updateTimestamp(item.start, e.currentTarget.textContent!) }, item.id)}
                onKeyDown={(e) => processCellKeyDown(e)}
              >
                {toTimestamp(item.start)}
              </div>
              <div class={sCell}>
                {calculateDuration(item.start, item.end ?? now())}
              </div>
              <div
                class={cx(sCell, sCellEditable)}
                classList={{ [sCellGrayed]: !item.end }}
                contentEditable={Boolean(item.end)}
                onBlur={(e) => updateItem({ end: updateTimestamp(item.end!, e.currentTarget.textContent!) }, item.id)}
                onKeyDown={(e) => processCellKeyDown(e)}
              >
                {toTimestamp(item.end ?? now())}
              </div>
              <div
                class={cx(sCell, sCellEditable, sCellEditableText)}
                contentEditable
                onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                onKeyDown={(e) => processCellKeyDown(e)}
              >
                {item.tag}
              </div>
              <div
                class={cx(sCell, sCellEditable, sCellEditableText)}
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

      <br />
      Statistics
      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <label>
            <input type="radio" name="timeRange" value="day"
              onChange={() => setStatTime('day')}
              checked={statTime() === 'day'}
            />
            Day
          </label>
          <label>
            <input type="radio" name="timeRange" value="week"
              onChange={() => setStatTime('week')}
              checked={statTime() === 'week'}
            />
            Week
          </label>
          <label>
            <input type="radio" name="timeRange" value="month"
              onChange={() => setStatTime('month')}
              checked={statTime() === 'month'}
            />
            Month
          </label>
          <label>
            <input type="radio" name="timeRange" value="year"
              onChange={() => setStatTime('year')}
              checked={statTime() === 'year'}
            />
            Year
          </label>
          <label>
            <input type="radio" name="timeRange" value="all"
              onChange={() => setStatTime('all')}
              checked={statTime() === 'all'}
            />
            All time
          </label>
        </div>
      </div>

      <div class={sTableStats}>
        <div class={sRow}>
          <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('tag')}>Tag</div>
          <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('duration')}>Minutes</div>
          <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('pomodoros')}>Pomodoros</div>
        </div>
        <For each={sortedStats().entries}>
          {(entry) => (
            <div class={sRow}>
              <div class={sCell}>{entry.tag}</div>
              <div class={sCell}>{entry.duration} min</div>
              <div class={cx(sCell, sCellPomodoro)}>
                <Show when={entry.pomodoros > 0}>
                  <Switch>
                    <Match when={Math.floor(entry.pomodoros) > 4}>
                      <PomodoroIcon /> x{Math.floor(entry.pomodoros)}
                    </Match>
                    <Match when={Math.floor(entry.pomodoros) <= 4}>
                      <For each={Array(Math.floor(entry.pomodoros))}>
                        {() => <PomodoroIcon />}
                      </For>
                      <Show when={entry.pomodoros % 1 !== 0}>
                        <PomodoroIcon amount={entry.pomodoros % 1} grayed={true} />
                      </Show>
                    </Match>
                  </Switch>
                </Show>
              </div>
            </div>
          )}
        </For>
        <div class={sRow}>
          <div class={cx(sCell, sCellSpan3)}>{minutesToHoursMinutes(sortedStats().sumAll)}</div>
        </div>
      </div>

      <br />
      Danger zone
      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <button onClick={() => downloadJson(store)}>Save backup</button>
          <button onClick={uploadStore}>Load backup</button>
          <button onDblClick={persist.reset} title="Double click to reset">Reset</button>
        </div>
      </div>
    </div>
  )
}

function updateTimestamp(date: Date, timestamp: string) {
  const [hours, minutes] = timestamp.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0);

  if (isNaN(newDate.getTime())) {
    return date;
  }

  return newDate;
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
    localStorage.setItem(key, superjson.stringify(store));
  }

  function load(key = storageKey, backupStore = getDefaultStore()) {
    const items = localStorage.getItem(key);
    if (items) {
      try {
        setStore(superjson.parse(items));
      } catch (error) {
        console.error(error);
        localStorage.removeItem(key);
        setStore(backupStore);
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
  };
}

async function uploadJson(): Promise<Store | undefined> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.click();

  return new Promise((resolve, reject) => {
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = superjson.parse(text) as Store;
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
  });
}

function downloadJson(content: unknown) {
  const { json, meta } = superjson.serialize(content);
  const data = JSON.stringify({ json, meta }, null, 2);
  const filename = `worklog-backup-${new Date().toISOString().split('T')[0]}.json`;
  downloadBlob(data, filename, 'application/json');
}

function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

function minutesToHoursMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} h ${remainingMinutes} min`;
}

function calculateStatsAtDate(itemsAll: Item[], filter: (item: Item) => boolean) {
  const itemsAtDate = itemsAll.filter(filter);

  const tags = [...new Set(itemsAtDate.map(item => item.tag))];

  const entries = tags.map(tag => {
    const now = new Date();
    const items = itemsAtDate.filter(item => item.tag === tag);
    const duration = items
      .reduce((sum, item) => sum + calculateDuration(item.start, item.end ?? now), 0);

    return { tag: tag || '*empty*', duration };
  });

  const sumAll = entries.reduce((sum, entry) => sum + entry.duration, 0);

  return { entries, sumAll };
}

function getDateNoTime(date: Date) {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target;
}

function toPomodoro(minutes: number) {
  return minutes / 25;
}

function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to make Monday the first day
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
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
  padding: 5px 0;
`;

const sToolbarLeft = css`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const sToolbarRight = css`
  display: flex;
  gap: 10px;
  align-items: center;
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

const sRowIdle = css`
  color: #555;
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

const sCellHeader = css`
  cursor: pointer;
`;

const sCellSpan3 = css`
  grid-column: span 3;
`;

const sCellEditable = css`
  cursor: text;
`;

const sCellEditableText = css`
  min-width: 120px;
  justify-content: flex-start;
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
