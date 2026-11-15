import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shiftMonth, today, weekDays, weekStart } from '../src/domain/calendar.ts'
import { defaultRoutine, initialSettings, record, tableNames } from '../src/domain/model.ts'
import type { Occasion, Schedule, Snapshot } from '../src/domain/model.ts'
import { allowance, contribution, monthOccasions, nutrition, personalRecords, plannedDay, report, reschedule, savingsFor, toggleCompleted, weeklyCounts } from '../src/domain/tracking.ts'

const monday = '2026-08-03'
const sunday = '2026-08-09'
const nextMonday = '2026-08-10'
const settings = initialSettings(monday)
const snapshot = () => Object.fromEntries(tableNames.map(table => [table, []])) as unknown as Snapshot
const planned = (date: string) => plannedDay(date, [], settings).item
const legDay: Schedule = { ...planned(sunday), leg: true }

test('Jakarta midnight starts the new day, Monday starts the week, and month offsets are calendar-based', () => {
  assert.equal(today(new Date('2026-08-31T16:59:59Z')), '2026-08-31')
  assert.equal(today(new Date('2026-08-31T17:00:00Z')), '2026-09-01')
  assert.equal(weekStart(sunday), monday)
  assert.deepEqual(weekDays(monday), [monday, '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', sunday])
  assert.equal(shiftMonth('2026-12-31', 1), '2027-01-01')
})

test('default plan supports either PT day and a new week leaves its completed history intact', () => {
  const data = snapshot()
  const friday = '2026-08-07'
  const thursday = '2026-08-06'
  const fridayPT = { ...settings, routine: defaultRoutine('friday') }
  assert.equal(plannedDay(thursday, [], settings).item.pt, true)
  assert.equal(plannedDay(friday, [], settings).kind, 'rest')
  assert.equal(plannedDay(friday, [], fridayPT).item.pt, true)
  assert.equal(plannedDay(thursday, [], fridayPT).kind, 'rest')
  for (const date of [monday, thursday, friday]) data.schedules.push(toggleCompleted(plannedDay(date, [], settings)))
  assert.deepEqual(weeklyCounts(monday, data, settings), { weights: 1, cardio: 1, rest: 1 })
  assert.deepEqual(weeklyCounts(nextMonday, data, settings), { weights: 0, cardio: 0, rest: 0 })
  assert.equal(report(data, settings, monday, nextMonday).minutes, 30)
  assert.equal(data.schedules.length, 3)
})

test('a Sunday leg day makes Monday recovery and checking rest preserves the treadmill template', () => {
  const recovery = plannedDay(nextMonday, [legDay], settings)
  assert.equal(recovery.kind, 'rest')
  assert.equal(recovery.item.kind, 'cardio')
  const completed = toggleCompleted(recovery)
  const stored = plannedDay(nextMonday, [legDay, completed], settings)
  assert.equal(stored.kind, 'rest')
  assert.equal(stored.completed, true)
  assert.equal(plannedDay(nextMonday, [toggleCompleted(stored)], settings).kind, 'cardio')
  assert.equal(plannedDay(nextMonday, [{ ...legDay, status: 'skipped' }], settings).kind, 'cardio')
})

test('PT conflict keeps the session, prevents checklist completion, and allows rescheduling to a free day', () => {
  const pt = { ...planned(nextMonday), kind: 'weights', pt: true } as const
  const original = [legDay, pt]
  const conflict = plannedDay(nextMonday, original, settings)
  assert.equal(conflict.conflict, true)
  assert.equal(conflict.item, pt)
  assert.throws(() => toggleCompleted(conflict))
  assert.throws(() => reschedule(pt, planned('2026-08-11'), original, settings))
  const [source, target] = reschedule(pt, planned('2026-08-12'), original, settings)
  assert.equal(source.movedTo, target.date)
  assert.equal(target.pt, true)
  const recovered = plannedDay(nextMonday, [legDay, source, target], settings)
  assert.equal(recovered.kind, 'rest')
  assert.equal(recovered.conflict, false)
  assert.equal(toggleCompleted(recovered).movedTo, target.date)
})

