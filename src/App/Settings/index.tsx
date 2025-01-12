import { css } from '@linaria/core';
import { useAppContext } from '../store/app';
import { sToolbar } from '../styles';

export function Settings() {
  const [appStore, setAppStore] = useAppContext();

  function setJiraHost(text: string) {
    const value = text.trim().replace(/\/+$/, '');
    setAppStore('jiraHost', value);
  }

  return (
    <div class={sToolbar}>
      <div class={sInput}>
        <label for="jira-host">
          Jira host
        </label>
        <input
          id="jira-host"
          type="text"
          placeholder="Jira host"
          aria-label="Jira host"
          size={60}
          value={appStore.jiraHost}
          // @ts-expect-error TODO: fix lib types (should be Solid JSX, not native HTML)
          onInput={(e) => setJiraHost(e.target.value)}
        />
      </div>
    </div>
  )
}

const sInput = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
