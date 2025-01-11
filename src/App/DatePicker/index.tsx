import { createMemo } from 'solid-js';
import { toTimestamp } from '../time';
import { useAppContext } from '../store/app';
import { sToolbarLeft } from '../styles';
import { css } from '@linaria/core';

export function DatePicker() {
  const [appStore, setAppStore] = useAppContext();
  const selectedDate = () => appStore.selectedDate;
  const setSelectedDate = (date: Date) => setAppStore('selectedDate', date);
  const now = () => appStore.now;

  const isToday = createMemo(() => selectedDate().toDateString() === new Date().toDateString());

  function moveDate(delta: number) {
    // setSelectedItemId(undefined); // TODO: reset selected item
    const next = new Date(selectedDate());
    next.setDate(next.getDate() + delta);
    setSelectedDate(next);
  }

  return (
    <div class={sCurrentDate}>
      <div class={sToolbarLeft}>
        <button disabled={isToday()} onClick={() => setSelectedDate(new Date())}>Today</button>
        <button onClick={() => moveDate(-1)}>{'<'}</button>
        <input
          type="date"
          value={selectedDate().toISOString().split('T')[0]}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          style={{ width: '110px' }}
        />
        <button disabled={isToday()} onClick={() => moveDate(1)}>{'>'}</button>
        {toTimestamp(now())}
      </div>
    </div>
  );
}

const sCurrentDate = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
`;
