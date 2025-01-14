import { createEffect, createMemo, createSignal, Show } from 'solid-js';
import { toTimestamp } from '../time';
import { useAppContext } from '../store/app';
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
        {/* <Show when={isInProgress()}>
          <div class='w-[8px] h-[8px] rounded-full bg-red-600 shadow shadow-red-600' />
        </Show> */}
      </div>
      <div class='flex items-center justify-end gap-3'>
        <Cog selected={false} onClick={() => {}} />
        <ThemeController />
      </div>
    </div>
  );
}

function ThemeController() {
  const [appStore, setAppStore] = useAppContext();
  const [checked, setChecked] = createSignal(false);

  createEffect(() => {
    document.documentElement.setAttribute('data-theme', appStore.theme);
    setChecked(appStore.theme === 'dark');
  });

  function onThemeChange() {
    setChecked(!checked());
    setAppStore('theme', checked() ? 'dark' : 'light');
  }

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
      <input
        class="toggle theme-controller"
        type="checkbox"
        value="dark"
        checked={checked()}
        onChange={onThemeChange}
      />
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

function Cog(props: {
  selected: boolean,
  onClick: () => void,
}) {
  return (
    <svg
      class="size-6 translate-y-[-1px] mr-2 cursor-pointer"
      classList={{
        'hover:stroke-gray-200': !props.selected,
        'stroke-gray-200': props.selected,
      }}
      onClick={() => props.onClick()}
      xmlns="http://www.w3.org/2000/svg"
      fill="none" viewBox="0 0 24 24"
      stroke-width={1.5}
      stroke="currentColor"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
