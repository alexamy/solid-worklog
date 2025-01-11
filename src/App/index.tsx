import { css, cx } from '@linaria/core';
import createFuzzySearch from '@nozbe/microfuzz';
import { createEffect, createMemo, createSignal, For, onCleanup, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { Portal } from 'solid-js/web';
import { Statistics } from './Statistics';
import { AppContext, getDefaultAppStore } from './store/app';
import { DataContext, getDefaultDataStore, Item } from './store/data';
import { DatePicker } from './DatePicker';
import { sCell, sCellHeader, sRow } from './styles';
import { Utilities } from './Utilities';
import { persistObject } from './store/persistence';
import { NowContext } from './store/now';

// component
export function App() {
  const [appStore, setAppStore] = createStore(getDefaultAppStore());
  const [dataStore, setDataStore] = createStore(getDefaultDataStore());

  const persistApp = persistObject(
    appStore,
    setAppStore,
    getDefaultAppStore,
    'solid-worklog-app',
  );

  const persistData = persistObject(
    dataStore,
    setDataStore,
    getDefaultDataStore,
    'solid-worklog-store',
  );

  // update now timestamp every 30 seconds
  createEffect(() => {
    const intervalId = setInterval(() => setAppStore('now', new Date()), 30000);
    onCleanup(() => clearInterval(intervalId));
  });

  // store
  const selectedDate = () => appStore.selectedDate;
  const setSelectedDate = (date: Date) => setAppStore('selectedDate', date);
  const now = () => appStore.now;

  // tags and fuzzy search
  const allTags = createMemo(() => {
    const tags = dataStore.items.map(item => item.tag);
    const uniqueTags = [...new Set(tags)];
    return uniqueTags;
  });

  const fuzzySearch = createMemo(() => createFuzzySearch(allTags()));
  const [availableTags, setAvailableTags] = createSignal<string[]>([]);

  function updateAvailableTags(query: string) {
    const results = fuzzySearch()(query);
    setAvailableTags(results.map(result => result.item));
  }

  let tagListElement!: HTMLDivElement;
  onMount(() => {
    tagListElement.style.display = 'none';
  });

  function positionTagList(e: MouseEvent & { currentTarget: HTMLDivElement }) {
    const rect = e.currentTarget.getBoundingClientRect();
    tagListElement.style.left = `${rect.left}px`;
    tagListElement.style.top = `${rect.top + rect.height - 1}px`;
    tagListElement.style.width = `${rect.width}px`;
  }

  function toggleTagList(type?: 'show' | 'hide') {
    if (type === 'show') {
      tagListElement.style.display = 'block';
    } else if (type === 'hide') {
      tagListElement.style.display = 'none';
    } else {
      tagListElement.style.display = tagListElement.style.display === 'block' ? 'none' : 'block';
    }
  }

  createEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      if (!target.dataset.tag || target.dataset.itemId !== selectedItemId()) {
        toggleTagList('hide');
      }
    }

    document.body.addEventListener('click', onClick);
    onCleanup(() => document.body.removeEventListener('click', onClick));
  });

  // worklog table data
  const [selectedItemId, setSelectedItemId] = createSignal<string | undefined>(undefined);
  const isInProgress = createMemo(() => dataStore.items[0].end === undefined);
  const itemsAtDate = createMemo(() => dataStore.items.filter(item => item.start.toDateString() === selectedDate().toDateString()));

  function createItem(item: Partial<Item>) {
    setDataStore('items', (items) => [{
      id: randomId(),
      description: '',
      tag: '',
      start: new Date(),
      end: undefined,
      ...item,
    }, ...items]);
  }

  function updateItem(item: Partial<Item>, id: string) {
    setDataStore('items', item => item.id === id, item);
  }

  function addItem() {
    createItem({
      start: new Date(selectedDate().setHours(12, 0, 0, 0)),
      end: new Date(selectedDate().setHours(12, 5, 0, 0)),
    });
  }

  function startItem(item: Partial<Item> = {}) {
    const now = new Date();
    setSelectedDate(now);

    const lastItem = dataStore.items[0];
    if(!lastItem || !lastItem.end) {
      throw new Error('No last item or end time');
    }

    // if from last item the time is between 20 minutes and 2 hours, then add entry with idle tag
    const duration = calculateDuration(lastItem.end, now);
    if(duration >= 20 && duration <= 2 * 60) {
      createItem({
        start: lastItem.end,
        end: new Date(),
        tag: 'idle',
      });
    }

    // start new item
    createItem({
      start: new Date(),
      end: undefined,
      ...item,
    });
  }

  function finishItem() {
    setDataStore('items', 0, {
      end: new Date(),
    });
  }

  function tapItem() {
    finishItem();
    startItem();
  }

  function removeItem() {
    const selected = selectedItemId()!;

    // select next item
    const index = dataStore.items.findIndex(item => item.id === selected);
    if(index >= 0) {
      const item = dataStore.items[index + 1];
      setSelectedItemId(item?.id);
    }

    // remove item
    const filtered = dataStore.items.filter(item => item.id !== selected);
    if(filtered.length > 0) {
      setDataStore('items', filtered);
    }
  }

  function moveUp() {
    setDataStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selectedItemId());
      if (index > 0) {
        [items[index], items[index - 1]] = [items[index - 1], items[index]];
      }
    }));
  }

  function moveDown() {
    setDataStore('items', produce((items) => {
      const index = items.findIndex(item => item.id === selectedItemId());
      if (index < items.length - 1) {
        [items[index], items[index + 1]] = [items[index + 1], items[index]];
      }
    }));
  }

  function onCellKeyDown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
    }
  }

  function onTagCellKeyDown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
      toggleTagList('hide');
    }
  }

  function onTagCellKeyUp(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
    if (e.key === 'Enter') return;
    updateAvailableTags(e.currentTarget.textContent!);
    toggleTagList('show');
  }

  return (
    <NowContext.Provider value={now}>
      <AppContext.Provider value={[appStore, setAppStore]}>
        <DataContext.Provider value={[dataStore, setDataStore]}>
          <div class={sApp}>
            <Portal>
              <div ref={tagListElement} class={sTagList}>
                <For each={availableTags()}>
                  {(tag) =>
                    <div class={sTag} onClick={() => updateItem({ tag }, selectedItemId()!)}>
                      {tag}
                    </div>
                  }
                </For>
              </div>
            </Portal>

            <DatePicker />

            Worklog
            <div class={sToolbar}>
              <div class={sToolbarLeft}>
                <button disabled={isInProgress()} onClick={() => startItem()}>Start</button>
                <button disabled={!isInProgress()} onClick={() => finishItem()}>Finish</button>
                <button disabled={!isInProgress()} onClick={() => tapItem()}>Tap</button>
              </div>
              <div class={sToolbarRight}>
                Rows:
                <button disabled={isInProgress()} onClick={() => addItem()}>+</button>
                <button disabled={isInProgress() || !selectedItemId()} onClick={() => moveUp()}>↑</button>
                <button disabled={isInProgress() || !selectedItemId()} onClick={() => moveDown()}>↓</button>
                <button disabled={isInProgress() || !selectedItemId() || dataStore.items.length <= 1} onClick={() => removeItem()}>-</button>
              </div>
            </div>


            <div class={sTable}>
              <div class={sRow} onClick={() => setSelectedItemId(undefined)}>
                <div class={cx(sCell, sCellHeader, sCellSpan3)}>Duration</div>
                <div class={cx(sCell, sCellHeader)}>Tag</div>
                <div class={cx(sCell, sCellHeader)}>Description</div>
              </div>
              <For each={itemsAtDate()}>
                {(item) => (
                  <div class={cx(sRow)}
                    classList={{
                      [sRowSelected]: selectedItemId() === item.id,
                      [sRowIdle]: item.tag === 'idle',
                    }}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <div
                      class={cx(sCell, sCellEditable)}
                      contentEditable
                      onBlur={(e) => updateItem({ start: updateTimestamp(item.start, e.currentTarget.textContent!) }, item.id)}
                      onKeyDown={(e) => onCellKeyDown(e)}
                    >
                      {toTimestamp(item.start)}
                    </div>
                    <div class={sCell}>
                      {calculateDuration(item.start, item.end ?? now())}
                    </div>
                    <div
                      class={cx(sCell, sCellEditable)}
                      classList={{ [sCellGrayed]: !item.end }}
                      contentEditable={Boolean(item.end)}
                      onBlur={(e) => updateItem({ end: updateTimestamp(item.end!, e.currentTarget.textContent!) }, item.id)}
                      onKeyDown={(e) => onCellKeyDown(e)}
                    >
                      {toTimestamp(item.end ?? now())}
                    </div>
                    <div
                      data-item-id={item.id}
                      data-tag={true}
                      class={cx(sCell, sCellEditable, sCellEditableText)}
                      contentEditable
                      onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                      onClick={(e) => positionTagList(e)}
                      onKeyDown={(e) => onTagCellKeyDown(e)}
                      onKeyUp={(e) => onTagCellKeyUp(e)}
                    >
                      {item.tag}
                    </div>
                    <div
                      class={cx(sCell, sCellEditable, sCellEditableText)}
                      contentEditable
                      onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
                      onKeyDown={(e) => onCellKeyDown(e)}
                    >
                      {item.description}
                    </div>
                  </div>
                )}
              </For>
            </div>

            <br />
            Statistics
            <Statistics />

            <br />
            Utilities
            <Utilities reset={persistData.reset} />
          </div>
        </DataContext.Provider>
      </AppContext.Provider>
    </NowContext.Provider>
  )
}

