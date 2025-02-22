import { createMemo, For } from 'solid-js';
import { useAppContext } from '../store/app';
import { useDataContext } from '../store/data';

export function Settings() {
  return (
    <div class="flex flex-col gap-8">
      <SettingsForm />
      <Utilities />
      <TagList />
    </div>
  )
}

function SettingsForm() {
  const [appStore, setAppStore] = useAppContext();

  function setJiraHost(text: string) {
    const value = text.trim().replace(/\/+$/, '');
    setAppStore('jiraHost', value);
  }

  return (
    <div class='flex flex-col gap-4'>
      <div class="form-control w-fit">
        <label class="label cursor-pointer p-0">
          <input
            class="checkbox mr-2"
            id="skip-empty-days"
            type="checkbox"
            aria-label="Skip empty days"
            checked={appStore.skipEmptyDays}
            onInput={(e) => setAppStore('skipEmptyDays', e.target.checked)}
          />
          <span class="label-text"> Skip empty days in date picker</span>
        </label>
      </div>

      <label class="form-control w-full max-w-md">
        <div class="label">
          <span class="label-text">Jira host</span>
        </div>
        <input
          class="input input-bordered w-full max-w-md text-sm"
          id="jira-host"
          type="text"
          aria-label="Jira host"
          size={60}
          value={appStore.jiraHost}
          onInput={(e) => setJiraHost(e.target.value)}
        />
      </label>
    </div>
  );
}

function Utilities() {
  const [_1, _2, {
    resetToDefault,
    resetEmpty,
    downloadDataStore,
    uploadDataStore,
  }] = useDataContext();

  return (
    <div class='flex items-center justify-between mb-2'>
      <div class='flex align-center justify-start gap-3'>
        <button class="btn btn-sm btn-neutral" onClick={downloadDataStore}>Save backup</button>
        <button class="btn btn-sm btn-neutral" onClick={uploadDataStore}>Load backup</button>
      </div>
      <div class='flex align-center items-center gap-3'>
        <button class="btn btn-sm btn-outline btn-warning" onDblClick={() => resetEmpty()}>Remove all</button>
        <button class="btn btn-sm btn-outline btn-warning" onDblClick={() => resetToDefault()}>Reset data</button>
      </div>
    </div>
  )
}

function TagList() {
  const [dataStore, setDataStore] = useDataContext();
  const uniqueTags = createMemo(() => {
    const set = new Set(dataStore.items.map(item => item.tag));
    set.delete('');

    const sorted = [...set].sort((a, b) => a.localeCompare(b));
    return sorted;
  });

  function onKeyUp(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if(e.key === 'Enter') {
      e.preventDefault();
      const oldValue = e.currentTarget.dataset.tag;
      const newValue = e.currentTarget.value;

      setDataStore('items', item => item.tag === oldValue, 'tag', newValue);
      e.currentTarget.dataset.tag = newValue;
    }
  }

  return (
    <div class="flex flex-col gap-1">
      <h1 class="text-lg font-bold">Tag List</h1>
      <For each={uniqueTags()}>
        {(tag) =>
          <input
            class="input input-bordered rounded-none w-full max-w-md h-fit text-sm p-2 focus:outline-offset-0"
            type="text"
            id="tag"
            aria-label="Tag"
            size={60}
            data-tag={tag}
            value={tag}
            onKeyUp={(e) => onKeyUp(e)}
          />
        }
      </For>
    </div>
  )
}
