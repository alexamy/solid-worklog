import { Link, MetaProvider } from '@solidjs/meta';
import { Show } from 'solid-js';
import { DatePicker } from './DatePicker';
import { Settings } from './Settings';
import { Statistics } from './Statistics';
import { AppContext, getDefaultAppStore } from './store/app';
import { createAppStore } from './store/appMethods';
import { DataContext, getDefaultDataStore } from './store/data';
import { createDataStore } from './store/dataMethods';
import { createClock, NowContext } from './store/now';
import { persistObject } from './store/persistence';
import { Worklog } from './Worklog';

// component
export function App() {
  const now = createClock();
  const [appStore, setAppStore, appMethods] = createAppStore();
  const [dataStore, setDataStore, dataMethods] = createDataStore();

  persistObject(
    appStore,
    appMethods.resetWithDefaults,
    getDefaultAppStore,
    'solid-worklog-app',
  );

  persistObject(
    dataStore,
    setDataStore,
    getDefaultDataStore,
    'solid-worklog-store',
    store => {
      store.items[0].end ??= now();
      return store;
    },
  );

  return (
    <MetaProvider>
      <Favicon isInProgress={dataMethods.isInProgress()} />
      <NowContext.Provider value={now}>
        <AppContext.Provider value={[appStore, setAppStore, appMethods]}>
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
              </Show>
            </div>
          </DataContext.Provider>
        </AppContext.Provider>
      </NowContext.Provider>
    </MetaProvider>
  )
}

function Favicon(props: { isInProgress: boolean }) {
  const file = () => props.isInProgress ? 'clock.svg' : 'pomodoro.svg';

  return <Link rel="icon" type="image/svg+xml" href={file()} />;
}
