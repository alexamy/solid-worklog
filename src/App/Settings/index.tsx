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
    <div>
      <div class={sToolbar}>
        <div class={sInput}>
          <label class="form-control w-full max-w-md">
            <div class="label">
              <span class="label-text">Jira host</span>
            </div>
            <input
              class="input input-bordered w-full max-w-md"
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

const sInput = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
