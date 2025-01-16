import createFuzzySearch from '@nozbe/microfuzz';
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { useNowContext } from '../store/now';
import { calculateDuration, toTimestamp } from '../time';

type MouseEventTarget = MouseEvent & { currentTarget: HTMLElement };
type KeyboardEventTarget = KeyboardEvent & { currentTarget: HTMLElement };

export function Worklog() {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore, _, { isInProgress, updateItem }] = useDataContext();
  const now = useNowContext();

  // worklog table data
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

  // tag autocomplete
  const tagMenu = createAutocompleteControls(
    () => dataStore.items.map(item => item.tag)
  );

  function onTagCellKeyDown(e: KeyboardEventTarget) {
    if(e.ctrlKey && e.key === 'Enter') {
      const items = tagMenu.availableItems();

      if(items.length > 0) {
        updateItem({ tag: items[0] }, selectedItemId()!);
        e.currentTarget.textContent = items[0];
      }

      tagMenu.setVisible(false);
      return;
    }

    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
      tagMenu.setVisible(false);
    }
  }

  function onTagCellKeyUp(e: KeyboardEventTarget) {
    if (e.key === 'Enter' || e.key === 'Control') return;
    tagMenu.setQuery(e.currentTarget.textContent!);
    tagMenu.setVisible(true);
  }

  // description autocomplete
  const descriptionMenu = createAutocompleteControls(
    () => dataStore.items.map(item => item.description)
  );

  function onDescriptionCellKeyDown(e: KeyboardEventTarget) {
    if(e.ctrlKey && e.key === 'Enter') {
      const items = descriptionMenu.availableItems();

      if(items.length > 0) {
        updateItem({ description: items[0] }, selectedItemId()!);
        e.currentTarget.textContent = items[0];
      }

      descriptionMenu.setVisible(false);
      return;
    }

    if (e.key === 'Enter') {
      triggerNonDestructiveBlur(e);
      descriptionMenu.setVisible(false);
    }
  }

  function onDescriptionCellKeyUp(e: KeyboardEventTarget) {
    if (e.key === 'Enter' || e.key === 'Control') return;
    descriptionMenu.setQuery(e.currentTarget.textContent!);
    descriptionMenu.setVisible(true);
  }

  return (
    <div>
      <div class='flex items-center justify-between mb-2'>
        <ToolbarWorklog
          isInProgress={isInProgress()}
          setSelectedDate={(date) => setAppStore('selectedDate', date)}
          selectedItemId={selectedItemId()}
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

      <AutcompleteMenu
        items={tagMenu.availableItems()}
        visible={tagMenu.visible()}
        parent={tagMenu.parent()}
        onItemClick={(tag) => updateItem({ tag }, selectedItemId()!)}
      />

      <AutcompleteMenu
        items={descriptionMenu.availableItems()}
        visible={descriptionMenu.visible()}
        parent={descriptionMenu.parent()}
        onItemClick={(description) => updateItem({ description }, selectedItemId()!)}
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
                  'text-gray-400 dark:text-gray-600 ': item.tag === 'idle',
                  'outline outline-primary': selectedItemId() === item.id,
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
                  contentEditable
                  onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                  onKeyDown={(e) => onTagCellKeyDown(e)}
                  onKeyUp={(e) => onTagCellKeyUp(e)}
                  onClick={(e) => tagMenu.setParent(e)}
                >
                  {item.tag}
                </td>
                <td
                  contentEditable
                  onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
                  onKeyDown={(e) => onDescriptionCellKeyDown(e)}
                  onKeyUp={(e) => onDescriptionCellKeyUp(e)}
                  onClick={(e) => descriptionMenu.setParent(e)}
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

function AutcompleteMenu(props: {
  items: string[],
  visible: boolean,
  parent?: MouseEventTarget,
  onItemClick: (item: string) => void,
}) {
  let listElement!: HTMLUListElement;
  const listShown = () => props.visible && props.items.length > 0;

  // position tag list
  const [style, setStyle] = createSignal({});
  createEffect(on(() => props.parent, (parent) => {
    if (!parent) return;

    const rect = parent.currentTarget.getBoundingClientRect();
    setStyle({
      left: `${rect.left}px`,
      top: `${rect.top + rect.height}px`,
      width: `${rect.width}px`,
    });
  }));

  return (
    <Portal>
      <ul
        ref={listElement}
        class='menu rounded-sm shadow-sm absolute top-0 left-0 z-1000 bg-base-100 text-sm'
        style={{ ...style(), display: listShown() ? 'block' : 'none' }}
      >
        <For each={props.items}>
          {(item) =>
            <li
              class='cursor-pointer'
              onClick={() => props.onItemClick(item)}
            >
              <a>{item}</a>
            </li>
          }
        </For>
      </ul>
    </Portal>
  );
}

function createAutocompleteControls(items: () => string[]) {
  const [query, setQuery] = createSignal('');
  const [parent, setParent] = createSignal<MouseEventTarget>();
  const [visible, setVisible] = createSignal(false);

  const uniqueItems = createMemo(() => ([...new Set(items())]));

  // add debounce if performance is an issue
  const fuzzySearch = createMemo(() => createFuzzySearch(uniqueItems()));
  const [availableItems, setAvailableItems] = createSignal<string[]>([]);

  // update available tags
  createEffect(on(() => query(), (query) => {
    const results = fuzzySearch()(query);
    setAvailableItems(results.map(result => result.item));
  }));

  // hide tag list when clicking outside
  createEffect(() => {
    document.body.addEventListener('click', onClick);
    onCleanup(() => document.body.removeEventListener('click', onClick));

    function onClick() {
      setVisible(false);
    }
  });

  return {
    availableItems,
    query, setQuery,
    parent, setParent,
    visible, setVisible,
  };
}

function ToolbarWorklog(props: {
  isInProgress: boolean,
  setSelectedDate: (date: Date) => void,
  selectedItemId: string | undefined,
  setSelectedItemId: (id: string | undefined) => void,
}) {
  const [dataStore, _2, {
    startLog,
    finishLog,
    tapLog,
    fillLog,
  }] = useDataContext();


  function startNew() {
    startLog({ start: new Date(), end: undefined });
    props.setSelectedDate(new Date()); // TODO: add app store methods
  }

  function startSelected() {
    const item = props.selectedItemId
      ? dataStore.items.find(item => item.id === props.selectedItemId)
      : {};

    if(props.selectedItemId && !item) {
      throw new Error('Item not found');
    }

    startLog({ ...item, start: new Date(), end: undefined });
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
      <Show when={!props.isInProgress}>
        <button
          class="btn btn-sm btn-primary"
          title="Start new entry"
          disabled={props.isInProgress}
          onClick={() => startNew()}
        >Start new</button>
        <Show when={props.selectedItemId}>
          <button
            class="btn btn-sm btn-primary"
            title="Start selected entry"
            disabled={props.isInProgress}
            onClick={() => startSelected()}
          >Start selected</button>
        </Show>
        <button
          class="btn btn-sm btn-neutral"
          title="Add completed entry between last entry and now"
          disabled={props.isInProgress}
          onClick={() => fill()}
        >Fill</button>
      </Show>
      <Show when={props.isInProgress}>
        <button
          class="btn btn-sm btn-secondary"
          title="Finish current entry"
          disabled={!props.isInProgress}
          onClick={() => finish()}
        >Finish</button>
        <button
          class="btn btn-sm btn-neutral"
          title="Finish current entry and start new one"
          disabled={!props.isInProgress}
          onClick={() => tap()}
        >Tap</button>
      </Show>
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
