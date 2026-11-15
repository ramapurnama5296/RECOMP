import { tableNames } from '../domain/model.ts'
import type { Change, Saving, Snapshot, Table } from '../domain/model.ts'

const DATABASE_VERSION = 2
const databaseName = 'recomp:' + (import.meta.env?.BASE_URL ?? '/recomp/')
const listeners = new Set<() => void>()
const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel(databaseName) : undefined
channel?.addEventListener('message', () => listeners.forEach(listener => listener()))

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function openDatabase(name = databaseName) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION)
    request.onupgradeneeded = event => {
      const db = request.result
      if (event.oldVersion < 1) {
        for (const table of tableNames.filter(name => name !== 'notes')) db.createObjectStore(table, { keyPath: 'id' })
      }
      if (event.oldVersion < 2) db.createObjectStore('notes', { keyPath: 'id' })
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Tutup tab RECOMP lain untuk membuka versi database terbaru.'))
  })
}

function resultOf<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function finished(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('Perubahan dibatalkan.'))
  })
}

function snapshotFrom(transaction: IDBTransaction) {
  return Promise.all(tableNames.map(async table => [table, await resultOf(transaction.objectStore(table).getAll())]))
    .then(entries => Object.fromEntries(entries) as Snapshot)
}

export async function readAll(db: IDBDatabase) {
  const transaction = db.transaction([...tableNames], 'readonly')
  const [data] = await Promise.all([snapshotFrom(transaction), finished(transaction)])
  return data
}

function writeChanges(transaction: IDBTransaction, changes: Change[]) {
  for (const change of changes) {
    const store = transaction.objectStore(change.table)
    if ('remove' in change) store.delete(change.remove)
    else if (change.table === 'savings') {
      const incoming = change.put
      const current = store.get(incoming.id)
      current.onsuccess = () => store.put(preserveDeposit(incoming, current.result))
    } else store.put(change.put)
  }
}

function preserveDeposit(incoming: Saving, existing?: Saving): Saving {
  if (!existing?.confirmedAt) return incoming
  return { ...incoming, confirmedAt: existing.confirmedAt, date: existing.date, food: existing.food, amount: existing.amount }
}

export async function write(db: IDBDatabase, changes: Change[]) {
  if (!changes.length) return
  const tables = [...new Set(changes.map(change => change.table))]
  const transaction = db.transaction(tables, 'readwrite')
  const done = finished(transaction)
  try { writeChanges(transaction, changes) }
  catch (error) { transaction.abort(); await done.catch(() => {}); throw error }
  await done
  changed()
}

export async function replaceAll(db: IDBDatabase, data?: Snapshot, merge = false) {
  const transaction = db.transaction([...tableNames], 'readwrite')
  const done = finished(transaction)
  try {
    if (!merge) for (const table of tableNames) transaction.objectStore(table).clear()
    if (data) for (const table of tableNames) {
      const store = transaction.objectStore(table)
      for (const row of data[table]) {
        if (!merge) store.put(row)
        else {
          const current = store.get(row.id)
          current.onsuccess = () => {
            // Preserve confirmed deposits even if a more recent copy only contains a draft.
            const existing = current.result
            const preserve = table === 'savings' && existing?.confirmedAt && !('confirmedAt' in row && row.confirmedAt)
            const incomingConfirmed = table === 'savings' && 'confirmedAt' in row && row.confirmedAt && !existing?.confirmedAt
            if (!preserve && (!existing || incomingConfirmed || row.updatedAt > existing.updatedAt)) {
              store.put(table === 'savings' ? preserveDeposit(row as Saving, existing) : row)
            }
          }
        }
      }
    }
  } catch (error) { transaction.abort(); await done.catch(() => {}); throw error }
  await done
  changed()
}

function changed() {
  listeners.forEach(listener => listener())
  channel?.postMessage('changed')
}

export async function removeWithChildren(db: IDBDatabase, table: 'body' | 'workouts', id: string) {
  const child: Table = table === 'body' ? 'photos' : 'sets'
  const foreignKey = table === 'body' ? 'bodyId' : 'workoutId'
  const transaction = db.transaction([table, child], 'readwrite')
  const done = finished(transaction)
  transaction.objectStore(table).delete(id)
  const cursor = transaction.objectStore(child).openCursor()
  cursor.onsuccess = () => {
    const item = cursor.result
    if (!item) return
    if (item.value[foreignKey] === id) item.delete()
    item.continue()
  }
  await done
  changed()
}

