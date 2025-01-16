import superjson from 'superjson';
import { DataStore } from './data';

export async function uploadJson(): Promise<DataStore | undefined> {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.click();

  const data = await new Promise<DataStore | undefined>((resolve, reject) => {
    async function handleChange(e: Event) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = superjson.parse(text) as DataStore;
        resolve(data);
      } catch (error) {
        reject(error);
      } finally {
        input.removeEventListener('change', handleChange);
        input.remove();
      }
    };

    input.addEventListener('change', handleChange);
  });

  return data;
}

export function downloadJson(content: unknown) {
  const { json, meta } = superjson.serialize(content);
  const data = JSON.stringify({ json, meta }, null, 2);

  const filename = `worklog-backup-${new Date().toISOString().split('T')[0]}.json`;
  downloadBlob(data, filename, 'application/json');
}

function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  document.body.appendChild(a);

  a.href = url;
  a.download = filename;
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
