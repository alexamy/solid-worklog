import { createMemo, For, Match, Show, Switch } from 'solid-js';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { calculateDuration } from '../time';
import pomodoroSvg from './pomodoro.svg';
import { useNowContext } from '../store/now';

interface StatEntry {
  tag: string;
  duration: number;
  pomodoros: number;
}

interface StatResult {
  entries: StatEntry[];
  sumAll: number;
}

type StatRange = 'day' | 'week' | 'month' | 'year' | 'all';
type SortBy = 'tag' | 'duration';
type SortOrder = 'asc' | 'desc';

export function Statistics() {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore] = useDataContext();
  const now = useNowContext();

  const selectedDate = () => appStore.selectedDate;

  // sorting
  const sortBy = () => appStore.sortBy;
  const setSortBy = (by: SortBy) => setAppStore('sortBy', by);

  const sortOrder = () => appStore.sortOrder;
  const setSortOrder = (order: SortOrder) => setAppStore('sortOrder', order);

  function changeSorting(by: SortBy) {
    if (sortBy() === by) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(by);
      setSortOrder('asc');
    }
  }

  // range
  const range = () => appStore.statRange;
  const setRange = (range: StatRange) => setAppStore('statRange', range);

  // stats
  const stats = createMemo(() => {
    now(); // force update on clock change

    const start = getStartOfStatRange(selectedDate(), range());
    const items = dataStore.items.filter(item => areItemsInRange(item, start, range()));
    const result = aggregateByTag(items);

    return result;
  });

  const sortedStats = createMemo(() =>
    getSortedEntries(stats().entries, sortBy(), sortOrder())
  );

  // TODO: fix locked td height

  return (
    <div>
      <Toolbar
        selectedDate={selectedDate()}
        statRange={range()}
        setStatRange={setRange}
      />

      <div class="overflow-x-auto">
        <table class="table table-zebra table-statistics">
          <thead>
            <tr class="cursor-pointer">
              <th onClick={() => changeSorting('duration')}>
                Pomodoros
              </th>
              <th onClick={() => changeSorting('duration')}>
                Duration {sortBy() === 'duration' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => changeSorting('tag')}>
                Tag {sortBy() === 'tag' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
              </th>
            </tr>
          </thead>

          <tbody>
            <For each={sortedStats()}>
              {(entry) => <ItemRow {...entry} jiraHost={appStore.jiraHost} />}
            </For>

            <tr>
              <td></td>
              <td><b>{minutesToHoursMinutes(stats().sumAll)}</b></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toolbar(props: {
  selectedDate: Date;
  statRange: StatRange;
  setStatRange: (time: StatRange) => void;
}) {
  const intervals = createMemo(() => ({
    day: props.selectedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
    week: getWeekInterval(props.selectedDate),
    month: props.selectedDate.toLocaleDateString('en-US', { month: 'long' }),
    year: props.selectedDate.toLocaleDateString('en-US', { year: 'numeric' }),
    all: '',
  } satisfies Record<StatRange, string>));

  return (
    <div role="tablist" class="tabs tabs-bordered">
      <a role="tab" class="tab" classList={{ 'tab-active': props.statRange === 'day' }} onClick={() => props.setStatRange('day')}>
        <span class="text-sm mr-1">Day</span>
        <span class="text-xs italic text-gray-500">
          {intervals().day}
        </span>
      </a>
      <a role="tab" class="tab" classList={{ 'tab-active': props.statRange === 'week' }} onClick={() => props.setStatRange('week')}>
        <span class="text-sm mr-1">Week </span>
        <span class="text-xs italic text-gray-500">
          {intervals().week}
        </span>
      </a>
      <a role="tab" class="tab" classList={{ 'tab-active': props.statRange === 'month' }} onClick={() => props.setStatRange('month')}>
        <span class="text-sm mr-1">Month </span>
        <span class="text-xs italic text-gray-500">
          {intervals().month}
        </span>
      </a>
      <a role="tab" class="tab" classList={{ 'tab-active': props.statRange === 'year' }} onClick={() => props.setStatRange('year')}>
        <span class="text-sm mr-1">Year </span>
        <span class="text-xs italic text-gray-500">
          {intervals().year}
        </span>
      </a>
      <a role="tab" class="tab" classList={{ 'tab-active': props.statRange === 'all' }} onClick={() => props.setStatRange('all')}>
        <span class="text-sm">All time</span>
      </a>
    </div>
  );
}

function ItemRow(props: StatEntry & { jiraHost: string }) {
  return (
    <tr>
      <td class="flex gap-1 justify-center">
        <Show when={props.pomodoros > 0}>
          <PomodoroCell tag={props.tag} amount={props.pomodoros} />
        </Show>
      </td>
      <td>
        {minutesToHoursMinutes(props.duration)}
      </td>
      <td>
        <TagView tag={props.tag} jiraHost={props.jiraHost} />
      </td>
    </tr>
  );
}

function PomodoroCell(props: { tag: string, amount: number }) {
  const whole = () => Math.floor(props.amount);
  const rest = () => props.amount - whole();

  return (
    <Switch>
      <Match when={props.tag === 'idle'}>
        <span>🌞 🌴 ⛱️ 🧘‍♀️ 🍹</span>
      </Match>
      <Match when={whole() > 4}>
        <PomodoroIcon /> x{whole()}
      </Match>
      <Match when={whole() <= 4}>
        <For each={Array(whole())}>
          {() => <PomodoroIcon />}
        </For>
        <PomodoroIcon amount={rest()} />
      </Match>
    </Switch>
  )
}

function PomodoroIcon(props: { amount?: number }) {
  const size = 20;

  const amount = () => props.amount ?? 1;
  const width = () => {
    const full = amount() * size;
    const result = full >= 10 ? full : 0;
    return result.toFixed(2);
  }

  return <img
    classList={{ 'grayscale brightness-125': amount() < 1 }}
    width={width()}
    height={size}
    src={pomodoroSvg}
  />;
}

// methods
function TagView(props: { tag: string, jiraHost: string }) {
  const jiraRegex = /(^|\s+)([A-Z][A-Z0-9]+-[0-9]+)/;

  return (
    <span>
      <Show when={props.jiraHost} fallback={props.tag}>
        <For each={props.tag.split(jiraRegex)}>
          {(part) => part.match(jiraRegex)
            ? <a class="link" target="_blank" href={`${props.jiraHost}/browse/${part}`}>{part}</a>
            : part
          }
        </For>
      </Show>
    </span>
  );
}

function getSortedEntries<T extends object>(
  entries: T[],
  sortBy: keyof T,
  sortOrder: 'asc' | 'desc'
): T[] {
  return entries.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortOrder === 'asc'
      ? Number(aVal) - Number(bVal)
      : Number(bVal) - Number(aVal);
  });
}

