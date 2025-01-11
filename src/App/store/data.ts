export interface DataStore {
  items: Item[];
}

export interface Item {
  id: string;
  description: string;
  tag: string;
  start: Date;
  end: Date | undefined;
}

export function getDefaultDataStore(): DataStore {
  const now = new Date();

  function at(hour: number, minute: number) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  }

  return {
    items: [{
      id: '1',
      description: 'dinner',
      tag: 'idle',
      start: at(13, 20),
      end: at(14, 0),
  }, {
      id: '2',
      description: 'dev',
      tag: 'task 1',
      start: at(14, 5),
      end: at(15, 0),
    }, {
      id: '3',
      description: 'dev',
      tag: 'task 2',
      start: at(15, 15),
      end: at(15, 35),
    }],
  };
}
