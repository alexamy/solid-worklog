import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';
import { sCell, sCellHeader, sRow, sToolbar, sToolbarLeft, sToolbarRight } from '../styles';
import { toTimestamp } from '../time';
import { css, cx } from '@linaria/core';
import { Portal } from 'solid-js/web';
import createFuzzySearch from '@nozbe/microfuzz';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { calculateDuration } from '../time';
import { produce } from 'solid-js/store';
import { useNowContext } from '../store/now';

export function Worklog() {
  const [appStore] = useAppContext();
  const [dataStore, setDataStore] = useDataContext();
  const now = useNowContext();

  const selectedDate = () => appStore.selectedDate;

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
  createEffect(on(selectedDate, () => setSelectedItemId(undefined)));

  const itemsAtDate = createMemo(() => dataStore.items.filter(item => item.start.toDateString() === selectedDate().toDateString()));

  function updateItem(item: Partial<Item>, id: string) {
    setDataStore('items', item => item.id === id, item);
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
    <>
      <Toolbar selectedItemId={selectedItemId()} setSelectedItemId={setSelectedItemId} />

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
    </>
  );
}

function Toolbar(props: {
  selectedItemId: string | undefined,
  setSelectedItemId: (id: string | undefined) => void,
}) {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore] = useDataContext();

  const selectedDate = () => appStore.selectedDate;
  const setSelectedDate = (date: Date) => setAppStore('selectedDate', date);

  const selectedItemId = () => props.selectedItemId;
  const setSelectedItemId = (id: string | undefined) => props.setSelectedItemId(id);

  const isInProgress = createMemo(() => dataStore.items[0].end === undefined);

  return (
    <div class={sToolbar}>
      <ToolbarWorklog
        isInProgress={isInProgress()}
        setSelectedDate={setSelectedDate}
      />
      <Show when={!isInProgress()}>
        <ToolbarTable
          selectedDate={selectedDate()}
          selectedItemId={selectedItemId()}
          setSelectedItemId={setSelectedItemId}
        />
      </Show>
    </div>
  );
}

function ToolbarWorklog(props: {
  isInProgress: boolean,
  setSelectedDate: (date: Date) => void,
}) {
  const [dataStore, setDataStore] = useDataContext();
  const setSelectedDate = (date: Date) => props.setSelectedDate(date);

  // TODO: merge with other toolbar
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

  return (
    <div class={sToolbarLeft}>
      <button disabled={props.isInProgress} onClick={() => startItem()}>Start</button>
      <button disabled={!props.isInProgress} onClick={() => finishItem()}>Finish</button>
      <button disabled={!props.isInProgress} onClick={() => tapItem()}>Tap</button>
    </div>
  );
}

function ToolbarTable(props: {
  selectedDate: Date,
  selectedItemId: string | undefined,
  setSelectedItemId: (id: string | undefined) => void,
}) {
  const [dataStore, setDataStore] = useDataContext();

  const selectedDate = () => props.selectedDate;
  const selectedItemId = () => props.selectedItemId;
  const setSelectedItemId = (id: string | undefined) => props.setSelectedItemId(id);

  // TODO: merge with other toolbar
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

  function addItem() {
    createItem({
      start: new Date(selectedDate().setHours(12, 0, 0, 0)),
      end: new Date(selectedDate().setHours(12, 5, 0, 0)),
    });
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

  return (
    <div class={sToolbarRight}>
      <button onClick={() => addItem()}>+</button>
      <button disabled={!selectedItemId()} onClick={() => moveUp()}>↑</button>
      <button disabled={!selectedItemId()} onClick={() => moveDown()}>↓</button>
      <button disabled={!selectedItemId() || dataStore.items.length <= 1} onClick={() => removeItem()}>-</button>
    </div>
  );
}

// methods
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

function randomId() {
  return Math.random().toString(16).substring(2, 8);
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
