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

  persistObject(
    appStore[0],
    appStore[1],
    getDefaultAppStore,
    'solid-worklog-app',
  );

  persistObject(
    dataStore[0],
    dataStore[1],
    getDefaultDataStore,
    'solid-worklog-store',
  );

  return (
    <NowContext.Provider value={now}>
      <AppContext.Provider value={appStore}>
        <DataContext.Provider value={dataStore}>
          <div class='container max-w-screen-lg px-8 py-2 flex flex-col'>
            <DatePicker />
            <h2 class="text-2xl mt-6 mb-2">Worklog</h2>
            <Worklog />
            <h2 class="text-2xl mt-6 mb-2">Statistics</h2>
            <Statistics />
            <h2 class="text-2xl mt-6 mb-2">Settings</h2>
            <Settings />
            <h2 class="text-2xl mt-6 mb-2">Utilities</h2>
            <Utilities />
          </div>
        </DataContext.Provider>
      </AppContext.Provider>
    </NowContext.Provider>
  )
}
