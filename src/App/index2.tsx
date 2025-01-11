import { css } from '@linaria/core';
import { DatePicker } from './DatePicker';
import { Settings } from './Settings';
import { Statistics } from './Statistics';
import { Utilities } from './Utilities';
import { Worklog } from './Worklog';

export function App() {
  return (
    <div class={sApp}>
      <DatePicker />
      <Worklog />
      <Statistics />
      <Utilities />
      <Settings />
    </div>
  )
}

const sApp = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 500px;
`;
