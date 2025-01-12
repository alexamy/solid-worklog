import { createStore } from 'solid-js/store';
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
  const [appStore, setAppStore] = createAppStore();
  const [dataStore, setDataStore] = createDataStore();

  const persistApp = persistObject(
    appStore,
    setAppStore,
    getDefaultAppStore,
    'solid-worklog-app',
  );

  const persistData = persistObject(
    dataStore,
    setDataStore,
    getDefaultDataStore,
    'solid-worklog-store',
  );

  return (
    <NowContext.Provider value={now}>
      <AppContext.Provider value={[appStore, setAppStore]}>
        <DataContext.Provider value={[dataStore, setDataStore]}>
          <div class={sApp}>
            <DatePicker />
            Worklog
            <Worklog />
            <br />
            Statistics
            <Statistics />
            <br />
            Settings
            <Settings />
            <br />
            Utilities
            <Utilities reset={persistData.reset} />
          </div>
        </DataContext.Provider>
      </AppContext.Provider>
    </NowContext.Provider>
  )
}

const sApp = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 500px;
`;
