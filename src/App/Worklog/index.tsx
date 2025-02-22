import createFuzzySearch from '@nozbe/microfuzz';
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useAppContext } from '../store/app';
import { Item, useDataContext } from '../store/data';
import { calculateDuration, toTimestamp } from '../time';

type FocusEventTarget = FocusEvent & { currentTarget: HTMLElement };
type KeyboardEventTarget = KeyboardEvent & { currentTarget: HTMLElement };

export function Worklog() {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore, _, { updateItem }] = useDataContext();

  const isInProgress = () => appStore.isInProgress;

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
    () => dataStore.items.map(item => item.tag),
    (tag) => updateItem({ tag }, selectedItemId()!),
  );

  // description autocomplete
  const descriptionMenu = createAutocompleteControls(
    () => dataStore.items.map(item => item.description),
    (description) => updateItem({ description }, selectedItemId()!),
  );

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
        selectedIndex={tagMenu.selectedIndex()}
        onItemClick={(tag) => updateItem({ tag }, selectedItemId()!)}
      />

      <AutcompleteMenu
        items={descriptionMenu.availableItems()}
        visible={descriptionMenu.visible()}
        parent={descriptionMenu.parent()}
        selectedIndex={descriptionMenu.selectedIndex()}
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
            {(item, index) => (
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
                  {calculateDuration(item.start, item.end)}
                </td>
                <td
                  classList={{
                    'text-gray-400 dark:text-gray-600': isInProgress() && index() === 0
                  }}
                  contentEditable={!(isInProgress() && index() === 0)}
                  onBlur={(e) => updateItem({ end: updateTimestamp(item.end, e.currentTarget.textContent!) }, item.id)}
                  onKeyDown={(e) => onCellKeyDown(e)}
                >
                  {toTimestamp(item.end)}
                </td>
                <td
                  contentEditable
                  onBlur={(e) => updateItem({ tag: e.currentTarget.textContent! }, item.id)}
                  onKeyDown={(e) => tagMenu.onKeyDown(e)}
                  onKeyUp={(e) => tagMenu.onKeyUp(e)}
                  onFocus={(e) => tagMenu.setParent(e)}
                >
                  {item.tag}
                </td>
                <td
                  contentEditable
                  onBlur={(e) => updateItem({ description: e.currentTarget.textContent! }, item.id)}
                  onKeyDown={(e) => descriptionMenu.onKeyDown(e)}
                  onKeyUp={(e) => descriptionMenu.onKeyUp(e)}
                  onFocus={(e) => descriptionMenu.setParent(e)}
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
  parent?: FocusEventTarget,
  selectedIndex: number,
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
        class='menu rounded-sm shadow-sm absolute top-0 left-0 z-1000 bg-base-100 text-sm p-0'
        style={{ ...style(), display: listShown() ? 'block' : 'none' }}
      >
        <For each={props.items}>
          {(item, index) =>
            <li
              class='cursor-pointer'
              classList={{ 'bg-base-300': index() === props.selectedIndex }}
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

function createAutocompleteControls(
  items: () => string[],
  update: (item: string) => void,
) {
  const [query, setQuery] = createSignal('');
  const [parent, setParent] = createSignal<FocusEventTarget>();
  const [visible, setVisible] = createSignal(false);

  // add debounce if performance is an issue
  const uniqueItems = createMemo(() => ([...new Set(items())]));
  const fuzzySearch = createMemo(() => createFuzzySearch(uniqueItems()));
  const [availableItems, setAvailableItems] = createSignal<string[]>([]);

  // allow to select item by index
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  function selectItem(direction: 'up' | 'down') {
    const index = selectedIndex();
    const length = availableItems().length;

    if(direction === 'up') {
      setSelectedIndex(index === -1 ? 0 : (index - 1 + length) % length);
    } else {
      setSelectedIndex(index === -1 ? 0 : (index + 1) % length);
    }
  }

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
      toggleVisible('hide');
    }
  });

  // toggle visible state and reset selected index
  function toggleVisible(state: 'show' | 'hide') {
    if(state === 'show') {
      setVisible(true);
    } else {
      setSelectedIndex(-1);
      setVisible(false);
    }
  }

  // keyboard handlers
  function onKeyDown(e: KeyboardEventTarget) {
    if(e.key === 'Enter') {
      e.preventDefault();

      if(selectedIndex() >= 0) {
        const items = availableItems();
        const item = items?.[selectedIndex()];

        if(item) {
          update(item);
          e.currentTarget.textContent = item;
        }
      } else {
        triggerNonDestructiveBlur(e);
      }

      toggleVisible('hide');
    }

    if(e.key === 'Escape') {
      toggleVisible('hide');
    }

    if(e.key === 'ArrowUp') {
      selectItem('up');
    }

    if(e.key === 'ArrowDown') {
      selectItem('down');
    }
  }

  function onKeyUp(e: KeyboardEventTarget) {
    if (
      e.key === 'Enter' || e.key === 'Control' ||
      e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'Escape'
    ) return;

    setQuery(e.currentTarget.textContent!);
    toggleVisible('show');
  }

  return {
    availableItems,
    query, setQuery,
    parent, setParent,
    visible, toggleVisible,
    selectedIndex, selectItem,
    onKeyDown, onKeyUp,
  };
}

function ToolbarWorklog(props: {
  isInProgress: boolean,
  setSelectedDate: (date: Date) => void,
  selectedItemId: string | undefined,
  setSelectedItemId: (id: string | undefined) => void,
}) {
  const [appStore, setAppStore] = useAppContext();
  const [dataStore, _2, {
    startLog,
    fillLog,
  }] = useDataContext();

  function startNew(item: Partial<Item> = {}) {
    startLog(item);
    setAppStore('isInProgress', true);
    props.setSelectedDate(new Date()); // TODO: add app store methods
  }

  function startSelected() {
    const item = props.selectedItemId
      ? dataStore.items.find(item => item.id === props.selectedItemId)
      : {};

    if(props.selectedItemId && !item) {
      throw new Error('Item not found');
    }

    startNew({ ...item, start: new Date() });
  }

  function fill() {
    const item = fillLog({ tag: 'idle' });
    props.setSelectedDate(new Date());
    props.setSelectedItemId(item.id);
  }

  function tap() {
    startLog();
  }

  function finish() {
    setAppStore('isInProgress', false);
    props.setSelectedItemId(dataStore.items[0].id);
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
        title="Add new row"
        onClick={() => addRow(props.selectedDate)}
      >+</button>
      <button
        class="btn btn-sm btn-neutral"
        title="Duplicate selected row"
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
