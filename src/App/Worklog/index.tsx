import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { sCell, sCellHeader, sRow, sToolbarLeft, sToolbarRight } from '../styles';
import { toTimestamp } from '../time';
import { css, cx } from '@linaria/core';
import { Portal } from 'solid-js/web';
import createFuzzySearch from '@nozbe/microfuzz';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { calculateDuration } from '../time';
import { useNowContext } from '../store/now';

type MouseEventTarget = MouseEvent & { currentTarget: HTMLElement };
type KeyboardEventTarget = KeyboardEvent & { currentTarget: HTMLElement };

export function Worklog() {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore, _, { isInProgress, updateItem }] = useDataContext();
  const now = useNowContext();

  // worklog table data
  // FIX: when now signal is received, the items are moved one day back in UX
  // maybe because of around 00:00 and ISO string bug in DatePicker
  const [selectedItemId, setSelectedItemId] = createSignal<string | undefined>(undefined);
  const itemsAtDate = createMemo(() => dataStore.items
    .filter(item => item.start.toDateString() === appStore.selectedDate.toDateString())
  );

  // reset selected item when date changes
  createEffect(on(() => appStore.selectedDate, () => {
    setSelectedItemId(undefined);
  }));

  // reset selected item when no items at current date
  createEffect(on(itemsAtDate, (items) => {
    if (items.length === 0) {
      setSelectedItemId(undefined);
    }
  }));

  function onCellKeyDown(e: KeyboardEventTarget) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
    }
  }

  // tag list
  const tagList = createTagListControls(selectedItemId);

  const allTags = createMemo(() => {
    const tags = dataStore.items.map(item => item.tag);
    const uniqueTags = [...new Set(tags)];
    return uniqueTags;
  });

  function onTagCellKeyDown(e: KeyboardEventTarget) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
      tagList.setVisible(false);
    }
  }

  function onTagCellKeyUp(e: KeyboardEventTarget) {
    if (e.key === 'Enter') return;
    tagList.setQuery(e.currentTarget.textContent!);
    tagList.setVisible(true);
  }

  return (
    <div>
      <div class='flex items-center justify-between mb-2'>
        <ToolbarWorklog
          isInProgress={isInProgress()}
          setSelectedDate={(date) => setAppStore('selectedDate', date)}
          setSelectedItemId={(id) => setSelectedItemId(id)}
        />
        <Show when={!isInProgress()}>
          <ToolbarTable
            items={itemsAtDate()}
            selectedDate={appStore.selectedDate}
            selectedItemId={selectedItemId()}
            setSelectedItemId={(id) => setSelectedItemId(id)}
          />
        </Show>
      </div>

      <TagList
        tags={allTags()}
        visible={tagList.visible()}
        query={tagList.query()}
        parent={tagList.parent()}
        onTagClick={(tag) => updateItem({ tag }, selectedItemId()!)}
      />

      <table class="table table-zebra table-worklog">
        <thead>
          <tr class="cursor-pointer" onClick={() => setSelectedItemId(undefined)}>
            <th>Start</th>
            <th>Duration</th>
            <th>Finish</th>
            <th>Tag</th>
            <th>Description</th>
          </tr>
        </thead>

        <tbody>
          <For each={itemsAtDate()}>
            {(item) => (
              <tr
                classList={{
                  'bg-gray-100 dark:bg-gray-800': selectedItemId() === item.id,
                  'text-gray-600': item.tag === 'idle',
                }}
                onClick={() => setSelectedItemId(item.id)}
              >
                <td
                  contentEditable
                  onBlur={(e) => updateItem({ start: updateTimestamp(item.start, e.currentTarget.textContent!) }, item.id)}
                  onKeyDown={(e) => onCellKeyDown(e)}
                >
                  {toTimestamp(item.start)}
                </td>
                <td>
                  {calculateDuration(item.start, item.end ?? now())}
                </td>
                <td
                  classList={{
                    'text-gray-600': !item.end
                  }}
                  contentEditable={Boolean(item.end)}
                  onBlur={(e) => updateItem({ end: updateTimestamp(item.end!, e.currentTarget.textContent!) }, item.id)}
                  onKeyDown={(e) => onCellKeyDown(e)}
                >
                  {toTimestamp(item.end ?? now())}
                </td>
                <td
                  data-item-id={item.id}
                  data-tag={true}
                  contentEditable
                  onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                  onKeyDown={(e) => onTagCellKeyDown(e)}
                  onKeyUp={(e) => onTagCellKeyUp(e)}
                  onClick={(e) => tagList.setParent(e)}
                >
                  {item.tag}
                </td>
                <td
                  contentEditable
                  onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
                  onKeyDown={(e) => onCellKeyDown(e)}
                >
                  {item.description}
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function TagList(props: {
  tags: string[],
  visible: boolean,
  query: string,
  parent?: MouseEventTarget,
  onTagClick: (tag: string) => void,
}) {
  let tagListElement!: HTMLDivElement;
  const fuzzySearch = createMemo(() => createFuzzySearch(props.tags));
  const [availableTags, setAvailableTags] = createSignal<string[]>([]);

  // update available tags
  createEffect(on(() => props.query, (query) => {
    const results = fuzzySearch()(query);
    setAvailableTags(results.map(result => result.item));
  }));

  // position tag list
  const [style, setStyle] = createSignal({});
  createEffect(on(() => props.parent, (parent) => {
    if (!parent) return;

    const rect = parent.currentTarget.getBoundingClientRect();
    setStyle({
      left: `${rect.left}px`,
      top: `${rect.top + rect.height + 9}px`, // TODO: why changed from -1 to +9? it was ok before
      width: `${rect.width}px`,
    });
  }));

  return (
    <Portal>
      <div
        class={sTagList}
        ref={tagListElement}
        style={{ ...style(), display: props.visible ? 'block' : 'none' }}
      >
        <For each={availableTags()}>
          {(tag) =>
            <div class={sTag} onClick={() => props.onTagClick(tag)}>
              {tag}
            </div>
          }
        </For>
      </div>
    </Portal>
  );
}

function createTagListControls(selectedItemId: () => string | undefined) {
  const [query, setQuery] = createSignal('');
  const [parent, setParent] = createSignal<MouseEventTarget>();
  const [visible, setVisible] = createSignal(false);

  // hide tag list when clicking outside current tag cell
  createEffect(() => {
    document.body.addEventListener('click', onClick);
    onCleanup(() => document.body.removeEventListener('click', onClick));

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const isCurrentTagCell = target.dataset.tag && target.dataset.itemId === selectedItemId();
      if (!isCurrentTagCell) {
        setVisible(false);
      }
    }
  });

  return {
    query, setQuery,
    parent, setParent,
    visible, setVisible,
  };
}

function ToolbarWorklog(props: {
  isInProgress: boolean,
  setSelectedDate: (date: Date) => void,
  setSelectedItemId: (id: string | undefined) => void,
}) {
  const [_1, _2, {
    startLog,
    finishLog,
    tapLog,
    fillLog,
  }] = useDataContext();

  function start() {
    startLog();
    props.setSelectedDate(new Date()); // TODO: add app store methods
  }

  // FIX: case when filling from the past day
  function fill() {
    const item = fillLog({ tag: 'idle' });
    props.setSelectedDate(new Date());
    props.setSelectedItemId(item.id);
  }

  function tap() {
    tapLog();
  }

  function finish() {
    const item = finishLog();
    props.setSelectedItemId(item.id);
  }

  return (
    <div class='flex align-center justify-start gap-3'>
      <button
        class="btn btn-sm btn-active btn-primary"
        title="Start new entry"
        disabled={props.isInProgress}
        onClick={() => start()}
      >Start</button>
      <button
        class="btn btn-sm btn-neutral"
        title="Add completed entry between last entry and now"
        disabled={props.isInProgress}
        onClick={() => fill()}
      >Fill</button>
      <button
        class="btn btn-sm btn-neutral"
        title="Finish current entry and start new one"
        disabled={!props.isInProgress}
        onClick={() => tap()}
      >Tap</button>
      <button
        class="btn btn-sm btn-active btn-primary"
        title="Finish current entry"
        disabled={!props.isInProgress}
        onClick={() => finish()}
      >Finish</button>
    </div>
  );
}

function ToolbarTable(props: {
  items: Item[],
  selectedDate: Date,
  selectedItemId: string | undefined,
  setSelectedItemId: (id: string | undefined) => void,
}) {
  const [dataStore, _, {
    addRow,
    removeRow,
    moveRowUp,
    moveRowDown,
    duplicateRow,
  }] = useDataContext();


  const isFirstItem = () => props.items[0]?.id === props.selectedItemId;
  const isLastItem = () => props.items[props.items.length - 1]?.id === props.selectedItemId;
  const isOnlyOneItemAtAll = () => dataStore.items.length === 1;

  return (
    <div class='flex align-center justify-end gap-3'>
      <button
        class="btn btn-sm btn-neutral"
        title="Add row"
        onClick={() => addRow(props.selectedDate)}
      >+</button>
      <button
        class="btn btn-sm btn-neutral"
        title="Duplicate row"
        disabled={!props.selectedItemId}
        onClick={() => duplicateRow(props.selectedItemId!)}
      >++</button>
      <button
        class="btn btn-sm btn-neutral"
        title="Move row up"
        disabled={!props.selectedItemId || isFirstItem()}
        onClick={() => moveRowUp(props.selectedItemId!)}
      >↑</button>
      <button
        class="btn btn-sm btn-neutral"
        title="Move row down"
        disabled={!props.selectedItemId || isLastItem()}
        onClick={() => moveRowDown(props.selectedItemId!)}
      >↓</button>
      <button
        class="btn btn-sm btn-neutral"
        title="Remove row"
        disabled={!props.selectedItemId || isOnlyOneItemAtAll()}
        onClick={() => removeRow(props.selectedItemId!, props.setSelectedItemId)}
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

// save cursor position when firing blur event which will update the state
function triggerNonDestructiveBlur(e: KeyboardEventTarget) {
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
