import { createEffect, createMemo, createSignal, on, Show } from 'solid-js';
import { toTimestamp } from '../time';
import { useAppContext } from '../store/app';
import { sToolbarLeft } from '../styles';
import { css } from '@linaria/core';
import { useNowContext } from '../store/now';
import { useDataContext } from '../store/data';

export function DatePicker() {
  const [appStore, setAppStore] = useAppContext();
  const [_1, _2, { isInProgress }] = useDataContext();
  const now = useNowContext();

  const selectedDate = () => appStore.selectedDate;
  const setSelectedDate = (date: Date) => setAppStore('selectedDate', date);

  const isToday = createMemo(() => selectedDate().toDateString() === new Date().toDateString());
  const dayOfWeek = () => selectedDate().toLocaleDateString(undefined, { weekday: 'long' });

  function moveDate(delta: number) {
    const next = new Date(selectedDate());
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
  }

  return (
    <div class='flex items-center justify-between'>
      <div class='flex items-center justify-start gap-3'>
        <button
          class="btn btn-xs btn-neutral"
          disabled={isToday()}
          onClick={() => setSelectedDate(new Date())}
        >Today</button>
        <button
          class="btn btn-xs btn-neutral"
          onClick={() => moveDate(-1)}
        >{'<'}</button>
        <input
          class="w-auto px-2 py-1"
          type="date"
          // FIX: iso string is not a local date string
          value={selectedDate().toISOString().split('T')[0]}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
        />
        <button
          class="btn btn-xs btn-neutral"
          disabled={isToday()}
          onClick={() => moveDate(1)}
        >{'>'}</button>
        {dayOfWeek()}
        {', '}
        {toTimestamp(now())}
        <Show when={isInProgress()}>
          <div class={sLamp} />
        </Show>
      </div>
      <div class='flex items-center justify-end gap-3'>
        <ThemeController />
      </div>
    </div>
  );
}

function ThemeController() {
  return (
    <label class="flex cursor-pointer gap-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path
          d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
      </svg>
      <input type="checkbox" value="dark" class="toggle theme-controller" />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    </label>
  );
}

// styles
const sLamp = css`
  width: 8px;
  height: 8px;
  background-color: #c23616;
  border-radius: 50%;
  box-shadow: 0 0 8px #c23616;
  animation: lamp-fade 2s 1 ease-in-out;
  animation-fill-mode: forwards;
`;
