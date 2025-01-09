import { createStore } from 'solid-js/store'
import { For } from 'solid-js';

export function App() {
  const [store, setStore] = createStore({
    items: [{
      id: 1,
      description: 'dinner',
      tag: 'idle',
      start: new Date(2025, 0, 1, 17, 20, 0),
      end: new Date(2025, 0, 1, 18, 25, 0),
    }]
  });

  return (
    <div>
      <For each={store.items}>
        {(item) => (
          <div>
            <div>{item.start.toLocaleString()}</div>
            <div>{item.end.toLocaleString()}</div>
            <div>{item.description}</div>
            <div>{item.tag}</div>
          </div>
        )}
      </For>
    </div>
  )
}
