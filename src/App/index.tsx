import { Statistics } from './Statistics';
import { AppContext, createAppStore, getDefaultAppStore } from './store/app';
import { DataContext, getDefaultDataStore } from './store/data';
import { DatePicker } from './DatePicker';
import { createClock } from './store/now';
import { Utilities } from './Utilities';
import { persistObject } from './store/persistence';
import { NowContext } from './store/now';
import { Worklog } from './Worklog';
import { css } from '@linaria/core';
import { Settings } from './Settings';
import { createDataStore } from './store/dataMethods';

// component
export function App() {
  const now = createClock();
  const appStore = createAppStore();
  const dataStore = createDataStore();

  const persistApp = persistObject(
    appStore[0],
    appStore[1],
    getDefaultAppStore,
    'solid-worklog-app',
  );

  const persistData = persistObject(
    dataStore[0],
    dataStore[1],
    getDefaultDataStore,
    'solid-worklog-store',
  );

  return (
    <NowContext.Provider value={now}>
      <AppContext.Provider value={appStore}>
        <DataContext.Provider value={dataStore}>
          <div class='container max-w-screen-lg px-8 py-2 flex flex-col gap-4'>
            <DatePicker />
            <h2 class="text-2xl">Worklog</h2>
            <Worklog />
            <h2 class="text-2xl">Statistics</h2>
            <Statistics />
            <h2 class="text-2xl">Settings</h2>
            <Settings />
            <h2 class="text-2xl">Utilities</h2>
            <Utilities reset={persistData.reset} />
          </div>
        </DataContext.Provider>
      </AppContext.Provider>
    </NowContext.Provider>
  )
}
