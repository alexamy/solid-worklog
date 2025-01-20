import { createEffect } from 'solid-js';
import { Item, useDataContext } from '../store/data';

export function DayStats() {
  const [dataStore] = useDataContext();

  createEffect(() => {
    const dayStats = getDayStats(dataStore.items, new Date());
    console.log(dayStats);
  });

  return <div>DayStats</div>
}

// find data for target month
// group by day and hour
// include hours between start and end
function getDayStats(items: Item[], target: Date) {
  return Object.fromEntries(items
    .filter(item => item.start.getMonth() === target.getMonth() && item.tag !== 'idle')
    .flatMap(item => {
      const day = item.start.getDate();
      const startHour = item.start.getHours();
      const endHour = item.end.getHours();

      let current = startHour;
      const end = endHour + (endHour < startHour ? 24 : 0);

      const entries: [string, boolean][] = [];
      do {
        const key = `${day}-${current}`;
        entries.push([key, true]);
        current++;
      } while (current < end);

      return entries;
    })
  );
}
