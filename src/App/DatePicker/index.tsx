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
        class="w-32"
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
  );
}

// styles
const sCurrentDate = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
`;

const sLamp = css`
  width: 8px;
  height: 8px;
  background-color: #c23616;
  border-radius: 50%;
  box-shadow: 0 0 8px #c23616;
  animation: lamp-fade 2s 1 ease-in-out;
  animation-fill-mode: forwards;
`;
