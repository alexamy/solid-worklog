import { Statistics } from './Statistics';
import { AppContext, createAppStore, getDefaultAppStore } from './store/app';
import { DataContext, getDefaultDataStore } from './store/data';
import { DatePicker } from './DatePicker';
import { createClock } from './store/now';
import { Utilities } from './Utilities';
import { persistObject } from './store/persistence';
import { NowContext } from './store/now';
import { Worklog } from './Worklog';
import { Settings } from './Settings';
import { createDataStore } from './store/dataMethods';

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
          <div class='container max-w-screen-md px-8 py-2 flex flex-col'>
            <DatePicker />
            <h2 class="text-2xl mt-6 mb-2">Worklog</h2>
            <Worklog />
            <h2 class="text-2xl mt-6 mb-2">Statistics</h2>
            <Statistics />
            <h2 class="text-2xl mt-6 mb-2">Settings</h2>
            <Settings />
            <div class="mt-6"/>
            <Utilities />
          </div>
        </DataContext.Provider>
      </AppContext.Provider>
    </NowContext.Provider>
  )
}
