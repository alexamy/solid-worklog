import { createEffect, createMemo, createSignal } from 'solid-js';
import { toTimestamp } from '../time';
import { useAppContext } from '../store/app';
import { useNowContext } from '../store/now';
import { useDataContext } from '../store/data';

export function DatePicker() {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore, _2, { downloadDataStore }] = useDataContext();
  const now = useNowContext();

  const isToday = createMemo(() => appStore.selectedDate.toDateString() === new Date().toDateString());
  const dayOfWeek = () => new Date().toLocaleDateString(undefined, { weekday: 'long' });

  const uniqueDates = createMemo(() => new Set([
    ...dataStore.items.map(date => date.start.toLocaleDateString('en-CA')),
    new Date().toLocaleDateString('en-CA'),
  ]));

  const uniqueDatesArray = createMemo(() => Array.from(uniqueDates()).sort());
  const selectedDateIndex = createMemo(() =>
    uniqueDatesArray().indexOf(appStore.selectedDate.toLocaleDateString('en-CA'))
  );

  const prevDisabled = () => appStore.skipEmptyDays && selectedDateIndex() === 0;
  const nextDisabled = () => isToday() || (appStore.skipEmptyDays && selectedDateIndex() === uniqueDatesArray().length - 1);

  function moveDate(delta: number) {
    if(appStore.skipEmptyDays) {
      const next = uniqueDatesArray()[selectedDateIndex() + delta];
      if(next) {
        setAppStore('selectedDate', new Date(next));
      }
    } else {
      const next = new Date(appStore.selectedDate);
      next.setDate(next.getDate() + delta);
      setAppStore('selectedDate', next);
    }
  }

  function toggleSettings() {
    setAppStore(
      'currentTab',
      appStore.currentTab === 'settings' ? 'worklog' : 'settings',
    );
  }

  return (
    <div class='flex items-center justify-between'>
      <div class='flex items-center justify-start gap-3'>
        <button
          class="btn btn-xs btn-neutral"
          disabled={isToday()}
          onClick={() => setAppStore('selectedDate', new Date())}
        >Today</button>
        <button
          class="btn btn-xs btn-neutral"
          disabled={prevDisabled()}
          onClick={() => moveDate(-1)}
        >{'<'}</button>
        <input
          disabled={appStore.skipEmptyDays}
          class="w-auto px-2 py-1"
          type="date"
          value={appStore.selectedDate.toLocaleDateString('en-CA')}
          max={new Date().toLocaleDateString('en-CA')}
          onChange={(e) => setAppStore('selectedDate', new Date(e.target.value))}
        />
        <button
          class="btn btn-xs btn-neutral"
          disabled={nextDisabled()}
          onClick={() => moveDate(1)}
        >{'>'}</button>
        {dayOfWeek()}
        {', '}
        {toTimestamp(now())}
      </div>
      <div class='flex items-center justify-end gap-3'>
        <div class='flex items-center justify-center gap-2 translate-y-[-2px]'>
          <DownloadButton
            onClick={downloadDataStore}
          />
          <SettingsButton
            selected={appStore.currentTab === 'settings'}
            onClick={toggleSettings}
          />
          <ThemeController />
        </div>
      </div>
    </div>
  );
}

function ThemeController() {
  const [appStore, setAppStore] = useAppContext();
  const [checked, setChecked] = createSignal(false);

  const LIGHT_THEME = 'light';
  const DARK_THEME = 'dark';

  createEffect(() => {
    document.documentElement.setAttribute('data-theme', appStore.theme);
    setChecked(appStore.theme === DARK_THEME);
  });

  function onThemeChange() {
    setChecked(!checked());
    setAppStore('theme', checked() ? DARK_THEME : LIGHT_THEME);
  }

  return (
    <label class="swap swap-rotate">
      <input type="checkbox" checked={!checked()} onChange={onThemeChange} />
      <svg
        class="size-6 swap-on fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24">
        <path
          d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
      </svg>
      <svg
        class="size-6 swap-off fill-current"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24">
        <path
          d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
      </svg>
    </label>
  );
}

function DownloadButton(props: { onClick: () => void }) {
  return (
    <svg
      aria-label="Download backup"
      class='size-6 stroke-gray-600 hover:stroke-gray-400 dark:hover:stroke-gray-300 cursor-pointer'
      onClick={() => props.onClick()}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"

    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function SettingsButton(props: {
  selected: boolean,
  onClick: () => void,
}) {
  return (
    <svg
      aria-label="Settings"
      class="size-6 cursor-pointer"
      classList={{
        'hover:stroke-gray-400 dark:hover:stroke-gray-300 stroke-gray-600': !props.selected,
        'hover:stroke-gray-400 stroke-primary': props.selected,
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
