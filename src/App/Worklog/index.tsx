import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { sCell, sCellHeader, sRow, sToolbar, sToolbarLeft, sToolbarRight } from '../styles';
import { toTimestamp } from '../time';
import { css, cx } from '@linaria/core';
import { Portal } from 'solid-js/web';
import createFuzzySearch from '@nozbe/microfuzz';
import { useAppContext } from '../store/app';
import { useDataContext } from '../store/data';
import { calculateDuration } from '../time';
import { useNowContext } from '../store/now';

type MouseEventTarget = MouseEvent & { currentTarget: HTMLElement };
type KeyboardEventTarget = KeyboardEvent & { currentTarget: HTMLElement };

export function Worklog() {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore, _, { isInProgress, updateItem }] = useDataContext();
  const now = useNowContext();

  const selectedDate = () => appStore.selectedDate;

  // tag list
  const [tagListQuery, setTagListQuery] = createSignal('');
  const [tagListParent, setTagListParent] = createSignal<MouseEventTarget>();
  const [tagListVisible, setTagListVisible] = createSignal(false);

  const allTags = createMemo(() => {
    const tags = dataStore.items.map(item => item.tag);
    const uniqueTags = [...new Set(tags)];
    return uniqueTags;
  });

  // hide tag list when clicking outside current tag cell
  createEffect(() => {
    document.body.addEventListener('click', onClick);
    onCleanup(() => document.body.removeEventListener('click', onClick));

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const isCurrentTagCell = target.dataset.tag && target.dataset.itemId === selectedItemId();
      if (!isCurrentTagCell) {
        setTagListVisible(false);
      }
    }
  });

  // worklog table data
  const [selectedItemId, setSelectedItemId] = createSignal<string | undefined>(undefined);
  createEffect(on(selectedDate, () => setSelectedItemId(undefined)));

  const itemsAtDate = createMemo(() => dataStore.items
    .filter(item => item.start.toDateString() === selectedDate().toDateString())
  );

  function onCellKeyDown(e: KeyboardEventTarget) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
    }
  }

  function onTagCellKeyDown(e: KeyboardEventTarget) {
    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
      setTagListVisible(false);
    }
  }

  function onTagCellKeyUp(e: KeyboardEventTarget) {
    if (e.key === 'Enter') return;
    setTagListQuery(e.currentTarget.textContent!);
    setTagListVisible(true);
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
            selectedDate={selectedDate()}
            selectedItemId={selectedItemId()}
            setSelectedItemId={(id) => setSelectedItemId(id)}
          />
        </Show>
      </div>

      <TagList
        tags={allTags()}
        visible={tagListVisible()}
        query={tagListQuery()}
        parent={tagListParent()}
        onTagClick={(tag) => updateItem({ tag }, selectedItemId()!)}
      />

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
                onClick={(e) => setTagListParent(e)}
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
  createEffect(on(() => props.parent, (parent) => {
    if (!parent) return;
    const rect = parent.currentTarget.getBoundingClientRect();
    tagListElement.style.left = `${rect.left}px`;
    tagListElement.style.top = `${rect.top + rect.height - 1}px`;
    tagListElement.style.width = `${rect.width}px`;
  }));

  return (
    <Portal>
      <div
        class={sTagList}
        ref={tagListElement}
        style={{ display: props.visible ? 'block' : 'none' }}
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

function ToolbarWorklog(props: {
  isInProgress: boolean,
  setSelectedDate: (date: Date) => void,
}) {
  const [_1, _2, {
    startLog,
    finishLog,
    tapLog,
  }] = useDataContext();

  function start() {
    startLog();
    props.setSelectedDate(new Date()); // TODO: add app store methods
  }

  return (
    <div class={sToolbarLeft}>
      <button disabled={props.isInProgress} onClick={() => start()}>Start</button>
      <button disabled={!props.isInProgress} onClick={() => finishLog()}>Finish</button>
      <button disabled={!props.isInProgress} onClick={() => tapLog()}>Tap</button>
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
