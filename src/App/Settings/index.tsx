import { useAppContext } from '../store/app';
import { sToolbar } from '../styles';

export function Settings() {
  const [appStore, setAppStore] = useAppContext();

  function setJiraHost(value: string) {
    const host = value.endsWith('/') ? value : value + '/';
    setAppStore('jiraHost', host);
  }

  return (
    <div class={sToolbar}>
      <input
        type="text"
        placeholder="Jira host"
        aria-label="Jira host"
        style={{ padding: '4px 8px' }}
        size={60}
        value={appStore.jiraHost}
        onInput={(e) => setJiraHost(e.target.value)}
      />
    </div>
  )
}
