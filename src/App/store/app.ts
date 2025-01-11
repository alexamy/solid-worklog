export interface AppStore {
  selectedDate: Date;
}

export function getDefaultAppStore(): AppStore {
  return {
    selectedDate: new Date(),
  }
}
