import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeBackup, encodeBackup } from '../src/data/backup.ts'
import { openDatabase, readAll, removeWithChildren, replaceAll, write } from '../src/data/db.ts'
import { initialSettings, record, tableNames } from '../src/domain/model.ts'
import { dailySupplement } from '../src/domain/supplements.ts'
import { nutrition } from '../src/domain/tracking.ts'

const date = '2026-08-03'

test('one daily whey serving is persisted once and adds protein without inventing calories', async () => {
  const name = crypto.randomUUID()
  const db = await openDatabase(name)
  const settings = initialSettings(date)
  const whey = dailySupplement('whey', date, settings)
  for (let index = 0; index < 2; index++) await write(db, [{ table: 'supplements', put: { ...record(whey.id), ...whey } }])
  db.close()

  const reopened = await openDatabase(name)
  const data = await readAll(reopened)
  assert.equal(data.supplements.length, 1)
  assert.equal(data.supplements[0].name, 'Whey protein konsentrat')
  assert.deepEqual(nutrition([], data.supplements, date), {
    calories: 0, protein: 24, caloriesLogged: false, proteinLogged: true, missingWheyLabel: true,
  })
  assert.equal(nutrition([], data.supplements, '2026-08-04').proteinLogged, false)
  const next = dailySupplement('whey', '2026-08-04', { ...settings, whey: 'Whey uji', wheyProtein: 25, wheyCalories: 120 })
  assert.deepEqual([next.name, next.protein, next.calories], ['Whey uji', 25, 120])
  await write(reopened, [{ table: 'supplements', remove: whey.id }])
  assert.equal((await readAll(reopened)).supplements.length, 0)
  reopened.close()
})

test('workout and its sets persist when reconnecting and can be deleted together', async () => {
  const name = crypto.randomUUID()
  const db = await openDatabase(name)
  const workout = { ...record(), date, split: 'Full Body' as const, name: 'Sesi uji', note: '' }
  const set = { ...record(), workoutId: workout.id, exercise: 'Bench press', kg: 5, reps: 8, done: true, note: '', order: 0 }
  await write(db, [{ table: 'workouts', put: workout }, { table: 'sets', put: set }])
  db.close()
  const reopened = await openDatabase(name)
  assert.deepEqual((await readAll(reopened)).sets, [set])
  await removeWithChildren(reopened, 'workouts', workout.id)
  const data = await readAll(reopened)
  assert.equal(data.workouts.length, 0)
  assert.equal(data.sets.length, 0)
  reopened.close()
})

test('migration adds the notes store and retains profile data', async () => {
  const name = crypto.randomUUID()
  const profile = initialSettings(date)
  await new Promise<void>((resolve, reject) => {
    const install = indexedDB.open(name, 1)
    install.onupgradeneeded = () => {
      for (const table of tableNames.filter(table => table !== 'notes')) install.result.createObjectStore(table, { keyPath: 'id' })
      install.transaction!.objectStore('settings').put(profile)
    }
    install.onsuccess = () => { install.result.close(); resolve() }
    install.onerror = () => reject(install.error)
  })
  const db = await openDatabase(name)
  const data = await readAll(db)
  assert.deepEqual(data.settings, [profile])
  assert.deepEqual(data.notes, [])
  db.close()
})

test('backup validates dates, handles optional photos, merges without duplication, and preserves confirmed deposits', async () => {
  const db = await openDatabase(crypto.randomUUID())
  const body = { ...record(), date, values: { weight: 68 }, note: '' }
  const saving = { ...record(), date, food: 'Mie uji', amount: 20000, trigger: '', alternative: '', next: '' }
  const meal = { ...record(), date, name: 'Nasi uji', time: '12:00', meal: 'Lunch' as const, calories: 180, protein: 3,
    portion: '100 g', note: '', estimated: true }
  await write(db, [
    { table: 'settings', put: initialSettings(date) },
    { table: 'body', put: body },
    { table: 'photos', put: { ...record(), date, bodyId: body.id, image: 'data:image/jpeg;base64,YQ==' } },
    { table: 'savings', put: saving },
    { table: 'food', put: meal },
  ])
  const original = await readAll(db)
  const withoutPhotos = encodeBackup(original, false)
  assert.deepEqual(decodeBackup(withoutPhotos).food, [meal])
  assert.equal(decodeBackup(withoutPhotos).photos.length, 0)
  assert.equal(decodeBackup(encodeBackup(original, true)).photos.length, 1)
  assert.throws(() => decodeBackup(withoutPhotos.replaceAll(date, '2026-08-32')))
  assert.throws(() => decodeBackup(withoutPhotos.replace('"version":1', '"version":2')))
  const confirmed = { ...saving, confirmedAt: '2026-08-03T11:00:00Z' }
  await write(db, [{ table: 'savings', put: confirmed }])
  for (let index = 0; index < 2; index++) await replaceAll(db, decodeBackup(withoutPhotos), true)
  const merged = await readAll(db)
  assert.deepEqual(merged.savings, [confirmed])
  assert.deepEqual(merged.body, original.body)
  assert.deepEqual(merged.photos, original.photos)
  await replaceAll(db, decodeBackup(withoutPhotos))
  assert.equal((await readAll(db)).photos.length, 0)
  db.close()
})
