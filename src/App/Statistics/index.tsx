import { createMemo, createSignal, For, Match, Show, Switch } from 'solid-js';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { sCell, sCellHeader, sRow, sToolbar, sToolbarLeft } from '../styles';
import pomodoroSvg from './pomodoro.svg';
import { css, cx } from '@linaria/core';
import { calculateDuration } from '../time';

type StatTime = 'day' | 'week' | 'month' | 'year' | 'all';
type SortBy = 'tag' | 'duration' | 'pomodoros';
type SortOrder = 'asc' | 'desc';

export function Statistics() {
  const [appStore] = useAppContext();
  const [dataStore] = useDataContext();
  const selectedDate = () => appStore.selectedDate;

  const [statTime, setStatTime] = createSignal<StatTime>('day');

  const statTimeStartDate = createMemo(() => {
    const from = selectedDate();
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

  return (
    <>
      <Toolbar
        selectedDate={selectedDate()}
        statTime={statTime()}
        setStatTime={setStatTime}
      />

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
    </>
  );
}

function Toolbar(props: {
  selectedDate: Date;
  statTime: StatTime;
  setStatTime: (time: StatTime) => void;
}) {
  return (
    <div class={sToolbar}>
      <div class={sToolbarLeft}>
        <label>
          <input type="radio" name="timeRange" value="day"
            onChange={() => props.setStatTime('day')}
            checked={props.statTime === 'day'}
          />
          Day ({props.selectedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })})
        </label>

        <label>
          <input type="radio" name="timeRange" value="week"
            onChange={() => props.setStatTime('week')}
            checked={props.statTime === 'week'}
          />
          Week ({getWeekInterval(props.selectedDate)})
        </label>

        <label>
          <input type="radio" name="timeRange" value="month"
            onChange={() => props.setStatTime('month')}
            checked={props.statTime === 'month'}
          />
          Month ({props.selectedDate.toLocaleDateString('en-US', { month: 'long' })})
        </label>

        <label>
          <input type="radio" name="timeRange" value="year"
            onChange={() => props.setStatTime('year')}
            checked={props.statTime === 'year'}
          />
          Year ({props.selectedDate.toLocaleDateString('en-US', { year: 'numeric' })})
        </label>

        <label>
          <input type="radio" name="timeRange" value="all"
            onChange={() => props.setStatTime('all')}
            checked={props.statTime === 'all'}
          />
          All time
        </label>
      </div>
    </div>
  );
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
  grid-template-columns: auto auto auto;
`;

const sCellPomodoro = css`
  display: flex;
  gap: 5px;
`;

const sPomodoroGrayed = css`
  filter: grayscale(100%) brightness(120%);
`;