function updateTimestamp(date: Date, timestamp: string) {
  const [hours, minutes] = timestamp.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return date;
  }

  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0);

  if (isNaN(newDate.getTime())) {
    return date;
  }

  return newDate;
}

// methods
function randomId() {
  return Math.random().toString(16).substring(2, 8);
}

function toTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function calculateDuration(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60));
}

function triggerNonDestructiveBlur(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
  const selection = window.getSelection();
  const offset = selection?.focusOffset || 0;

  e.preventDefault();
  e.currentTarget.blur();
  e.currentTarget.focus();

  const range = document.createRange();
  const textNode = e.currentTarget.firstChild || e.currentTarget;
  range.setStart(textNode, offset);
  range.setEnd(textNode, offset);

  selection?.removeAllRanges();
  selection?.addRange(range);
}

// styles
const sApp = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 500px;
`;

// toolbar
const sToolbar = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
`;

const sToolbarLeft = css`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const sToolbarRight = css`
  display: flex;
  gap: 10px;
  align-items: center;
`;



const sTable = css`
  display: grid;
  grid-template-columns: auto auto auto auto auto;
`;

const sRowSelected = css`
  background-color: #161616;
`;

const sRowIdle = css`
  color: #999;
`;

const sCellSpan3 = css`
  grid-column: span 3;
`;

const sCellEditable = css`
  cursor: text;
`;

const sCellEditableText = css`
  min-width: 120px;
  justify-content: flex-start;
`;

const sCellGrayed = css`
  color: #555;
  font-style: italic;
`;

const sTagList = css`
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
`;

const sTag = css`
  padding: 5px 10px;
  background-color: #333;
  color: #fff;
  cursor: pointer;
`;