test('nutrition adds whey per serving and averages only days with known amounts, including explicit zero', () => {
  const data = snapshot()
  data.food.push({ ...record(), date: monday, name: 'Uji', meal: 'Lunch', time: '12:00', portion: '', calories: 200, protein: 20, note: '' })
  data.food.push({ ...data.food[0], ...record(), date: '2026-08-04', calories: 0, protein: 0 })
  data.supplements.push({ ...record(), date: monday, type: 'whey', name: 'Uji', flavor: '', amount: 1.5, protein: 20, calories: 100, note: '' })
  data.supplements.push({ ...record(), date: '2026-08-05', type: 'whey', name: 'Uji', flavor: '', amount: 1, note: '' })
  assert.deepEqual(nutrition(data.food, data.supplements, monday), {
    calories: 350, protein: 50, caloriesLogged: true, proteinLogged: true, missingWheyLabel: false,
  })
  assert.equal(nutrition(data.food, data.supplements, '2026-08-05').proteinLogged, false)
  assert.equal(report(data, settings, monday, nextMonday).calories, 175)
  assert.equal(report(data, settings, monday, nextMonday).protein, 25)
})

test('creatine history counts treadmill, PT and rest days and excludes the next week', () => {
  const data = snapshot()
  for (const date of [monday, '2026-08-04', '2026-08-07', nextMonday]) {
    data.supplements.push({ ...record('creatine:' + date), date, type: 'creatine', name: 'Creatine', amount: 5, note: '', flavor: '' })
  }
  assert.equal(report(data, settings, monday, nextMonday).creatine, 3)
})

const occasion = (id: string, date: string, name = 'Mie uji'): Occasion => ({
  ...record(id), date, name, note: '', createdAt: '2026-08-05T04:00:0' + id + 'Z',
})

test('Indomie and cuanki in one meal use one monthly slot; history stays when a new month starts', () => {
  const entries = [occasion('1', '2026-08-31', 'Indomie + cuanki')]
  assert.equal(monthOccasions(entries, '2026-08-31').length, 1)
  assert.equal(allowance - monthOccasions(entries, '2026-09-01').length, 2)
  assert.equal(monthOccasions(entries, '2026-08-01').length, 1)
})

test('every overage has one deposit, and correcting occasions preserves confirmed history', () => {
  const entries = [occasion('1', monday), occasion('2', monday), occasion('3', monday)]
  const [pending] = savingsFor(entries, [])
  assert.equal(pending.id, '3')
  assert.equal(pending.amount, contribution)
  const { active, ...saved } = pending
  assert.equal(active, true)
  const confirmed = { ...saved, confirmedAt: '2026-08-31T17:00:00Z' }
  const corrected = entries.map(item => item.id === '3' ? { ...item, date: '2026-09-01' } : item)
  assert.deepEqual(savingsFor(corrected, [confirmed]), [{ ...confirmed, active: false }])
  assert.equal(savingsFor(entries.slice(1), []).length, 0)
  assert.equal(savingsFor(entries, [confirmed]).length, 1)
  const data = { ...snapshot(), savings: [confirmed] }
  assert.equal(report(data, settings, '2026-09-01', '2026-10-01').savings, contribution)
  assert.equal(report(data, settings, '2026-08-01', '2026-09-01').savings, 0)
})

test('PR relies on completed sets and workout totals deduplicate training logs against checklist entries', () => {
  const data = snapshot()
  const date = '2026-08-04'
  data.schedules.push(toggleCompleted(plannedDay(date, [], settings)))
  const workout = { ...record(), date, split: 'Full Body' as const, name: 'Sesi uji', note: '' }
  data.workouts.push(workout)
  data.sets.push({ ...record(), workoutId: workout.id, exercise: 'Goblet squat', kg: 4, reps: 10, done: true, note: '', order: 0 })
  data.sets.push({ ...data.sets[0], ...record(), kg: 8, done: false, order: 1 })
  assert.equal(personalRecords(data.workouts, data.sets)[0].kg, 4)
  assert.equal(weeklyCounts(date, data, settings).weights, 1)
  assert.equal(report(data, settings, monday, nextMonday).workouts, 1)
})
