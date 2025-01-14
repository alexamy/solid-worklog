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
import { Match, Switch } from 'solid-js';

// component
export function App() {
  const now = createClock();
  const [appStore, setAppStore] = createAppStore();
  const [dataStore, setDataStore, dataMethods] = createDataStore();

  persistObject(
    appStore,
    setAppStore,
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
          <div class='container max-w-screen-md px-8 py-4 flex flex-col gap-5'>
            <TabList
              tab={appStore.currentTab}
              setTab={(tab) => setAppStore('currentTab', tab)}
            />
            <DatePicker />
            <Switch>
              <Match when={appStore.currentTab === 'worklog'}>
                <Worklog />
              </Match>
              <Match when={appStore.currentTab === 'statistics'}>
                <Statistics />
              </Match>
              <Match when={appStore.currentTab === 'settings'}>
                <Settings />
                <Utilities />
              </Match>
            </Switch>
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
