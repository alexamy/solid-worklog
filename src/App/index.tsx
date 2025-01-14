import { Statistics } from './Statistics';
import { AppContext, createAppStore, getDefaultAppStore, useAppContext } from './store/app';
import { DataContext, getDefaultDataStore } from './store/data';
import { DatePicker } from './DatePicker';
import { createClock } from './store/now';
import { Utilities } from './Utilities';
import { persistObject } from './store/persistence';
import { NowContext } from './store/now';
import { Worklog } from './Worklog';
import { Settings } from './Settings';
import { createDataStore } from './store/dataMethods';
import { Show } from 'solid-js';

// component
export function App() {
  const now = createClock();
  const [appStore, setAppStore] = createAppStore();
  const [dataStore, setDataStore, dataMethods] = createDataStore();

  persistObject(
    appStore,
    // TODO: move to app store methods
    state => setAppStore({ ...getDefaultAppStore(), ...state }),
    getDefaultAppStore,
    'solid-worklog-app',
  );

  persistObject(
    dataStore,
    setDataStore,
    getDefaultDataStore,
    'solid-worklog-store',
  );

  return (
    <NowContext.Provider value={now}>
      <AppContext.Provider value={[appStore, setAppStore]}>
        <DataContext.Provider value={[dataStore, setDataStore, dataMethods]}>
          <div class='container max-w-screen-md px-8 py-4 flex flex-col'>
            <DatePicker />
            <div class="mb-6"></div>
            <Show when={appStore.currentTab === 'worklog'}>
              <Worklog />
              <div class="mb-6"></div>
              <Statistics />
            </Show>
            <Show when={appStore.currentTab === 'settings'}>
              <Settings />
              <div class="mb-4"></div>
              <Utilities />
            </Show>
          </div>
        </DataContext.Provider>
      </AppContext.Provider>
    </NowContext.Provider>
  )
}

function TabList(props: {
  tab: 'worklog' | 'statistics' | 'settings';
  setTab: (tab: 'worklog' | 'statistics' | 'settings') => void;
}) {
  return (
    <div role="tablist" class="tabs tabs-bordered">
      <a role="tab"
        class="tab"
        onClick={() => props.setTab('worklog')}
        classList={{
          'tab-active': props.tab === 'worklog',
        }}
      >
        Worklog
      </a>
      <a role="tab"
        class="tab"
        onClick={() => props.setTab('statistics')}
        classList={{
          'tab-active': props.tab === 'statistics',
        }}
      >
        Statistics
      </a>
      <a role="tab"
        class="tab"
        onClick={() => props.setTab('settings')}
        classList={{
          'tab-active': props.tab === 'settings',
        }}
      >
        Settings
      </a>
    </div>
  );
}
