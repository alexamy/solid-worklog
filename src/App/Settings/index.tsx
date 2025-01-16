import { useAppContext } from '../store/app';

export function Settings() {
  const [appStore, setAppStore] = useAppContext();

  function setJiraHost(text: string) {
    const value = text.trim().replace(/\/+$/, '');
    setAppStore('jiraHost', value);
  }

  return (
    <div>
      <div class='flex flex-col gap-4'>
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
            <span class="label-text"> Skip empty days</span>
          </label>
        </div>
      </div>
    </div>
  )
}
