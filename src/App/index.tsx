import { css, cx } from '@linaria/core';
import createFuzzySearch from '@nozbe/microfuzz';
import { createEffect, createMemo, createSignal, For, Match, onCleanup, onMount, Show, Switch } from 'solid-js';
import { createStore, produce, SetStoreFunction } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import superjson from 'superjson';
import pomodoroSvg from './pomodoro.svg';
import { getDefaultDataStore, Item, DataStore } from './store/data';

// component
export function App() {
  const [dataStore, setDataStore] = createStore<DataStore>(getDefaultDataStore());
  const persist = persistStore(dataStore, setDataStore);

  // date
  const [currentDate, setCurrentDate] = createSignal(new Date());
  const isToday = createMemo(() => currentDate().toDateString() === new Date().toDateString());

  function moveDate(delta: number) {
    setSelectedItemId(undefined);
    const next = new Date(currentDate());
    next.setDate(next.getDate() + delta);
    setCurrentDate(next);
  }

  // selected
  const [selectedItemId, setSelectedItemId] = createSignal<string | undefined>(undefined);

  // items
  const isInProgress = createMemo(() => dataStore.items[0].end === undefined);
  const itemsAtDate = createMemo(() => dataStore.items.filter(item => item.start.toDateString() === currentDate().toDateString()));

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
    dataStore.items,
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

  const allTags = createMemo(() => {
    const tags = dataStore.items.map(item => item.tag);
    const uniqueTags = [...new Set(tags)];
    return uniqueTags;
  });

  const fuzzySearch = createMemo(() => createFuzzySearch(allTags()));
  const [availableTags, setAvailableTags] = createSignal<string[]>([]);

  function updateAvailableTags(query: string) {
    const results = fuzzySearch()(query);
    setAvailableTags(results.map(result => result.item));
  }

  let tagListElement!: HTMLDivElement;
  onMount(() => {
    tagListElement.style.display = 'none';
  });

  function positionTagList(e: MouseEvent & { currentTarget: HTMLDivElement }) {
    const rect = e.currentTarget.getBoundingClientRect();
    tagListElement.style.left = `${rect.left}px`;
    tagListElement.style.top = `${rect.top + rect.height - 1}px`;
    tagListElement.style.width = `${rect.width}px`;
  }

  function toggleTagList(type?: 'show' | 'hide') {
    if (type === 'show') {
      tagListElement.style.display = 'block';
    } else if (type === 'hide') {
      tagListElement.style.display = 'none';
    } else {
      tagListElement.style.display = tagListElement.style.display === 'block' ? 'none' : 'block';
    }
  }

  createEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      if (!target.dataset.tag) {
        toggleTagList('hide');
      }
    }

    document.body.addEventListener('click', onClick);
    onCleanup(() => document.body.removeEventListener('click', onClick));
  });

  // methods
  function createItem(item: Partial<Item>) {
    setDataStore('items', (items) => [{
      id: randomId(),
      description: '',
      tag: '',
      start: new Date(),
      end: undefined,
      ...item,
    }, ...items]);
  }

  function updateItem(item: Partial<Item>, id: string) {
    setDataStore('items', item => item.id === id, item);
  }

  function addItem() {
    createItem({
      start: new Date(currentDate().setHours(12, 0, 0, 0)),
      end: new Date(currentDate().setHours(12, 5, 0, 0)),
    });
  }

  function startItem(item: Partial<Item> = {}) {
    setCurrentDate(now());

    const lastItem = dataStore.items[0];
    if(!lastItem || !lastItem.end) {
      throw new Error('No last item or end time');
    }

    // if from last item the time is between 20 minutes and 2 hours, then add entry with idle tag
    const duration = calculateDuration(lastItem.end, now());
    if(duration >= 20 && duration <= 2 * 60) {
      createItem({
        start: lastItem.end,
        end: new Date(),
        tag: 'idle',
      });
    }

    // start new item
    createItem({
      start: new Date(),
      end: undefined,
      ...item,
    });
  }

  function finishItem() {
    setDataStore('items', 0, {
      end: new Date(),
    });
  }

  function tapItem() {
    finishItem();
    startItem();
  }

  function removeItem() {
    const selected = selectedItemId()!;

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

  function moveUp() {
    setDataStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selectedItemId());
      if (index > 0) {
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
      }
    }));
  }

  function moveDown() {
    setDataStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selectedItemId());
      if (index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }
    }));
  }

  function onCellKeyDown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
    }
  }

  function onTagCellKeyDown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
      toggleTagList('hide');
    }
  }

  function onTagCellKeyUp(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') return;
    updateAvailableTags(e.currentTarget.textContent!);
    toggleTagList('show');
  }

  async function uploadStore() {
    const data = await uploadJson();
    if (data) setDataStore(data);
  }

  function getWeekInterval(date: Date) {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    const endStr = end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

    return `${startStr} - ${endStr}`;
  }

  return (
    <div class={sApp}>
      <Portal>
        <div ref={tagListElement} class={sTagList}>
          <For each={availableTags()}>
            {(tag) =>
              <div class={sTag} onClick={() => updateItem({ tag }, selectedItemId()!)}>
                {tag}
              </div>
            }
          </For>
        </div>
      </Portal>

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

      Worklog
      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <button disabled={isInProgress()} onClick={() => startItem()}>Start</button>
          <button disabled={!isInProgress()} onClick={() => finishItem()}>Finish</button>
          <button disabled={!isInProgress()} onClick={() => tapItem()}>Tap</button>
        </div>
        <div class={sToolbarRight}>
          Rows:
          <button disabled={isInProgress()} onClick={() => addItem()}>+</button>
          <button disabled={!selectedItemId() || isInProgress()} onClick={() => moveUp()}>↑</button>
          <button disabled={!selectedItemId() || isInProgress()} onClick={() => moveDown()}>↓</button>
          <button disabled={!selectedItemId() || isInProgress() || dataStore.items.length <= 1} onClick={() => removeItem()}>-</button>
        </div>
      </div>


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
                onKeyDown={(e) => onCellKeyDown(e)}
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
                onKeyDown={(e) => onCellKeyDown(e)}
              >
                {toTimestamp(item.end ?? now())}
              </div>
              <div
                data-tag={true}
                class={cx(sCell, sCellEditable, sCellEditableText)}
                contentEditable
                onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                onClick={(e) => positionTagList(e)}
                onKeyDown={(e) => onTagCellKeyDown(e)}
                onKeyUp={(e) => onTagCellKeyUp(e)}
              >
                {item.tag}
              </div>
              <div
                class={cx(sCell, sCellEditable, sCellEditableText)}
                contentEditable
                onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
                onKeyDown={(e) => onCellKeyDown(e)}
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
            Day ({currentDate().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })})
          </label>
          <label>
            <input type="radio" name="timeRange" value="week"
              onChange={() => setStatTime('week')}
              checked={statTime() === 'week'}
            />
            Week ({getWeekInterval(currentDate())})
          </label>
          <label>
            <input type="radio" name="timeRange" value="month"
              onChange={() => setStatTime('month')}
              checked={statTime() === 'month'}
            />
            Month ({currentDate().toLocaleDateString('en-US', { month: 'long' })})
          </label>
          <label>
            <input type="radio" name="timeRange" value="year"
              onChange={() => setStatTime('year')}
              checked={statTime() === 'year'}
            />
            Year ({currentDate().toLocaleDateString('en-US', { year: 'numeric' })})
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
          <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('duration')}>Duration</div>
          <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('pomodoros')}>Pomodoros (30 min)</div>
        </div>
        <For each={sortedStats().entries}>
          {(entry) => (
            <div class={sRow}>
              <div class={sCell}>{entry.tag}</div>
              <div class={sCell}>{minutesToHoursMinutes(entry.duration)}</div>
              <div class={cx(sCell, sCellPomodoro)}>
                <Show when={entry.pomodoros > 0}>
                  <Switch>
                    <Match when={entry.tag === 'idle'}>
                      <span>🌞 🌴 ⛱️ 🧘‍♀️ 🍹</span>
                    </Match>
                    <Match when={Math.floor(entry.pomodoros) > 4}>
                      <PomodoroIcon /> x{Math.floor(entry.pomodoros)}
                    </Match>
                    <Match when={Math.floor(entry.pomodoros) <= 4}>
                      <For each={Array(Math.floor(entry.pomodoros))}>
                        {() => <PomodoroIcon />}
                      </For>
                      <PomodoroIcon amount={entry.pomodoros % 1} grayed={true} />
                    </Match>
                  </Switch>
                </Show>
              </div>
            </div>
          )}
        </For>
        <div class={sRow}>
          <div class={cx(sCell)}></div>
          <div class={cx(sCell)}><b>{minutesToHoursMinutes(sortedStats().sumAll)}</b></div>
          <div class={cx(sCell)}></div>
        </div>
      </div>

      <br />
      Utilities
      <div class={sToolbar}>
        <div class={sToolbarLeft}>
          <button onClick={() => downloadJson(dataStore)}>Save backup</button>
          <button onClick={uploadStore}>Load backup</button>
          <button onDblClick={persist.reset}>Reset (double click)</button>
        </div>
      </div>
    </div>
  )
}

function updateTimestamp(date: Date, timestamp: string) {
  const [hours, minutes] = timestamp.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return date;
  }

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
  store: DataStore,
  setStore: SetStoreFunction<DataStore>,
  storageKey = 'solid-worklog-store',
) {
  function save(key = storageKey) {
    localStorage.setItem(key, superjson.stringify(store));
  }

  function load(key = storageKey, backupStore = getDefaultDataStore()) {
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
    setStore(getDefaultDataStore());
    window.location.reload();
  }

  return {
    reset,
  };
}

async function uploadJson(): Promise<DataStore | undefined> {
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
        const data = superjson.parse(text) as DataStore;
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

// methods
function randomId() {
  return Math.random().toString(16).substring(2, 8);
}

function toTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function calculateDuration(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
}

function minutesToHoursMinutes(minutesAmount: number) {
  const hours = Math.floor(minutesAmount / 60);
  const minutes = minutesAmount % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
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
  return minutes / 30;
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
  color: #999;
`;

const sRowSelectable = css`
  /* &:hover:not(.${sRowSelected}) {
    background-color: #333;
  } */
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

const sTagList = css`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
`;

const sTag = css`
  padding: 5px 10px;
  background-color: #333;
  color: #fff;
  cursor: pointer;
`;
