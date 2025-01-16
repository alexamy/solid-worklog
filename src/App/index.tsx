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
import { Link, MetaProvider } from '@solidjs/meta';

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
    <MetaProvider>
      <Favicon isInProgress={dataMethods.isInProgress()} />
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
    </MetaProvider>
  )
}

function Favicon(props: { isInProgress: boolean }) {
  const file = () => props.isInProgress ? 'clock.svg' : 'pomodoro.svg';

  return <Link rel="icon" type="image/svg+xml" href={file()} />;
}
