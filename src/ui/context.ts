import { createContext, useContext } from 'react'
import type { Change, Settings, Snapshot } from '../domain/model.ts'
export interface AppData {
  db: IDBDatabase; data: Snapshot; settings: Settings; date: string;
  save: (changes: Change[]) => Promise<void>; refresh: () => Promise<void>
}
export const DataContext = createContext<AppData | null>(null)
export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('Data belum tersedia.')
  return context
}

