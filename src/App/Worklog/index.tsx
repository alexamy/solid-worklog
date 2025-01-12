import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js';
import { sCell, sCellHeader, sRow, sToolbar, sToolbarLeft, sToolbarRight } from '../styles';
import { toTimestamp } from '../time';
import { css, cx } from '@linaria/core';
import { Portal } from 'solid-js/web';
import createFuzzySearch from '@nozbe/microfuzz';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { calculateDuration } from '../time';
import { useNowContext } from '../store/now';

export function Worklog() {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore, setDataStore, { isInProgress }] = useDataContext();
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
      <div class={sToolbar}>
        <ToolbarWorklog
          isInProgress={isInProgress()}
          setSelectedDate={(date) => setAppStore('selectedDate', date)}
        />
        <Show when={!isInProgress()}>
          <ToolbarTable
            selectedDate={appStore.selectedDate}
            selectedItemId={selectedItemId()}
            setSelectedItemId={(id) => setSelectedItemId(id)}
          />
        </Show>
      </div>

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

function ToolbarWorklog(props: {
  isInProgress: boolean,
  setSelectedDate: (date: Date) => void,
}) {
  const [_1, _2, {
    startItem,
    finishItem,
    tapItem,
  }] = useDataContext();

  function start() {
    startItem();
    props.setSelectedDate(new Date()); // TODO: add app store methods
  }

  return (
    <div class={sToolbarLeft}>
      <button disabled={props.isInProgress} onClick={() => start()}>Start</button>
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
  const [dataStore, _, {
    addItem,
    removeItem,
    moveUp,
    moveDown,
  }] = useDataContext();

  const onlyOneItem = () => dataStore.items.length === 1;

  return (
    <div class={sToolbarRight}>
      <button
        disabled={!props.selectedItemId}
        onClick={() => addItem(props.selectedDate)}
      >+</button>
      <button
        disabled={!props.selectedItemId}
        onClick={() => moveUp(props.selectedItemId!)}
      >↑</button>
      <button
        disabled={!props.selectedItemId}
        onClick={() => moveDown(props.selectedItemId!)}
      >↓</button>
      <button
        disabled={!props.selectedItemId || onlyOneItem()}
        onClick={() => removeItem(props.selectedItemId!, props.setSelectedItemId)}
      >-</button>
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
