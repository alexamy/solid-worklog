import { useAppContext } from '../store/app';

export function Settings() {
  const [appStore, setAppStore] = useAppContext();

  function setJiraHost(text: string) {
    const value = text.trim().replace(/\/+$/, '');
    setAppStore('jiraHost', value);
  }

  return (
    <div>
      <div class='flex align-center justify-start gap-3'>
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
        </div>
      </div>
    </div>
  )
}