function aggregateByTag(items: Item[]): StatResult {
  const tags = [...new Set(items.map(item => item.tag))];

  const entries = tags.map(tag => {
    const duration = items
      .filter(item => item.tag === tag)
      .map(item => calculateDuration(item.start, item.end ?? new Date()))
      .reduce((a, b) => a + b, 0);

    return { tag: tag || '*empty*', duration, pomodoros: duration / 30 };
  });

  const sumAll = entries.reduce((sum, entry) => sum + entry.duration, 0);

  return { entries, sumAll };
}

// stat range
function getStartOfStatRange(selectedDate: Date, statRange: StatRange) {
  const from = selectedDate;
  const time = statRange;

  switch (time) {
    case 'day':   return from;
    case 'week':  return getStartOfWeek(from);
    case 'month': return new Date(from.getFullYear(), from.getMonth(), 1);
    case 'year':  return new Date(from.getFullYear(), 0, 1);
    case 'all':   return new Date(0);
    default:      throw new Error(time satisfies never);
  }
}

// TODO: proper check of range with start and end of range
function areItemsInRange(item: Item, target: Date, statRange: StatRange) {
  const itemDate = new Date(item.start);
  itemDate.setHours(0, 0, 0, 0);

  switch (statRange) {
    case 'day':
      return itemDate.toDateString() === target.toDateString();
    case 'week':
      return getStartOfWeek(itemDate).toDateString() === getStartOfWeek(target).toDateString();
    case 'month':
      return itemDate.getFullYear() === target.getFullYear()
          && itemDate.getMonth() === target.getMonth();
    case 'year':
      return itemDate.getFullYear() === target.getFullYear();
    case 'all':
      return true;
    default:
      throw new Error(statRange satisfies never);
  }
}

// helpers
function getStartOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to make Monday the first day
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getWeekInterval(date: Date) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startStr = start.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  const endStr = end.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

  return `${startStr} - ${endStr}`;
}

function minutesToHoursMinutes(minutesAmount: number) {
  const hours = Math.floor(minutesAmount / 60);
  const minutes = minutesAmount % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  return `${minutes} min`;
}
