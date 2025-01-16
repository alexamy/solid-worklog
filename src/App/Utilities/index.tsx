import { useDataContext } from '../store/data';

export function Utilities() {
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
