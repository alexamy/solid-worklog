import superjson from 'superjson';
import { DataStore, getDefaultDataStore } from '../store/data';
import { sToolbar, sToolbarLeft } from '../styles';
import { useDataContext } from '../store/data';
import { persistData } from './persistence';

export function Utilities() {
  const [dataStore, setDataStore] = useDataContext();

  // TODO: move to app, now there because reset is used in this component
  const persist = persistData(dataStore, setDataStore, getDefaultDataStore);

  async function uploadStore() {
    const data = await uploadJson();
    if (data) setDataStore(data);
  }

  return (
    <div class={sToolbar}>
      <div class={sToolbarLeft}>
        <button onClick={() => downloadJson(dataStore)}>Save backup</button>
        <button onClick={uploadStore}>Load backup</button>
        <button onDblClick={persist.reset}>Reset (double click)</button>
      </div>
    </div>
  )
}

async function uploadJson(): Promise<DataStore | undefined> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.click();

  return new Promise((resolve, reject) => {
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = superjson.parse(text) as DataStore;
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
  });
}

function downloadJson(content: unknown) {
  const { json, meta } = superjson.serialize(content);
  const data = JSON.stringify({ json, meta }, null, 2);
  const filename = `worklog-backup-${new Date().toISOString().split('T')[0]}.json`;
  downloadBlob(data, filename, 'application/json');
}

function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
