import { css, cx } from '@linaria/core';
import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { sCell, sCellHeader, sRow, sToolbar, sToolbarLeft } from '../styles';
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
  const [appStore] = useAppContext();
  const [dataStore] = useDataContext();
  const now = useNowContext();

  const selectedDate = () => appStore.selectedDate;

  // sorting
  const [sortBy, setSortBy] = createSignal<SortBy>('tag');
  const [sortOrder, setSortOrder] = createSignal<SortOrder>('asc');

  function changeSorting(by: SortBy) {
    if (sortBy() === by) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(by);
      setSortOrder('asc');
    }
  }

  // range
  const [range, setRange] = createSignal<StatRange>('day');
  const startDate = createMemo(() => getStartOfStatRange(selectedDate(), range()));

  // stats
  const stats = createMemo(() => { now(); return aggregateByTag(
    dataStore.items.filter(item => isItemInRange(item, range(), startDate())),
  );});

  const sortedStats = createMemo(() => ({
    entries: getSortedEntries(stats().entries, sortBy(), sortOrder()),
    sumAll: stats().sumAll,
  }));

  return (
    <>
      <Toolbar
        selectedDate={selectedDate()}
        statRange={range()}
        setStatRange={setRange}
      />

      <div class={sTableStats}>
        <div class={sRow}>
        <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('duration')}>
          Pomodoros
        </div>
        <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('duration')}>
          Duration {sortBy() === 'duration' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
        </div>
        <div class={cx(sCell, sCellHeader)} onClick={() => changeSorting('tag')}>
          Tag {sortBy() === 'tag' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
        </div>
      </div>

      <For each={sortedStats().entries}>
        {(entry) => (
          <ItemRow {...entry} />
        )}
      </For>

      <div class={sRow}>
        <div class={cx(sCell)}></div>
        <div class={cx(sCell)}><b>{minutesToHoursMinutes(sortedStats().sumAll)}</b></div>
        <div class={cx(sCell)}></div>
      </div>
    </div>
    </>
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
    <div class={sToolbar}>
      <div class={sToolbarLeft}>
        <label>
          <input type="radio" name="timeRange" value="day"
            onChange={() => props.setStatRange('day')}
            checked={props.statRange === 'day'}
          />
          Day ({intervals().day})
        </label>

        <label>
          <input type="radio" name="timeRange" value="week"
            onChange={() => props.setStatRange('week')}
            checked={props.statRange === 'week'}
          />
          Week ({intervals().week})
        </label>

        <label>
          <input type="radio" name="timeRange" value="month"
            onChange={() => props.setStatRange('month')}
            checked={props.statRange === 'month'}
          />
          Month ({intervals().month})
        </label>

        <label>
          <input type="radio" name="timeRange" value="year"
            onChange={() => props.setStatRange('year')}
            checked={props.statRange === 'year'}
          />
          Year ({intervals().year})
        </label>

        <label>
          <input type="radio" name="timeRange" value="all"
            onChange={() => props.setStatRange('all')}
            checked={props.statRange === 'all'}
          />
          All time
        </label>
      </div>
    </div>
  );
}

function ItemRow(props: StatEntry) {
  const [appStore] = useAppContext();

  return (
    <div class={sRow}>
      <div class={cx(sCell, sCellPomodoro)}>
        <Show when={props.pomodoros > 0}>
          <PomodoroCell tag={props.tag} amount={props.pomodoros} />
        </Show>
      </div>
      <div class={sCell}>{minutesToHoursMinutes(props.duration)}</div>
      <div class={cx(sCell, sCellText)}>
        <TagView tag={props.tag} jiraHost={appStore.jiraHost} />
      </div>
    </div>
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
  const amount = () => props.amount ?? 1;
  const fullWidth = () => amount() * 24;
  const width = () => fullWidth() >= 10 ? fullWidth() : 0;

  return <img
    width={width().toFixed(2)}
    height={24}
    src={pomodoroSvg}
    alt="Pomodoro"
    classList={{ [sPomodoroGrayed]: amount() < 1 }}
  />;
}

// methods
function TagView(props: { tag: string, jiraHost: string }) {
  const jiraRegex = /([A-Z0-9]+-[0-9]+)/;

  return (
    <span>
      <For each={props.tag.split(jiraRegex)}>
        {(part) => part.match(jiraRegex)
          ? <a href={`${props.jiraHost}browse/${part}`}>{part}</a>
          : part
        }
      </For>
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

function isItemInRange(item: Item, statRange: StatRange, target: Date) {
  const itemDate = new Date(item.start);
  itemDate.setHours(0, 0, 0, 0);

  switch (statRange) {
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

// styles
const sTableStats = css`
  display: grid;
  grid-template-columns: 180px 160px auto;
`;

const sCellText = css`
  justify-content: flex-start;
`;

const sCellPomodoro = css`
  display: flex;
  gap: 5px;
`;

const sPomodoroGrayed = css`
  filter: grayscale(100%) brightness(120%);
`;
